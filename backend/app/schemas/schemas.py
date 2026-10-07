from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Auth schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "PUBLIC"  # PUBLIC, OFFICIAL, ADMIN
    department: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# Telemetry / Sensor schemas
class SensorReadingCreate(BaseModel):
    device_id: str
    catchment_id: str
    timestamp: Optional[datetime] = None
    rainfall_mm: float = Field(..., ge=0.0, description="Precipitation accumulated or rate in mm")
    soil_moisture_pct: float = Field(..., ge=0.0, le=100.0, description="Volumetric soil moisture percentage")
    water_level_m: float = Field(..., ge=0.0, description="River water surface stage in meters")
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    battery_pct: Optional[float] = 100.0
    is_simulated: Optional[bool] = False

class SensorSummary(BaseModel):
    id: str
    device_id: str
    name: str
    sensor_type: str
    latitude: float
    longitude: float
    elevation_m: float
    status: str
    battery_level_pct: float
    last_heartbeat: datetime
    is_simulated: bool
    latest_reading: Optional[Dict[str, Any]] = None

# Weather schemas
class WeatherResponse(BaseModel):
    catchment_id: str
    provider: str
    timestamp: datetime
    current_temp_c: float
    current_humidity_pct: float
    rainfall_intensity_mm_per_hr: float
    accumulated_24h_rainfall_mm: float
    forecast_6h_rainfall_mm: float
    wind_speed_kmh: float
    is_live_api: bool
    data_source_label: str  # [OBSERVED] or [FORECAST] or [SIMULATED]

# Prediction schemas
class PredictionRequest(BaseModel):
    catchment_id: str
    rainfall_intensity_mm_per_hr: Optional[float] = None
    accumulated_24h_rainfall_mm: Optional[float] = None
    forecast_6h_rainfall_mm: Optional[float] = None
    soil_moisture_percent: Optional[float] = None
    river_water_level_m: Optional[float] = None
    rate_of_rise_m_per_hr: Optional[float] = None
    model_type: Optional[str] = "HYBRID_PHYSICAL_ML"

class PredictionResponse(BaseModel):
    catchment_id: str
    timestamp: datetime
    risk_score: float
    risk_category: str  # Low, Moderate, High, Critical
    warning_lead_time_min: Optional[int]
    rainfall_contribution_pct: float
    soil_contribution_pct: float
    river_contribution_pct: float
    terrain_contribution_pct: float
    explanation: str
    provenance_tag: str = "[PREDICTED - AI/HYDRO ENGINE]"
    recommendations: List[str]

# Hydraulic Simulation schemas
class SimulationTriggerRequest(BaseModel):
    catchment_id: str
    scenario_id: Optional[str] = None
    custom_inflow_discharge_cumecs: Optional[float] = None
    solver_mode: Optional[str] = "AUTO"  # AUTO, NATIVE_HECRAS, CALIBRATED_SOLVER

class HECRASSimulationRequest(BaseModel):
    catchment_id: str = Field("CATCH-DIKRONG-01", description="Catchment ID")
    scenario_id: Optional[str] = Field(None, description="Preset scenario ID")
    custom_inflow_discharge_cumecs: Optional[float] = Field(1450.0, ge=10.0, le=25000.0, description="Upstream boundary peak inflow Q (m3/s)")
    manning_n_channel: Optional[float] = Field(0.038, ge=0.015, le=0.150, description="Main channel Manning roughness n")
    manning_n_floodplain: Optional[float] = Field(0.065, ge=0.020, le=0.250, description="Overbank floodplain Manning roughness n")
    equation_set: Optional[str] = Field("DIFFUSION_WAVE", description="DIFFUSION_WAVE or FULL_MOMENTUM_SWE")
    computation_interval_sec: Optional[int] = Field(60, ge=1, le=3600, description="Computational timestep Delta t in seconds")
    simulation_duration_hours: Optional[float] = Field(6.0, ge=1.0, le=72.0, description="Simulation duration in hours")
    enable_embankment_breach: Optional[bool] = Field(False, description="Simulate structural failure of Pichola left embankment")
    solver_mode: Optional[str] = Field("AUTO", description="AUTO, FORCE_NATIVE, or FORCE_FALLBACK")

class HECRASEngineInfo(BaseModel):
    native_hecras_available: bool
    installed_version: Optional[str]
    executable_path: Optional[str]
    active_solver_engine: str
    active_solver_mode: str
    supported_equations: List[str]
    supported_catchments: List[str]
    mesh_resolution_meters: int
    disclaimer: str

class HECRASReachResult(BaseModel):
    reach_name: str
    station_id: str
    elevation_m: float
    water_depth_m: float
    water_surface_elevation_m: float
    velocity_mps: float
    froude_number: float
    hazard_rating: str
    arrival_time_hrs: float
    time_to_peak_hrs: float

class HECRASVelocityVector(BaseModel):
    id: str
    reach: str
    latitude: float
    longitude: float
    velocity_mps: float
    direction_deg: float
    u_mps: float
    v_mps: float

class HECRASTimestepData(BaseModel):
    timestep_hrs: float
    flood_stage: str
    total_volume_m3: float
    active_flooded_area_sq_km: float
    max_reach_depth_m: float
    reach_depths: Dict[str, float]

class SimulationJobResponse(BaseModel):
    job_id: str
    catchment_id: str
    status: str
    solver_type: str
    progress_percent: float
    peak_discharge_cumecs: float
    max_flood_depth_m: float
    flooded_area_sq_km: float
    exposed_population: int
    started_at: datetime
    completed_at: Optional[datetime]
    provenance_tag: str = "[SIMULATED - 2D HYDRAULIC]"

# Evacuation & Routing schemas
class EvacuationRouteRequest(BaseModel):
    village_id: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    transport_mode: Optional[str] = "VEHICLE"  # VEHICLE, PEDESTRIAN, AMBULANCE
    target_shelter_id: Optional[str] = None

class EvacuationRouteOption(BaseModel):
    route_id: str
    name: str
    shelter_id: str
    shelter_name: str
    shelter_available_capacity: int
    distance_km: float
    estimated_travel_time_min: float
    max_flood_depth_on_route_m: float
    safety_rating: str  # "SAFE", "CAUTION", "UNSAFE"
    is_recommended: bool
    congestion_level: str  # "Low", "Moderate", "Heavy"
    waypoints: List[List[float]]  # [[lat, lon], ...]
    turn_by_turn: List[str]

class EvacuationResponse(BaseModel):
    origin: Dict[str, Any]
    routes: List[EvacuationRouteOption]
    primary_recommendation: Optional[EvacuationRouteOption]
    safety_disclaimer: str

# Alert schemas
class AlertCreate(BaseModel):
    catchment_id: str
    headline: str
    risk_level: str
    severity: str
    message: str
    recommended_action: Optional[str] = None
    nearest_shelter: Optional[str] = None
    evacuation_route_summary: Optional[str] = None

class AlertApprovalRequest(BaseModel):
    status: str  # APPROVED or CANCELLED
    official_notes: Optional[str] = None

# Citizen Report schemas
class ReportCreate(BaseModel):
    catchment_id: str
    user_name: str
    user_phone: Optional[str] = None
    village_name: str
    latitude: float
    longitude: float
    report_type: str
    description: str
    severity: Optional[str] = "Moderate"

# Scenario switch schema
class ScenarioSwitchRequest(BaseModel):
    scenario_id: str
