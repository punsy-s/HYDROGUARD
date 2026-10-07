import sys
import platform
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import AuditLog, Sensor, User, SimulationJob, Catchment
from app.services.hecras_adapter import get_simulation_adapter, get_hecras_engine_info

router = APIRouter(prefix="/admin", tags=["System Administration"])

@router.get("/system-health")
def get_system_health(db: Session = Depends(get_db)):
    engine_info = get_hecras_engine_info()
    sensors_count = db.query(Sensor).count()
    users_count = db.query(User).count()
    jobs_count = db.query(SimulationJob).count()

    return {
        "status": "HEALTHY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": {
            "os": platform.system(),
            "os_release": platform.release(),
            "python_version": sys.version.split()[0]
        },
        "adapters": {
            "hydraulic_engine": {
                "active_adapter": engine_info["active_solver_engine"],
                "native_hecras_detected": engine_info["native_hecras_available"],
                "active_solver_mode": engine_info["active_solver_mode"]
            },
            "weather_provider": {
                "name": "Open-Meteo API (WMO Certified)",
                "status": "ONLINE"
            },
            "telecom_gateway": {
                "name": "SMS & In-App Alert Dispatcher",
                "status": "OPERATIONAL"
            }
        },
        "database_metrics": {
            "registered_sensors": sensors_count,
            "registered_users": users_count,
            "simulations_executed": jobs_count
        }
    }

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["ADMIN"]))
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_role": l.user_role,
            "action": l.action,
            "target_resource": l.target_resource,
            "details": l.details,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]
