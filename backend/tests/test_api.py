import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "HydroGuard" in data["service"]

def test_catchment_endpoints():
    # List catchments
    response = client.get("/api/catchments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["id"] == "CATCH-DIKRONG-01"

    # Get boundary GeoJSON
    response = client.get("/api/catchments/CATCH-DIKRONG-01/boundary")
    assert response.status_code == 200
    geojson = response.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0

    # Get river network GeoJSON
    response = client.get("/api/catchments/CATCH-DIKRONG-01/river-network")
    assert response.status_code == 200
    river_geojson = response.json()
    assert river_geojson["type"] == "FeatureCollection"

    # Get villages
    response = client.get("/api/catchments/CATCH-DIKRONG-01/villages")
    assert response.status_code == 200
    villages = response.json()
    assert len(villages) >= 5

def test_sensor_telemetry_and_health():
    # Fleet health
    response = client.get("/api/sensors/fleet/health")
    assert response.status_code == 200
    health = response.json()
    assert health["total_sensors"] >= 4
    assert health["fleet_operational_ratio"] > 0

    # Ingest telemetry reading
    payload = {
        "device_id": "ESP32-NIRJULI-03",
        "catchment_id": "CATCH-DIKRONG-01",
        "rainfall_mm": 18.5,
        "soil_moisture_pct": 68.2,
        "water_level_m": 4.8,
        "temperature_c": 23.8,
        "humidity_pct": 89.0,
        "battery_pct": 94.5,
        "is_simulated": True
    }
    headers = {"X-Sensor-API-Key": "key_nirjuli_esp32_secret_9983"}
    response = client.post("/api/sensors/readings", json=payload, headers=headers)
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True

def test_weather_integration():
    response = client.get("/api/weather/CATCH-DIKRONG-01")
    assert response.status_code == 200
    weather = response.json()
    assert "current_temp_c" in weather
    assert "rainfall_intensity_mm_per_hr" in weather
    assert "data_source_label" in weather

def test_flash_flood_prediction():
    # Run prediction with critical scenario values
    payload = {
        "catchment_id": "CATCH-DIKRONG-01",
        "rainfall_intensity_mm_per_hr": 85.0,
        "accumulated_24h_rainfall_mm": 210.0,
        "forecast_6h_rainfall_mm": 70.0,
        "soil_moisture_percent": 92.0,
        "river_water_level_m": 8.9,
        "rate_of_rise_m_per_hr": 1.6
    }
    response = client.post("/api/predictions/run", json=payload)
    assert response.status_code == 200
    pred = response.json()
    assert pred["risk_category"] == "Critical"
    assert pred["risk_score"] > 0.85
    assert pred["warning_lead_time_min"] is not None

def test_simulation_and_scenario_switch():
    # List scenarios
    response = client.get("/api/simulations/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) == 3

    # Switch scenario to Critical Flash Flood Emergency
    response = client.post("/api/simulations/switch-scenario", json={"scenario_id": "scenario-critical"})
    assert response.status_code == 200
    switch_res = response.json()
    assert switch_res["scenario"]["tag"] == "FLASH_FLOOD_EMERGENCY"

def test_downstream_damage_assessment():
    response = client.get("/api/impact/CATCH-DIKRONG-01")
    assert response.status_code == 200
    impact = response.json()
    assert impact["total_exposed_population"] > 0
    assert len(impact["affected_villages"]) > 0

def test_safe_evacuation_routing():
    # Route from Nirjuli Riverside under active critical scenario
    payload = {
        "village_id": "VIL-02",
        "transport_mode": "VEHICLE"
    }
    response = client.post("/api/evacuation/routes", json=payload)
    assert response.status_code == 200
    evac = response.json()
    assert len(evac["routes"]) > 0
    primary = evac["primary_recommendation"]
    assert primary is not None
    assert primary["shelter_available_capacity"] > 0
    # Verify safety: no road with depth > 0.30m
    assert primary["max_flood_depth_on_route_m"] <= 0.30

def test_shelters_and_alerts():
    # Shelters
    response = client.get("/api/shelters")
    assert response.status_code == 200
    shelters = response.json()
    assert len(shelters) >= 6

    # Alerts
    response = client.get("/api/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)

def test_admin_system_health():
    response = client.get("/api/admin/system-health")
    assert response.status_code == 200
    health = response.json()
    assert health["status"] == "HEALTHY"
    assert "hydraulic_engine" in health["adapters"]
