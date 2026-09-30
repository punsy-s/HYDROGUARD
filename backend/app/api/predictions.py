from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Prediction
from app.schemas.schemas import PredictionRequest, PredictionResponse
from app.services.prediction_service import run_catchment_prediction, FlashFloodPredictor

router = APIRouter(prefix="/predictions", tags=["Flash Flood Risk Predictions"])

@router.get("/{catchment_id}/latest")
def get_latest_prediction(catchment_id: str, db: Session = Depends(get_db)):
    pred = db.query(Prediction).filter(
        Prediction.catchment_id == catchment_id
    ).order_by(Prediction.timestamp.desc()).first()

    if not pred:
        # Generate initial prediction on demand
        pred = run_catchment_prediction(db, catchment_id)

    return {
        "id": pred.id,
        "catchment_id": pred.catchment_id,
        "timestamp": pred.timestamp.isoformat(),
        "risk_score": pred.risk_score,
        "risk_category": pred.risk_category,
        "model_type": pred.model_type,
        "warning_lead_time_min": pred.warning_lead_time_min,
        "rainfall_contribution_pct": pred.rainfall_contribution_pct,
        "soil_contribution_pct": pred.soil_contribution_pct,
        "river_contribution_pct": pred.river_contribution_pct,
        "terrain_contribution_pct": pred.terrain_contribution_pct,
        "explanation": pred.explanation,
        "provenance_tag": "[PREDICTED - AI / Hydro Engine]"
    }

@router.post("/run")
def trigger_prediction(req: PredictionRequest, db: Session = Depends(get_db)):
    params = {}
    if req.rainfall_intensity_mm_per_hr is not None:
        params["rainfall_intensity_mm_per_hr"] = req.rainfall_intensity_mm_per_hr
    if req.accumulated_24h_rainfall_mm is not None:
        params["accumulated_24h_rainfall_mm"] = req.accumulated_24h_rainfall_mm
    if req.forecast_6h_rainfall_mm is not None:
        params["forecast_6h_rainfall_mm"] = req.forecast_6h_rainfall_mm
    if req.soil_moisture_percent is not None:
        params["soil_moisture_percent"] = req.soil_moisture_percent
    if req.river_water_level_m is not None:
        params["river_water_level_m"] = req.river_water_level_m
    if req.rate_of_rise_m_per_hr is not None:
        params["rate_of_rise_m_per_hr"] = req.rate_of_rise_m_per_hr

    pred = run_catchment_prediction(db, req.catchment_id, params)
    return {
        "id": pred.id,
        "catchment_id": pred.catchment_id,
        "timestamp": pred.timestamp.isoformat(),
        "risk_score": pred.risk_score,
        "risk_category": pred.risk_category,
        "model_type": pred.model_type,
        "warning_lead_time_min": pred.warning_lead_time_min,
        "rainfall_contribution_pct": pred.rainfall_contribution_pct,
        "soil_contribution_pct": pred.soil_contribution_pct,
        "river_contribution_pct": pred.river_contribution_pct,
        "terrain_contribution_pct": pred.terrain_contribution_pct,
        "explanation": pred.explanation,
        "provenance_tag": "[PREDICTED - AI / Hydro Engine]"
    }

@router.get("/{catchment_id}/history")
def get_prediction_history(catchment_id: str, limit: int = 15, db: Session = Depends(get_db)):
    preds = db.query(Prediction).filter(
        Prediction.catchment_id == catchment_id
    ).order_by(Prediction.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": p.id,
            "timestamp": p.timestamp.isoformat(),
            "risk_score": p.risk_score,
            "risk_category": p.risk_category,
            "lead_time_min": p.warning_lead_time_min,
            "rainfall_pct": p.rainfall_contribution_pct,
            "soil_pct": p.soil_contribution_pct,
            "river_pct": p.river_contribution_pct
        }
        for p in reversed(preds)
    ]
