import json
import os
from datetime import datetime, timezone
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.models import (
    User, Catchment, Village, Sensor, SensorReading, Infrastructure,
    Road, Shelter, SimulationScenario, Alert
)

def init_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Initialize Users if none exist
        if db.query(User).count() == 0:
            users = [
                User(
                    id="USR-ADMIN-01",
                    username="admin",
                    email="admin@terraguard.gov.in",
                    hashed_password=hash_password("Admin@123"),
                    full_name="Dr. Arvind Sharma",
                    role="ADMIN",
                    department="National Disaster Management Center",
                    phone="+91-94360-00001"
                ),
                User(
                    id="USR-OFFICIAL-01",
                    username="officer_sdma",
                    email="commander@arunachal.sdma.gov.in",
                    hashed_password=hash_password("Officer@123"),
                    full_name="Col. R. Tsering (Retd.)",
                    role="OFFICIAL",
                    department="State Disaster Management Authority (Papum Pare)",
                    phone="+91-94360-00002"
                ),
                User(
                    id="USR-PUBLIC-01",
                    username="citizen_user",
                    email="resident.nirjuli@gmail.com",
                    hashed_password=hash_password("Public@123"),
                    full_name="Pema Wangchu",
                    role="PUBLIC",
                    department="Resident - Nirjuli Ward 4",
                    phone="+91-94360-00003"
                ),
            ]
            db.add_all(users)
            db.commit()

        # 2. Initialize Catchment
        catchment_id = "CATCH-DIKRONG-01"
        catchment = db.query(Catchment).filter(Catchment.id == catchment_id).first()
        if not catchment:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            boundary_path = os.path.join(data_dir, "dikrong_catchment.geojson")
            boundary_geojson = ""
            if os.path.exists(boundary_path):
                with open(boundary_path, "r", encoding="utf-8") as f:
                    boundary_geojson = f.read()

            catchment = Catchment(
                id=catchment_id,
                name="Dikrong River Catchment",
                state="Arunachal Pradesh & Assam",
                districts="Papum Pare, Lakhimpur",
                area_sq_km=1542.8,
                max_elevation_m=2450.0,
                min_elevation_m=72.0,
                mean_slope_degrees=28.4,
                soil_type="Humic Mountain Gleysols & Alluvial Sandy Loam",
                time_of_concentration_hours=3.2,
                critical_rainfall_threshold_mm_per_hr=35.0,
                warning_lead_time_min=180,
                geojson_boundary=boundary_geojson
            )
            db.add(catchment)
            db.commit()

        # 3. Initialize Villages from GeoJSON
        if db.query(Village).count() == 0:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            vil_path = os.path.join(data_dir, "dikrong_villages.geojson")
            if os.path.exists(vil_path):
                with open(vil_path, "r", encoding="utf-8") as f:
                    v_data = json.load(f)
                    for feat in v_data.get("features", []):
                        p = feat["properties"]
                        coords = feat["geometry"]["coordinates"]
                        vil = Village(
                            id=p["id"],
                            catchment_id=catchment_id,
                            name=p["name"],
                            district=p["district"],
                            state=p["state"],
                            total_population=p["total_population"],
                            households=p["households"],
                            vulnerable_elderly=p.get("vulnerable_elderly", 0),
                            vulnerable_children=p.get("vulnerable_children", 0),
                            elevation_m=p["elevation_m"],
                            flood_prone_zone=p["flood_prone_zone"],
                            primary_shelter_id=p.get("primary_shelter_id"),
                            latitude=coords[1],
                            longitude=coords[0],
                            contact_person=p.get("contact_person"),
                            contact_phone=p.get("contact_phone")
                        )
                        db.add(vil)
                db.commit()

        # 4. Initialize Shelters from GeoJSON
        if db.query(Shelter).count() == 0:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            sh_path = os.path.join(data_dir, "dikrong_shelters.geojson")
            if os.path.exists(sh_path):
                with open(sh_path, "r", encoding="utf-8") as f:
                    s_data = json.load(f)
                    for feat in s_data.get("features", []):
                        p = feat["properties"]
                        coords = feat["geometry"]["coordinates"]
                        shelter = Shelter(
                            id=p["id"],
                            catchment_id=catchment_id,
                            name=p["name"],
                            type=p["type"],
                            elevation_m=p["elevation_m"],
                            total_capacity=p["total_capacity"],
                            current_occupancy=p.get("current_occupancy", 0),
                            latitude=coords[1],
                            longitude=coords[0],
                            power_backup=p.get("power_backup"),
                            drinking_water=p.get("drinking_water"),
                            medical_facilities=p.get("medical_facilities"),
                            food_stock_days=p.get("food_stock_days", 7),
                            is_accessible=p.get("is_wheelchair_accessible", True),
                            status=p.get("status", "Operational - Green")
                        )
                        db.add(shelter)
                db.commit()

        # 5. Initialize Infrastructure
        if db.query(Infrastructure).count() == 0:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            inf_path = os.path.join(data_dir, "dikrong_infrastructure.geojson")
            if os.path.exists(inf_path):
                with open(inf_path, "r", encoding="utf-8") as f:
                    inf_data = json.load(f)
                    for feat in inf_data.get("features", []):
                        p = feat["properties"]
                        coords = feat["geometry"]["coordinates"]
                        infra = Infrastructure(
                            id=p["id"],
                            catchment_id=catchment_id,
                            name=p["name"],
                            category=p["category"],
                            criticality=p.get("criticality", "High"),
                            latitude=coords[1],
                            longitude=coords[0],
                            elevation_m=p.get("elevation_m"),
                            deck_level_m=p.get("deck_level_m"),
                            is_compromised=p.get("is_structurally_compromised", False),
                            capacity_beds=p.get("beds")
                        )
                        db.add(infra)
                db.commit()

        # 6. Initialize Roads
        if db.query(Road).count() == 0:
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            rd_path = os.path.join(data_dir, "dikrong_roads.geojson")
            if os.path.exists(rd_path):
                with open(rd_path, "r", encoding="utf-8") as f:
                    rd_data = json.load(f)
                    for feat in rd_data.get("features", []):
                        p = feat["properties"]
                        coords = feat["geometry"]["coordinates"]
                        road = Road(
                            id=p["id"],
                            catchment_id=catchment_id,
                            name=p["name"],
                            road_type=p["road_type"],
                            lanes=p.get("lanes", 2),
                            capacity_vph=p.get("capacity_vph", 1500),
                            base_speed_kmph=float(p.get("base_speed_kmph", 50.0)),
                            elevation_m=float(p.get("elevation_m", 100.0)),
                            from_node=p["from_node"],
                            to_node=p["to_node"],
                            coordinates_json=json.dumps(coords),
                            is_closed=p.get("is_currently_closed", False),
                            closure_reason=p.get("closure_reason")
                        )
                        db.add(road)
                db.commit()

        # 7. Initialize IoT Telemetry Sensors
        if db.query(Sensor).count() == 0:
            sensors = [
                Sensor(
                    id="SENS-UPSTREAM-01",
                    catchment_id=catchment_id,
                    device_id="ESP32-SAGALEE-01",
                    name="Sagalee Upland Early Warning Hydromet Station",
                    sensor_type="INTEGRATED_HYDRO_MET",
                    latitude=27.240,
                    longitude=93.660,
                    elevation_m=620.0,
                    status="ACTIVE",
                    battery_level_pct=98.5,
                    is_simulated=False,
                    api_key="key_sagalee_esp32_secret_9981"
                ),
                Sensor(
                    id="SENS-MIDSTREAM-01",
                    catchment_id=catchment_id,
                    device_id="ESP32-DOIMUKH-02",
                    name="Doimukh Confluence River Stage Radar Station",
                    sensor_type="RIVER_STAGE",
                    latitude=27.145,
                    longitude=93.748,
                    elevation_m=142.0,
                    status="ACTIVE",
                    battery_level_pct=94.0,
                    is_simulated=False,
                    api_key="key_doimukh_esp32_secret_9982"
                ),
                Sensor(
                    id="SENS-MIDSTREAM-02",
                    catchment_id=catchment_id,
                    device_id="ESP32-NIRJULI-03",
                    name="Nirjuli Bridge Ultrasonic Level & Rain Gauge",
                    sensor_type="INTEGRATED_HYDRO_MET",
                    latitude=27.132,
                    longitude=93.742,
                    elevation_m=136.0,
                    status="ACTIVE",
                    battery_level_pct=89.0,
                    is_simulated=False,
                    api_key="key_nirjuli_esp32_secret_9983"
                ),
                Sensor(
                    id="SENS-DOWNSTREAM-01",
                    catchment_id=catchment_id,
                    device_id="ESP32-HARMUTI-04",
                    name="Harmuti Alluvial Gauge & Soil Moisture Station",
                    sensor_type="SOIL_MOISTURE",
                    latitude=27.082,
                    longitude=93.885,
                    elevation_m=98.0,
                    status="ACTIVE",
                    battery_level_pct=92.0,
                    is_simulated=False,
                    api_key="key_harmuti_esp32_secret_9984"
                ),
            ]
            db.add_all(sensors)
            db.commit()

            # Seed initial baseline readings for each sensor
            for s in sensors:
                reading = SensorReading(
                    sensor_id=s.id,
                    rainfall_mm=4.5,
                    soil_moisture_pct=34.0,
                    water_level_m=2.8,
                    temperature_c=25.2,
                    humidity_pct=78.0,
                    battery_pct=s.battery_level_pct,
                    is_simulated=False,
                    data_quality_flag="GOOD"
                )
                db.add(reading)
            db.commit()

        # 8. Initialize Demo Scenarios
        if db.query(SimulationScenario).count() == 0:
            scenarios_file = os.path.join(os.path.dirname(__file__), "..", "data", "scenarios.json")
            if os.path.exists(scenarios_file):
                with open(scenarios_file, "r", encoding="utf-8") as f:
                    sc_data = json.load(f)
                    for sc in sc_data.get("scenarios", []):
                        sim_sc = SimulationScenario(
                            id=sc["id"],
                            name=sc["name"],
                            tag=sc["tag"],
                            description=sc["description"],
                            rainfall_intensity_mm_per_hr=sc["rainfall_intensity_mm_per_hr"],
                            accumulated_24h_rainfall_mm=sc["accumulated_24h_rainfall_mm"],
                            forecast_6h_rainfall_mm=sc["forecast_6h_rainfall_mm"],
                            soil_moisture_percent=sc["soil_moisture_percent"],
                            soil_saturation_ratio=sc["soil_saturation_ratio"],
                            upstream_gauge_m=sc["upstream_gauge_m"],
                            midstream_gauge_m=sc["midstream_gauge_m"],
                            downstream_gauge_m=sc["downstream_gauge_m"],
                            rate_of_rise_m_per_hr=sc["rate_of_rise_m_per_hr"],
                            river_discharge_cumecs=sc["river_discharge_cumecs"],
                            risk_score=sc["risk_score"],
                            risk_category=sc["risk_category"],
                            warning_lead_time_min=sc.get("warning_lead_time_min"),
                            scenario_data_json=json.dumps(sc),
                            is_default=(sc["id"] == "scenario-normal")
                        )
                        db.add(sim_sc)
                db.commit()

        # Refresh sensor heartbeats to now if stale so local demo starts in active state
        now_dt = datetime.now(timezone.utc)
        for s in db.query(Sensor).all():
            if not s.last_heartbeat or (now_dt - s.last_heartbeat.replace(tzinfo=timezone.utc)).total_seconds() > 86400:
                s.last_heartbeat = now_dt
                s.status = "ACTIVE"

        for r in db.query(Road).all():
            r.current_water_depth_m = 0.0
            r.is_closed = False
        db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("TerraGuard NE database initialized and seeded successfully.")
