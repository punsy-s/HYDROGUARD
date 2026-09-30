from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Report, Road, AuditLog
from app.schemas.schemas import ReportCreate

router = APIRouter(prefix="/reports", tags=["Citizen Field Reports"])

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "catchment_id": r.catchment_id,
            "user_name": r.user_name,
            "user_phone": r.user_phone,
            "village_name": r.village_name,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "report_type": r.report_type,
            "description": r.description,
            "severity": r.severity,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        }
        for r in reports
    ]

@router.post("")
def submit_report(req: ReportCreate, db: Session = Depends(get_db)):
    """
    Submits a ground-truth field report from citizens or volunteers.
    """
    report = Report(
        catchment_id=req.catchment_id,
        user_name=req.user_name,
        user_phone=req.user_phone,
        village_name=req.village_name,
        latitude=req.latitude,
        longitude=req.longitude,
        report_type=req.report_type,
        description=req.description,
        severity=req.severity or "Moderate",
        status="UNVERIFIED"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "message": "Citizen observation recorded. Local emergency cell notified.",
        "status": report.status
    }

@router.put("/{id}/verify")
def verify_report(
    id: int,
    action: str, # "VERIFIED" or "RESOLVED"
    mark_road_closed: bool = False,
    road_id: str = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["OFFICIAL", "ADMIN"]))
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = action.upper()

    if mark_road_closed and road_id:
        road = db.query(Road).filter(Road.id == road_id).first()
        if road:
            road.is_closed = True
            road.closure_reason = f"Ground report verified: {report.description}"

    db.add(AuditLog(
        action=f"REPORT_{action}",
        user_id=user.get("user_id"),
        user_role=user.get("role"),
        target_resource=f"Report #{report.id}",
        details=f"Report marked {action}. Road closed: {mark_road_closed}"
    ))
    db.commit()
    return {"id": report.id, "status": report.status}
