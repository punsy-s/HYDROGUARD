import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import SimulationScenario, SimulationJob, Catchment
from app.schemas.schemas import SimulationTriggerRequest, ScenarioSwitchRequest
from app.services.hecras_adapter import execute_simulation_job_async, get_simulation_adapter
from app.services.iot_service import simulate_sensor_telemetry_for_scenario
from app.services.prediction_service import run_catchment_prediction

router = APIRouter(prefix="/simulations", tags=["Hydraulic Flood Simulations"])

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
    """
    Live Demonstration Switcher: Switches current active scenario.
    Synchronizes simulated IoT sensor streams, triggers fresh predictions,
    and returns updated flood matrix.
    """
    sc = db.query(SimulationScenario).filter(SimulationScenario.id == req.scenario_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Mark as default
    db.query(SimulationScenario).update({"is_default": False})
    sc.is_default = True
    db.commit()

    # Update sensor telemetry to reflect scenario conditions
    simulate_sensor_telemetry_for_scenario(db, sc)

    # Run updated prediction
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
    """
    Spawns an asynchronous 2D hydraulic flood simulation job.
    Uses HEC-RAS native engine if installed; otherwise uses the calibrated 2D solver.
    """
    job_id = f"JOB-SIM-{int(datetime.now(timezone.utc).timestamp())}"
    
    # Discharge determination
    discharge = req.custom_inflow_discharge_cumecs or 1450.0
    if req.scenario_id:
        sc = db.query(SimulationScenario).filter(SimulationScenario.id == req.scenario_id).first()
        if sc:
            discharge = sc.river_discharge_cumecs

    adapter = get_simulation_adapter()
    solver_name = adapter.get_installed_version() or "2D Hydrodynamic Solver"

    job = SimulationJob(
        id=job_id,
        catchment_id=req.catchment_id,
        scenario_id=req.scenario_id,
        status="QUEUED",
        solver_type=solver_name,
        progress_percent=5.0,
        peak_discharge_cumecs=discharge,
        started_at=datetime.now(timezone.utc),
        log_output=f"[{datetime.now().strftime('%H:%M:%S')}] Simulation job {job_id} queued.\n"
    )
    db.add(job)
    db.commit()

    # Launch background thread
    execute_simulation_job_async(
        job_id=job_id,
        catchment_id=req.catchment_id,
        discharge_cumecs=discharge,
        scenario_id=req.scenario_id
    )

    return {
        "job_id": job.id,
        "catchment_id": job.catchment_id,
        "status": job.status,
        "solver_type": job.solver_type,
        "progress_percent": job.progress_percent,
        "peak_discharge_cumecs": job.peak_discharge_cumecs,
        "provenance_tag": "[SIMULATED - 2D Hydraulic Model]"
    }

@router.get("/{id}")
def get_simulation_status(id: str, db: Session = Depends(get_db)):
    job = db.query(SimulationJob).filter(SimulationJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Simulation job not found")
    
    return {
        "job_id": job.id,
        "catchment_id": job.catchment_id,
        "status": job.status,
        "solver_type": job.solver_type,
        "progress_percent": job.progress_percent,
        "peak_discharge_cumecs": job.peak_discharge_cumecs,
        "max_flood_depth_m": job.max_flood_depth_m,
        "flooded_area_sq_km": job.flooded_area_sq_km,
        "started_at": job.started_at.isoformat(),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "log_output": job.log_output,
        "has_results": job.results_json is not None
    }

@router.get("/{id}/results")
def get_simulation_results(id: str, db: Session = Depends(get_db)):
    job = db.query(SimulationJob).filter(SimulationJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Simulation job not found")
    if not job.results_json:
        raise HTTPException(status_code=400, detail="Simulation results not yet available or job failed.")

    return json.loads(job.results_json)
