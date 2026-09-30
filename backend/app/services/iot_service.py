import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Sensor, SensorReading, SimulationScenario

def validate_and_ingest_reading(
    db: Session,
    device_id: str,
    api_key: str,
    rainfall_mm: float,
    soil_moisture_pct: float,
    water_level_m: float,
    temperature_c: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    battery_pct: Optional[float] = 100.0,
    is_simulated: bool = False
) -> Dict[str, Any]:
    """
    Validates, authenticates, and records an incoming telemetry packet from an ESP32 edge station.
    Performs range bounds checks and quality flag tagging.
    """
    sensor = db.query(Sensor).filter(Sensor.device_id == device_id).first()
    if not sensor:
        return {"success": False, "error": f"Sensor device '{device_id}' is not registered."}
    
    if sensor.api_key != api_key:
        return {"success": False, "error": "Sensor authentication failed: invalid API key."}

    # Range and quality validation
    quality_flag = "GOOD"
    if rainfall_mm < 0.0 or rainfall_mm > 500.0:
        quality_flag = "SUSPECT_RAIN_SPIKE"
    if soil_moisture_pct < 0.0 or soil_moisture_pct > 100.0:
        quality_flag = "SUSPECT_MOISTURE_OUT_OF_BOUNDS"
        soil_moisture_pct = max(0.0, min(100.0, soil_moisture_pct))
    if water_level_m < 0.0 or water_level_m > 30.0:
        quality_flag = "SUSPECT_WATER_LEVEL_OUT_OF_BOUNDS"

    now = datetime.now(timezone.utc)
    
    # Check for duplicate within last 2 seconds
    latest = db.query(SensorReading).filter(
        SensorReading.sensor_id == sensor.id
    ).order_by(SensorReading.timestamp.desc()).first()
    
    if latest and (now - latest.timestamp.replace(tzinfo=timezone.utc)).total_seconds() < 2.0:
        if abs(latest.rainfall_mm - rainfall_mm) < 0.01 and abs(latest.water_level_m - water_level_m) < 0.01:
            return {"success": True, "status": "DUPLICATE_IGNORED", "reading_id": latest.id}

    # Create reading
    reading = SensorReading(
        sensor_id=sensor.id,
        timestamp=now,
        rainfall_mm=round(rainfall_mm, 2),
        soil_moisture_pct=round(soil_moisture_pct, 1),
        water_level_m=round(water_level_m, 2),
        temperature_c=round(temperature_c, 1) if temperature_c is not None else 24.5,
        humidity_pct=round(humidity_pct, 1) if humidity_pct is not None else 85.0,
        battery_pct=round(battery_pct, 1) if battery_pct is not None else 100.0,
        is_simulated=is_simulated,
        data_quality_flag=quality_flag
    )
    db.add(reading)
    
    # Update sensor heartbeat and battery
    sensor.last_heartbeat = now
    sensor.battery_level_pct = battery_pct
    sensor.status = "ACTIVE" if quality_flag == "GOOD" else "WARNING"
    db.commit()
    db.refresh(reading)

    return {
        "success": True,
        "reading_id": reading.id,
        "sensor_id": sensor.id,
        "device_id": sensor.device_id,
        "quality_flag": quality_flag,
        "timestamp": reading.timestamp.isoformat()
    }

def get_sensor_fleet_status(db: Session, catchment_id: str) -> List[Dict[str, Any]]:
    """
    Evaluates health, connectivity, and telemetry staleness of all sensors in the catchment.
    Flags missing transmissions if time > 15 minutes.
    """
    now = datetime.now(timezone.utc)
    sensors = db.query(Sensor).filter(Sensor.catchment_id == catchment_id).all()
    fleet = []

    for s in sensors:
        latest = db.query(SensorReading).filter(
            SensorReading.sensor_id == s.id
        ).order_by(SensorReading.timestamp.desc()).first()

        staleness_sec = (now - s.last_heartbeat.replace(tzinfo=timezone.utc)).total_seconds()
        
        # Health classification
        if staleness_sec > 86400:
            status = "OFFLINE"
        elif staleness_sec > 14400:
            status = "WARNING_STALE"
        elif s.battery_level_pct < 20.0:
            status = "LOW_BATTERY"
        else:
            status = "ACTIVE"

        fleet.append({
            "id": s.id,
            "device_id": s.device_id,
            "name": s.name,
            "sensor_type": s.sensor_type,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "elevation_m": s.elevation_m,
            "status": status,
            "battery_level_pct": s.battery_level_pct,
            "last_heartbeat": s.last_heartbeat.isoformat(),
            "staleness_seconds": int(staleness_sec),
            "is_simulated": s.is_simulated,
            "latest_reading": {
                "rainfall_mm": latest.rainfall_mm if latest else 0.0,
                "soil_moisture_pct": latest.soil_moisture_pct if latest else 0.0,
                "water_level_m": latest.water_level_m if latest else 0.0,
                "temperature_c": latest.temperature_c if latest else 24.0,
                "humidity_pct": latest.humidity_pct if latest else 85.0,
                "quality_flag": latest.data_quality_flag if latest else "N/A",
                "timestamp": latest.timestamp.isoformat() if latest else None
            } if latest else None
        })

    return fleet

def simulate_sensor_telemetry_for_scenario(db: Session, scenario: SimulationScenario):
    """
    Generates realistic, physically plausible sensor measurements corresponding
    to the active scenario across all 4 catchment monitoring stations.
    """
    sensors = db.query(Sensor).filter(Sensor.catchment_id == scenario.id or True).all()
    now = datetime.now(timezone.utc)
    
    # Scale parameters by station elevation and position along Dikrong reach
    for s in sensors:
        # Base values from scenario with Gaussian noise
        if "SAGALEE" in s.device_id:
            # Upland station: highest rainfall intensity, steep torrent response
            rain = max(0.0, scenario.rainfall_intensity_mm_per_hr * 1.25 + random.uniform(-2.0, 2.0))
            soil = min(100.0, max(15.0, scenario.soil_moisture_percent * 0.95 + random.uniform(-1.0, 1.0)))
            stage = max(0.5, scenario.upstream_gauge_m + random.uniform(-0.1, 0.15))
        elif "DOIMUKH" in s.device_id:
            # Confluence station
            rain = max(0.0, scenario.rainfall_intensity_mm_per_hr + random.uniform(-1.5, 1.5))
            soil = min(100.0, max(15.0, scenario.soil_moisture_percent + random.uniform(-1.0, 1.0)))
            stage = max(1.0, scenario.midstream_gauge_m + random.uniform(-0.1, 0.2))
        elif "NIRJULI" in s.device_id:
            # Valley narrowing bridge station
            rain = max(0.0, scenario.rainfall_intensity_mm_per_hr * 0.9 + random.uniform(-1.5, 1.5))
            soil = min(100.0, max(15.0, scenario.soil_moisture_percent * 1.02 + random.uniform(-1.0, 1.0)))
            stage = max(1.0, scenario.midstream_gauge_m * 1.05 + random.uniform(-0.15, 0.2))
        else:
            # Harmuti downstream floodplain station
            rain = max(0.0, scenario.rainfall_intensity_mm_per_hr * 0.8 + random.uniform(-1.0, 1.0))
            soil = min(100.0, max(15.0, scenario.soil_moisture_percent * 1.05 + random.uniform(-1.0, 1.0)))
            stage = max(0.8, scenario.downstream_gauge_m + random.uniform(-0.1, 0.15))

        reading = SensorReading(
            sensor_id=s.id,
            timestamp=now,
            rainfall_mm=round(rain, 2),
            soil_moisture_pct=round(soil, 1),
            water_level_m=round(stage, 2),
            temperature_c=round(24.0 - (s.elevation_m / 200.0) + random.uniform(-0.5, 0.5), 1),
            humidity_pct=round(min(100.0, 75.0 + (scenario.soil_saturation_ratio * 24.0)), 1),
            battery_pct=round(max(60.0, s.battery_level_pct - random.uniform(0.0, 0.1)), 1),
            is_simulated=True,
            data_quality_flag="GOOD"
        )
        db.add(reading)
        s.last_heartbeat = now
        s.status = "ACTIVE"
    
    db.commit()
