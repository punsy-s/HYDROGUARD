from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.models import Alert
from app.schemas.schemas import AlertCreate, AlertApprovalRequest
from app.services.notification_service import create_alert_draft, approve_or_cancel_alert

router = APIRouter(prefix="/alerts", tags=["Emergency Alerts & Warning Orders"])

@router.get("")
def list_alerts(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(Alert.timestamp.desc())
    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())
    alerts = query.all()

    return [
        {
            "id": a.id,
            "catchment_id": a.catchment_id,
            "alert_id_code": a.alert_id_code,
            "headline": a.headline,
            "risk_level": a.risk_level,
            "severity": a.severity,
            "issued_by": a.issued_by,
            "timestamp": a.timestamp.isoformat(),
            "message": a.message,
            "recommended_action": a.recommended_action,
            "nearest_shelter": a.nearest_shelter,
            "evacuation_route_summary": a.evacuation_route_summary,
            "status": a.status,
            "approved_by": a.approved_by,
            "approved_at": a.approved_at.isoformat() if a.approved_at else None
        }
        for a in alerts
    ]

@router.post("")
def draft_alert(
    alert_in: AlertCreate,
    db: Session = Depends(get_db),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Drafts an emergency alert.
    If created by an OFFICIAL or ADMIN, it can be approved or drafted.
    """
    issuer = user.get("sub", "Automated Prediction Pipeline") if user else "Automated Prediction Pipeline"
    is_official = user and user.get("role") in ["OFFICIAL", "ADMIN"]

    alert = create_alert_draft(
        db=db,
        catchment_id=alert_in.catchment_id,
        headline=alert_in.headline,
        risk_level=alert_in.risk_level,
        severity=alert_in.severity,
        message=alert_in.message,
        issued_by=issuer,
        recommended_action=alert_in.recommended_action,
        nearest_shelter=alert_in.nearest_shelter,
        evacuation_route_summary=alert_in.evacuation_route_summary,
        auto_approve=is_official
    )
    return {
        "id": alert.id,
        "alert_id_code": alert.alert_id_code,
        "status": alert.status,
        "message": "Alert created successfully."
    }

@router.put("/{id}/approve")
def approve_alert(
    id: str,
    req: AlertApprovalRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["OFFICIAL", "ADMIN"]))
):
    """
    Incident Commander Workflow: Authorizes or Cancels an evacuation alert.
    Dispatches emergency notifications.
    """
    officer_name = user.get("sub", "Incident Commander")
    alert = approve_or_cancel_alert(
        db=db,
        alert_id=id,
        officer_name=officer_name,
        new_status=req.status.upper(),
        notes=req.official_notes
    )
    return {
        "id": alert.id,
        "alert_id_code": alert.alert_id_code,
        "status": alert.status,
        "approved_by": alert.approved_by,
        "approved_at": alert.approved_at.isoformat()
    }
