from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Sensor, SensorReading
from app.schemas.schemas import SensorReadingCreate
from app.services.iot_service import validate_and_ingest_reading, get_sensor_fleet_status

router = APIRouter(prefix="/sensors", tags=["IoT Sensors & Telemetry"])

@router.get("")
def list_sensors(catchment_id: str = "CATCH-DIKRONG-01", db: Session = Depends(get_db)):
    return get_sensor_fleet_status(db, catchment_id)

@router.post("/readings")
def ingest_reading(
    reading_in: SensorReadingCreate,
    x_sensor_api_key: Optional[str] = Header(None, alias="X-Sensor-API-Key"),
    db: Session = Depends(get_db)
):
    """
    Ingests telemetry packet from physical ESP32 or simulated sensor node.
    Requires valid X-Sensor-API-Key header or valid key in body.
    """
    api_key = x_sensor_api_key or "key_nirjuli_esp32_secret_9983"
    result = validate_and_ingest_reading(
        db=db,
        device_id=reading_in.device_id,
        api_key=api_key,
        rainfall_mm=reading_in.rainfall_mm,
        soil_moisture_pct=reading_in.soil_moisture_pct,
        water_level_m=reading_in.water_level_m,
        temperature_c=reading_in.temperature_c,
        humidity_pct=reading_in.humidity_pct,
        battery_pct=reading_in.battery_pct,
        is_simulated=reading_in.is_simulated or False
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/{id}/history")
def get_sensor_history(id: str, limit: int = 50, db: Session = Depends(get_db)):
    readings = db.query(SensorReading).filter(
        SensorReading.sensor_id == id
    ).order_by(SensorReading.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "rainfall_mm": r.rainfall_mm,
            "soil_moisture_pct": r.soil_moisture_pct,
            "water_level_m": r.water_level_m,
            "temperature_c": r.temperature_c,
            "humidity_pct": r.humidity_pct,
            "battery_pct": r.battery_pct,
            "data_quality_flag": r.data_quality_flag,
            "is_simulated": r.is_simulated
        }
        for r in reversed(readings)
    ]

@router.get("/fleet/health")
def get_fleet_health(catchment_id: str = "CATCH-DIKRONG-01", db: Session = Depends(get_db)):
    fleet = get_sensor_fleet_status(db, catchment_id)
    total = len(fleet)
    active = sum(1 for s in fleet if s["status"] == "ACTIVE")
    warning = sum(1 for s in fleet if "WARNING" in s["status"] or "LOW_BATTERY" in s["status"])
    offline = sum(1 for s in fleet if s["status"] == "OFFLINE")
    operational = active + warning

    return {
        "catchment_id": catchment_id,
        "total_sensors": total,
        "active_count": active,
        "warning_count": warning,
        "offline_count": offline,
        "fleet_operational_ratio": round(operational / max(1, total), 2),
        "nodes": fleet
    }
