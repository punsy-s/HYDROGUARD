import time
import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.hecras_adapter import (
    NativeHECRASAdapter, CalibratedHydrodynamicSolverAdapter,
    get_simulation_adapter, get_hecras_engine_info
)

client = TestClient(app)

def test_hecras_engine_diagnostics():
    """Verify engine diagnostics endpoint and adapter metadata."""
    response = client.get("/api/simulations/hecras/engine-info")
    assert response.status_code == 200
    info = response.json()
    assert "native_hecras_available" in info
    assert "active_solver_engine" in info
    assert "supported_equations" in info
    assert len(info["supported_equations"]) >= 2
    assert "2D Diffusion Wave" in info["supported_equations"][0]
    assert info["mesh_resolution_meters"] == 30
    assert "disclaimer" in info

def test_hecras_adapter_unit_computation():
    """Verify calibrated hydrodynamic solver physical calculations."""
    adapter = CalibratedHydrodynamicSolverAdapter()
    assert adapter.is_available() is True
    assert "Calibrated 2D" in adapter.get_installed_version()

    # Run calculation with 1500 m3/s
    results = adapter.run_simulation(
        job_id="TEST-JOB-001",
        catchment_id="CATCH-DIKRONG-01",
        inflow_discharge_cumecs=1500.0,
        manning_n_channel=0.038,
        manning_n_floodplain=0.065,
        equation_set="DIFFUSION_WAVE",
        simulation_duration_hours=6.0,
        enable_breach=False
    )

    assert results["status"] == "COMPLETED"
    assert results["is_native_hecras"] is False
    assert "[SIMULATED" in results["provenance_tag"]
    assert results["max_flood_depth_m"] > 0.5
    assert results["peak_velocity_mps"] > 0.5
    assert results["wave_celerity_kmh"] > 0.0
    assert results["flooded_area_sq_km"] > 0.0

    # Verify reach profiles
    reaches = results["reach_profiles"]
    assert len(reaches) == 6
    reach_names = [r["reach_name"] for r in reaches]
    assert any("Nirjuli" in name for name in reach_names)
    assert any("Harmuti" in name for name in reach_names)

    # Check Froude numbers and hazard ratings
    for r in reaches:
        assert r["water_depth_m"] > 0.0
        assert r["velocity_mps"] > 0.0
        assert r["froude_number"] > 0.0
        assert r["hazard_rating"] in ["Low Hazard", "Moderate Hazard", "Significant Hazard", "Extreme Hazard"]

    # Verify velocity vectors
    vectors = results["velocity_vectors"]
    assert len(vectors) >= 4
    for v in vectors:
        assert "latitude" in v and "longitude" in v
        assert "velocity_mps" in v and "direction_deg" in v

    # Verify timesteps
    timesteps = results["simulation_timesteps"]
    assert len(timesteps) == 6
    assert timesteps[0]["timestep_hrs"] == 0.5
    assert timesteps[-1]["timestep_hrs"] == 6.0

    # Verify GeoJSON
    geojson = results["spatial_geojson"]
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0

def test_native_adapter_fallback_behavior():
    """Verify Native adapter handles missing host executable cleanly."""
    native = NativeHECRASAdapter()
    # On macOS dev host, native Windows Ras.exe is expected not present
    if not native.is_available():
        with pytest.raises(RuntimeError):
            native.run_simulation(
                job_id="TEST-FAIL-01",
                catchment_id="CATCH-DIKRONG-01",
                inflow_discharge_cumecs=1000.0
            )

def test_hecras_simulation_api_run_and_status():
    """Test full asynchronous execution via API endpoint."""
    payload = {
        "catchment_id": "CATCH-DIKRONG-01",
        "custom_inflow_discharge_cumecs": 1850.0,
        "manning_n_channel": 0.035,
        "manning_n_floodplain": 0.060,
        "equation_set": "DIFFUSION_WAVE",
        "computation_interval_sec": 60,
        "simulation_duration_hours": 6.0,
        "enable_embankment_breach": True,
        "solver_mode": "FORCE_FALLBACK"
    }

    # Trigger simulation
    response = client.post("/api/simulations/hecras/run", json=payload)
    assert response.status_code == 200
    job_data = response.json()
    assert "job_id" in job_data
    job_id = job_data["job_id"]
    assert job_data["status"] == "QUEUED"
    assert job_data["peak_discharge_cumecs"] == 1850.0

    # Wait for completion (simulated background thread takes ~1s)
    max_wait = 10
    completed = False
    for _ in range(max_wait * 2):
        time.sleep(0.5)
        status_resp = client.get(f"/api/simulations/hecras/jobs/{job_id}")
        assert status_resp.status_code == 200
        st = status_resp.json()
        if st["status"] == "COMPLETED":
            completed = True
            assert st["progress_percent"] == 100.0
            assert st["max_flood_depth_m"] > 1.0
            assert st["flooded_area_sq_km"] > 0.0
            assert st["has_results"] is True
            break

    assert completed is True

    # Retrieve results
    results_resp = client.get(f"/api/simulations/hecras/jobs/{job_id}/results")
    assert results_resp.status_code == 200
    results = results_resp.json()
    assert results["job_id"] == job_id
    assert results["peak_discharge_cumecs"] == 1850.0
    assert len(results["flood_polygons"]) > 0

    # Test apply to downstream impact
    apply_resp = client.post(f"/api/simulations/hecras/jobs/{job_id}/apply-to-impact")
    assert apply_resp.status_code == 200
    impact_data = apply_resp.json()
    assert "damage_report" in impact_data
    assert impact_data["damage_report"]["total_exposed_population"] > 0

def test_hecras_input_validation():
    """Verify input validation handles invalid boundary values."""
    # Peak discharge too low (<10)
    response = client.post("/api/simulations/hecras/run", json={
        "catchment_id": "CATCH-DIKRONG-01",
        "custom_inflow_discharge_cumecs": -50.0
    })
    assert response.status_code == 422

    # Manning roughness out of bounds (<0.015)
    response = client.post("/api/simulations/hecras/run", json={
        "catchment_id": "CATCH-DIKRONG-01",
        "manning_n_channel": 0.001
    })
    assert response.status_code == 422

def test_hecras_export_project():
    """Verify generation and export of HEC-RAS 6.x project files."""
    response = client.get(
        "/api/simulations/hecras/export-project?catchment_id=CATCH-DIKRONG-01&peak_discharge_cumecs=2200.0"
    )
    assert response.status_code == 200
    export_data = response.json()
    assert export_data["project_name"] == "HydroGuard_Dikrong_2D"
    files = export_data["files"]
    assert "dikrong_2d.prj" in files
    assert "dikrong_2d.p01" in files
    assert "dikrong_2d.u01" in files
    assert "dikrong_2d.g01" in files
    assert "Proj Title=HydroGuard_Dikrong_2D" in files["dikrong_2d.prj"]
    assert "2200.00 m3/s" in files["dikrong_2d.u01"]
