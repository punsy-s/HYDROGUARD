from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.weather_service import get_catchment_weather

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("/{catchment_id}")
def get_weather(
    catchment_id: str,
    refresh: bool = Query(False, description="Force refresh cache"),
    db: Session = Depends(get_db)
):
    # Centroid of Dikrong catchment: 27.15 N, 93.75 E
    data = get_catchment_weather(lat=27.15, lon=93.75, force_refresh=refresh)
    data["catchment_id"] = catchment_id
    return data
