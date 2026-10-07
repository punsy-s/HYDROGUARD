import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import SimulationScenario, SimulationJob, Catchment, Road, Village
from app.schemas.schemas import (
    SimulationTriggerRequest, ScenarioSwitchRequest,
    HECRASSimulationRequest, HECRASEngineInfo
)
from app.services.hecras_adapter import (
    execute_simulation_job_async, get_simulation_adapter,
    get_hecras_engine_info
)
from app.services.iot_service import simulate_sensor_telemetry_for_scenario
from app.services.prediction_service import run_catchment_prediction
from app.services.damage_service import assess_downstream_damage

router = APIRouter(prefix="/simulations", tags=["HEC-RAS 2D Hydraulic Flood Simulations"])

@router.get("/hecras/engine-info", response_model=HECRASEngineInfo)
def get_engine_diagnostics():
    """
    Returns runtime diagnostics of host HEC-RAS 2D availability,
    executable path, version, supported hydrodynamic schemes, and active solver engine.
    """
    return get_hecras_engine_info()

@router.post("/hecras/run")
def run_hecras_2d_simulation(req: HECRASSimulationRequest, db: Session = Depends(get_db)):
    """
    Launches a full 2D hydraulic flood simulation job.
    Allows custom peak hydrograph Q (m3/s), Manning's n roughness, equation set,
    computation timestep, and embankment breach toggles.
    Executes native HEC-RAS 2D when available, or the calibrated 2D shallow-water fallback.
    """
    job_id = f"JOB-HECRAS2D-{int(datetime.now(timezone.utc).timestamp())}"
    
    # Discharge determination
    discharge = req.custom_inflow_discharge_cumecs or 1450.0
    if req.scenario_id:
        sc = db.query(SimulationScenario).filter(SimulationScenario.id == req.scenario_id).first()
        if sc and not req.custom_inflow_discharge_cumecs:
            discharge = sc.river_discharge_cumecs

    adapter = get_simulation_adapter(mode=req.solver_mode or "AUTO")
    solver_name = adapter.get_installed_version() or "Calibrated 2D Hydrodynamic Solver"

    job = SimulationJob(
        id=job_id,
        catchment_id=req.catchment_id,
        scenario_id=req.scenario_id,
        status="QUEUED",
        solver_type=solver_name,
        progress_percent=5.0,
        peak_discharge_cumecs=discharge,
        started_at=datetime.now(timezone.utc),
        log_output=f"[{datetime.now().strftime('%H:%M:%S')}] HEC-RAS 2D simulation job {job_id} queued.\n"
    )
    db.add(job)
    db.commit()

    # Launch background simulation worker
    execute_simulation_job_async(
        job_id=job_id,
        catchment_id=req.catchment_id,
        discharge_cumecs=discharge,
        manning_n_channel=req.manning_n_channel or 0.038,
        manning_n_floodplain=req.manning_n_floodplain or 0.065,
        equation_set=req.equation_set or "DIFFUSION_WAVE",
        computation_interval_sec=req.computation_interval_sec or 60,
        simulation_duration_hours=req.simulation_duration_hours or 6.0,
        enable_breach=req.enable_embankment_breach or False,
        scenario_id=req.scenario_id,
        solver_mode=req.solver_mode or "AUTO"
    )

    return {
        "job_id": job.id,
        "catchment_id": job.catchment_id,
        "status": job.status,
        "solver_type": job.solver_type,
        "progress_percent": job.progress_percent,
        "peak_discharge_cumecs": job.peak_discharge_cumecs,
        "equation_set": req.equation_set or "DIFFUSION_WAVE",
        "manning_n_channel": req.manning_n_channel or 0.038,
        "manning_n_floodplain": req.manning_n_floodplain or 0.065,
        "embankment_breach_simulated": req.enable_embankment_breach or False,
        "provenance_tag": "[HEC-RAS 2D Native HDF5 Engine]" if "Native" in solver_name else "[SIMULATED - Calibrated 2D Hydrodynamic Fallback]"
    }

@router.get("/hecras/jobs/{job_id}")
def get_hecras_job_status(job_id: str, db: Session = Depends(get_db)):
    """Retrieves real-time status, progress percentage, and logs of a HEC-RAS 2D job."""
    job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="HEC-RAS 2D job not found")

    return {
        "job_id": job.id,
        "catchment_id": job.catchment_id,
        "status": job.status,
        "solver_type": job.solver_type,
        "progress_percent": job.progress_percent,
        "peak_discharge_cumecs": job.peak_discharge_cumecs,
        "max_flood_depth_m": job.max_flood_depth_m,
        "flooded_area_sq_km": job.flooded_area_sq_km,
        "exposed_population": job.exposed_population,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "log_output": job.log_output,
        "has_results": job.results_json is not None
    }

@router.get("/hecras/jobs/{job_id}/results")
def get_hecras_job_results(job_id: str, db: Session = Depends(get_db)):
    """
    Returns complete HEC-RAS 2D hydrodynamic results envelope:
    max depth, peak velocity, wave celerity, spatial 2D flood polygons,
    velocity vectors, time-series propagation steps, and reach profiles.
    """
    job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="HEC-RAS 2D job not found")
    if not job.results_json:
        if job.status == "FAILED":
            raise HTTPException(status_code=400, detail="HEC-RAS 2D simulation failed to converge.")
        raise HTTPException(status_code=400, detail="Simulation results not yet ready.")

    return json.loads(job.results_json)

@router.post("/hecras/jobs/{job_id}/apply-to-impact")
def apply_hecras_to_impact(job_id: str, db: Session = Depends(get_db)):
    """
    Directly connects HEC-RAS 2D simulation output to the downstream damage
    and evacuation pipeline. Updates road submergence depths and bridge cutoff flags.
    """
    job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
    if not job or not job.results_json:
        raise HTTPException(status_code=404, detail="Completed HEC-RAS job with results required")

    results = json.loads(job.results_json)
    polys = results.get("flood_polygons", [])
    reach_depths = results.get("reach_depths", {})

    # Update road water depths based on simulated reach depths
    nir_depth = reach_depths.get("nirjuli_m", 0.0)
    pic_depth = reach_depths.get("pichola_m", 0.0)
    har_depth = reach_depths.get("harmuti_m", 0.0)

    roads = db.query(Road).filter(Road.catchment_id == job.catchment_id).all()
    for r in roads:
        # Ridge and highland evacuation corridors (>140m elevation) remain safe & passable
        if r.elevation_m >= 140.0:
            r.current_water_depth_m = 0.0
            r.is_closed = False
        elif "Pichola" in r.name:
            r.current_water_depth_m = max(0.0, round(pic_depth - 0.8, 2))
            r.is_closed = (r.current_water_depth_m > 0.30)
        elif "Harmuti" in r.name:
            r.current_water_depth_m = max(0.0, round(har_depth - 0.8, 2))
            r.is_closed = (r.current_water_depth_m > 0.30)
        elif "Riverside" in r.name or "Low Bank" in r.name:
            r.current_water_depth_m = max(0.0, round(nir_depth - 1.0, 2))
            r.is_closed = (r.current_water_depth_m > 0.30)
        else:
            r.current_water_depth_m = 0.0
            r.is_closed = False
    db.commit()

    # Re-run downstream damage assessment using HEC-RAS flood polygons
    damage_report = assess_downstream_damage(
        db=db,
        catchment_id=job.catchment_id,
        flood_polygons=polys,
        peak_discharge_cumecs=job.peak_discharge_cumecs
    )

    return {
        "message": f"HEC-RAS 2D simulation {job_id} successfully synchronized with downstream impact and evacuation pipeline.",
        "job_id": job_id,
        "peak_discharge_cumecs": job.peak_discharge_cumecs,
        "max_flood_depth_m": job.max_flood_depth_m,
        "damage_report": damage_report
    }

@router.get("/hecras/export-project")
def export_hecras_project_files(
    catchment_id: str = "CATCH-DIKRONG-01",
    peak_discharge_cumecs: float = Query(1450.0, ge=10.0, le=25000.0),
    manning_n_channel: float = Query(0.038, ge=0.015, le=0.15),
    manning_n_floodplain: float = Query(0.065, ge=0.02, le=0.25),
    equation_set: str = Query("DIFFUSION_WAVE"),
    enable_breach: bool = Query(False)
):
    """
    Generates standard USACE HEC-RAS 6.x project files (.prj, .p01, .u01, .g01)
    for importing into desktop HEC-RAS.
    """
    adapter = get_simulation_adapter()
    files = adapter.generate_project_files(
        catchment_id=catchment_id,
        discharge_cumecs=peak_discharge_cumecs,
        manning_n_channel=manning_n_channel,
        manning_n_floodplain=manning_n_floodplain,
        duration_hours=6.0,
        equation_set=equation_set,
        enable_breach=enable_breach
    )
    return {
        "catchment_id": catchment_id,
        "project_name": "HydroGuard_Dikrong_2D",
        "hecras_version_target": "USACE HEC-RAS 6.4.1+",
        "files": files
    }

# ==========================================
# Legacy & Backwards-Compatible Endpoints
# ==========================================

@router.get("/scenarios")
def list_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(SimulationScenario).all()
    return [
        {
            "id": sc.id,
            "name": sc.name,
            "tag": sc.tag,
            "description": sc.description,
            "rainfall_intensity_mm_per_hr": sc.rainfall_intensity_mm_per_hr,
            "accumulated_24h_rainfall_mm": sc.accumulated_24h_rainfall_mm,
            "forecast_6h_rainfall_mm": sc.forecast_6h_rainfall_mm,
            "soil_moisture_percent": sc.soil_moisture_percent,
            "upstream_gauge_m": sc.upstream_gauge_m,
            "midstream_gauge_m": sc.midstream_gauge_m,
            "downstream_gauge_m": sc.downstream_gauge_m,
            "river_discharge_cumecs": sc.river_discharge_cumecs,
            "risk_score": sc.risk_score,
            "risk_category": sc.risk_category,
            "is_default": sc.is_default
        }
        for sc in scenarios
    ]

@router.post("/switch-scenario")
def switch_active_scenario(req: ScenarioSwitchRequest, db: Session = Depends(get_db)):
    sc = db.query(SimulationScenario).filter(SimulationScenario.id == req.scenario_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Scenario not found")

    db.query(SimulationScenario).update({"is_default": False})
    sc.is_default = True
    db.commit()

    simulate_sensor_telemetry_for_scenario(db, sc)

    pred = run_catchment_prediction(db, "CATCH-DIKRONG-01", {
        "rainfall_intensity_mm_per_hr": sc.rainfall_intensity_mm_per_hr,
        "accumulated_24h_rainfall_mm": sc.accumulated_24h_rainfall_mm,
        "forecast_6h_rainfall_mm": sc.forecast_6h_rainfall_mm,
        "soil_moisture_percent": sc.soil_moisture_percent,
        "river_water_level_m": sc.midstream_gauge_m,
        "rate_of_rise_m_per_hr": sc.rate_of_rise_m_per_hr
    })

    return {
        "message": f"Successfully activated '{sc.name}'",
        "scenario": {
            "id": sc.id,
            "name": sc.name,
            "tag": sc.tag,
            "risk_category": sc.risk_category,
            "river_discharge_cumecs": sc.river_discharge_cumecs
        },
        "latest_prediction_id": pred.id
    }

@router.post("/run")
def trigger_simulation(req: SimulationTriggerRequest, db: Session = Depends(get_db)):
    """Legacy endpoint forwarding to HEC-RAS 2D runner."""
    hec_req = HECRASSimulationRequest(
        catchment_id=req.catchment_id,
        scenario_id=req.scenario_id,
        custom_inflow_discharge_cumecs=req.custom_inflow_discharge_cumecs,
        solver_mode=req.solver_mode or "AUTO"
    )
    return run_hecras_2d_simulation(hec_req, db)

@router.get("/{id}")
def get_simulation_status(id: str, db: Session = Depends(get_db)):
    return get_hecras_job_status(id, db)

@router.get("/{id}/results")
def get_simulation_results(id: str, db: Session = Depends(get_db)):
    return get_hecras_job_results(id, db)
