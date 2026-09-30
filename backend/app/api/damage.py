import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import SimulationScenario, SimulationJob
from app.services.damage_service import assess_downstream_damage

router = APIRouter(prefix="/impact", tags=["Downstream Damage Assessment"])

@router.get("/{catchment_id}")
def get_downstream_impact(
    catchment_id: str,
    scenario_id: str = Query(None, description="Optional scenario ID override"),
    db: Session = Depends(get_db)
):
    """
    Returns spatial damage intersection summary for the active flood scenario:
    affected settlements, exposed demographic counts, submerged roads, and bridge cutoff statuses.
    """
    # Find active scenario
    if scenario_id:
        sc = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    else:
        sc = db.query(SimulationScenario).filter(SimulationScenario.is_default == True).first()
        if not sc:
            sc = db.query(SimulationScenario).first()

    if not sc:
        raise HTTPException(status_code=404, detail="No flood scenario configured")

    polys = []
    if sc.scenario_data_json:
        try:
            data = json.loads(sc.scenario_data_json)
            sim_data = data.get("simulation", {})
            polys = sim_data.get("flood_polygons", [])
        except Exception:
            pass

    damage_report = assess_downstream_damage(
        db=db,
        catchment_id=catchment_id,
        flood_polygons=polys,
        peak_discharge_cumecs=sc.river_discharge_cumecs
    )
    damage_report["scenario_name"] = sc.name
    damage_report["scenario_tag"] = sc.tag

    return damage_report
