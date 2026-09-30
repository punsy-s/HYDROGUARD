import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Catchment, Village, Infrastructure, Road, Shelter

router = APIRouter(prefix="/catchments", tags=["Catchments"])

@router.get("")
def list_catchments(db: Session = Depends(get_db)):
    catchments = db.query(Catchment).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "state": c.state,
            "districts": c.districts,
            "area_sq_km": c.area_sq_km,
            "max_elevation_m": c.max_elevation_m,
            "min_elevation_m": c.min_elevation_m,
            "mean_slope_degrees": c.mean_slope_degrees,
            "soil_type": c.soil_type,
            "time_of_concentration_hours": c.time_of_concentration_hours,
            "critical_rainfall_threshold_mm_per_hr": c.critical_rainfall_threshold_mm_per_hr,
            "warning_lead_time_min": c.warning_lead_time_min
        }
        for c in catchments
    ]

@router.get("/{id}")
def get_catchment(id: str, db: Session = Depends(get_db)):
    c = db.query(Catchment).filter(Catchment.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Catchment not found")
    return {
        "id": c.id,
        "name": c.name,
        "state": c.state,
        "districts": c.districts,
        "area_sq_km": c.area_sq_km,
        "max_elevation_m": c.max_elevation_m,
        "min_elevation_m": c.min_elevation_m,
        "mean_slope_degrees": c.mean_slope_degrees,
        "soil_type": c.soil_type,
        "time_of_concentration_hours": c.time_of_concentration_hours,
        "critical_rainfall_threshold_mm_per_hr": c.critical_rainfall_threshold_mm_per_hr,
        "warning_lead_time_min": c.warning_lead_time_min
    }

@router.get("/{id}/boundary")
def get_catchment_boundary(id: str, db: Session = Depends(get_db)):
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    path = os.path.join(data_dir, "dikrong_catchment.geojson")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Catchment boundary GeoJSON not found")

@router.get("/{id}/river-network")
def get_catchment_river_network(id: str, db: Session = Depends(get_db)):
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    path = os.path.join(data_dir, "dikrong_river_network.geojson")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="River network GeoJSON not found")

@router.get("/{id}/villages")
def get_catchment_villages(id: str, db: Session = Depends(get_db)):
    villages = db.query(Village).filter(Village.catchment_id == id).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "district": v.district,
            "state": v.state,
            "total_population": v.total_population,
            "households": v.households,
            "vulnerable_elderly": v.vulnerable_elderly,
            "vulnerable_children": v.vulnerable_children,
            "elevation_m": v.elevation_m,
            "flood_prone_zone": v.flood_prone_zone,
            "primary_shelter_id": v.primary_shelter_id,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "contact_person": v.contact_person,
            "contact_phone": v.contact_phone
        }
        for v in villages
    ]

@router.get("/{id}/infrastructure")
def get_catchment_infrastructure(id: str, db: Session = Depends(get_db)):
    infra = db.query(Infrastructure).filter(Infrastructure.catchment_id == id).all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "criticality": i.criticality,
            "latitude": i.latitude,
            "longitude": i.longitude,
            "elevation_m": i.elevation_m,
            "deck_level_m": i.deck_level_m,
            "is_compromised": i.is_compromised,
            "capacity_beds": i.capacity_beds
        }
        for i in infra
    ]

@router.get("/{id}/roads")
def get_catchment_roads(id: str, db: Session = Depends(get_db)):
    roads = db.query(Road).filter(Road.catchment_id == id).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "road_type": r.road_type,
            "lanes": r.lanes,
            "capacity_vph": r.capacity_vph,
            "base_speed_kmph": r.base_speed_kmph,
            "elevation_m": r.elevation_m,
            "from_node": r.from_node,
            "to_node": r.to_node,
            "coordinates": json.loads(r.coordinates_json) if r.coordinates_json else [],
            "is_closed": r.is_closed,
            "closure_reason": r.closure_reason,
            "current_water_depth_m": r.current_water_depth_m
        }
        for r in roads
    ]

@router.get("/{id}/shelters")
def get_catchment_shelters(id: str, db: Session = Depends(get_db)):
    shelters = db.query(Shelter).filter(Shelter.catchment_id == id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "type": s.type,
            "elevation_m": s.elevation_m,
            "total_capacity": s.total_capacity,
            "current_occupancy": s.current_occupancy,
            "available_capacity": max(0, s.total_capacity - s.current_occupancy),
            "occupancy_rate_pct": round((s.current_occupancy / max(1, s.total_capacity)) * 100, 1),
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
