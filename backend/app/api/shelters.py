from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Shelter, AuditLog

router = APIRouter(prefix="/shelters", tags=["Shelters & Evacuation Centers"])

@router.get("")
def list_shelters(db: Session = Depends(get_db)):
    shelters = db.query(Shelter).all()
    return [
        {
            "id": s.id,
            "catchment_id": s.catchment_id,
            "name": s.name,
            "type": s.type,
            "elevation_m": s.elevation_m,
            "total_capacity": s.total_capacity,
            "current_occupancy": s.current_occupancy,
            "available_capacity": max(0, s.total_capacity - s.current_occupancy),
            "occupancy_pct": round((s.current_occupancy / max(1, s.total_capacity)) * 100, 1),
            "latitude": s.latitude,
            "longitude": s.longitude,
            "power_backup": s.power_backup,
            "drinking_water": s.drinking_water,
            "medical_facilities": s.medical_facilities,
            "food_stock_days": s.food_stock_days,
            "is_accessible": s.is_accessible,
            "status": s.status
        }
        for s in shelters
    ]

@router.put("/{id}/occupancy")
def update_shelter_occupancy(
    id: str,
    occupancy: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["OFFICIAL", "ADMIN"]))
):
    shelter = db.query(Shelter).filter(Shelter.id == id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    shelter.current_occupancy = max(0, min(shelter.total_capacity, occupancy))
    if shelter.current_occupancy >= shelter.total_capacity * 0.95:
        shelter.status = "FULL - REROUTE"
    elif shelter.current_occupancy >= shelter.total_capacity * 0.70:
        shelter.status = "HIGH OCCUPANCY"
    else:
        shelter.status = "Operational - Green"

    db.add(AuditLog(
        action="SHELTER_OCCUPANCY_UPDATE",
        user_id=user.get("user_id"),
        user_role=user.get("role"),
        target_resource=shelter.name,
        details=f"Occupancy adjusted to {shelter.current_occupancy}/{shelter.total_capacity}"
    ))
    db.commit()
    db.refresh(shelter)

    return {
        "id": shelter.id,
        "name": shelter.name,
        "current_occupancy": shelter.current_occupancy,
        "available_capacity": shelter.total_capacity - shelter.current_occupancy,
        "status": shelter.status
    }
