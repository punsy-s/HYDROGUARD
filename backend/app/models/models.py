from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="PUBLIC", nullable=False)  # PUBLIC, OFFICIAL, ADMIN
    department = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class Catchment(Base):
    __tablename__ = "catchments"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    districts = Column(String(200), nullable=False)
    area_sq_km = Column(Float, nullable=False)
    max_elevation_m = Column(Float, nullable=False)
    min_elevation_m = Column(Float, nullable=False)
    mean_slope_degrees = Column(Float, nullable=False)
    soil_type = Column(String(100), nullable=False)
    time_of_concentration_hours = Column(Float, nullable=False)
    critical_rainfall_threshold_mm_per_hr = Column(Float, default=35.0)
    warning_lead_time_min = Column(Integer, default=180)
    geojson_boundary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    villages = relationship("Village", back_populates="catchment", cascade="all, delete-orphan")
    sensors = relationship("Sensor", back_populates="catchment", cascade="all, delete-orphan")
    shelters = relationship("Shelter", back_populates="catchment", cascade="all, delete-orphan")
    roads = relationship("Road", back_populates="catchment", cascade="all, delete-orphan")
    infrastructure = relationship("Infrastructure", back_populates="catchment", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="catchment", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="catchment", cascade="all, delete-orphan")

class Village(Base):
    __tablename__ = "villages"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    total_population = Column(Integer, nullable=False)
    households = Column(Integer, nullable=False)
    vulnerable_elderly = Column(Integer, default=0)
    vulnerable_children = Column(Integer, default=0)
    elevation_m = Column(Float, nullable=False)
    flood_prone_zone = Column(String(100), nullable=False)
    primary_shelter_id = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_person = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    catchment = relationship("Catchment", back_populates="villages")

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    device_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    sensor_type = Column(String(50), default="INTEGRATED_HYDRO_MET")  # RAIN_GAUGE, RIVER_STAGE, SOIL_MOISTURE, INTEGRATED_HYDRO_MET
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, WARNING, OFFLINE, MAINTENANCE
    battery_level_pct = Column(Float, default=100.0)
    last_heartbeat = Column(DateTime, default=utc_now)
    is_simulated = Column(Boolean, default=False)
    api_key = Column(String(100), nullable=False)
    firmware_version = Column(String(20), default="v1.2.4-esp32")
    created_at = Column(DateTime, default=utc_now)

    catchment = relationship("Catchment", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(String(50), ForeignKey("sensors.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now, index=True)
    rainfall_mm = Column(Float, default=0.0)
    soil_moisture_pct = Column(Float, default=0.0)
    water_level_m = Column(Float, default=0.0)
    temperature_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    battery_pct = Column(Float, default=100.0)
    is_simulated = Column(Boolean, default=False)
    data_quality_flag = Column(String(20), default="GOOD")  # GOOD, SUSPECT, MISSING, INTERPOLATED

    sensor = relationship("Sensor", back_populates="readings")

class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    provider = Column(String(50), default="Open-Meteo API")
    rainfall_intensity_mm_per_hr = Column(Float, default=0.0)
    accumulated_24h_rainfall_mm = Column(Float, default=0.0)
    forecast_6h_rainfall_mm = Column(Float, default=0.0)
    temperature_c = Column(Float, default=24.0)
    humidity_pct = Column(Float, default=85.0)
    wind_speed_kmh = Column(Float, default=10.0)
    is_simulated = Column(Boolean, default=False)

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    risk_score = Column(Float, nullable=False)  # 0.00 to 1.00
    risk_category = Column(String(20), nullable=False)  # Low, Moderate, High, Critical
    model_type = Column(String(50), default="HYBRID_PHYSICAL_ML")
    warning_lead_time_min = Column(Integer, nullable=True)
    rainfall_contribution_pct = Column(Float, default=40.0)
    soil_contribution_pct = Column(Float, default=25.0)
    river_contribution_pct = Column(Float, default=25.0)
    terrain_contribution_pct = Column(Float, default=10.0)
    explanation = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=False)

    catchment = relationship("Catchment", back_populates="predictions")

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    tag = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    rainfall_intensity_mm_per_hr = Column(Float, nullable=False)
    accumulated_24h_rainfall_mm = Column(Float, nullable=False)
    forecast_6h_rainfall_mm = Column(Float, nullable=False)
    soil_moisture_percent = Column(Float, nullable=False)
    soil_saturation_ratio = Column(Float, nullable=False)
    upstream_gauge_m = Column(Float, nullable=False)
    midstream_gauge_m = Column(Float, nullable=False)
    downstream_gauge_m = Column(Float, nullable=False)
    rate_of_rise_m_per_hr = Column(Float, nullable=False)
    river_discharge_cumecs = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(20), nullable=False)
    warning_lead_time_min = Column(Integer, nullable=True)
    scenario_data_json = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)

class SimulationJob(Base):
    __tablename__ = "simulation_jobs"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), index=True, nullable=False)
    scenario_id = Column(String(50), nullable=True)
    status = Column(String(20), default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED
    solver_type = Column(String(100), default="Calibrated 2D Hydrodynamic Solver")
    progress_percent = Column(Float, default=0.0)
    peak_discharge_cumecs = Column(Float, default=0.0)
    max_flood_depth_m = Column(Float, default=0.0)
    flooded_area_sq_km = Column(Float, default=0.0)
    exposed_population = Column(Integer, default=0)
    started_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)
    results_json = Column(Text, nullable=True)
    log_output = Column(Text, nullable=True)

class Infrastructure(Base):
    __tablename__ = "infrastructure"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # Bridge, Hospital, Power Substation, Embankment
    criticality = Column(String(50), default="High")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=True)
    deck_level_m = Column(Float, nullable=True)
    is_compromised = Column(Boolean, default=False)
    capacity_beds = Column(Integer, nullable=True)
    details_json = Column(Text, nullable=True)

    catchment = relationship("Catchment", back_populates="infrastructure")

class Road(Base):
    __tablename__ = "roads"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    road_type = Column(String(50), nullable=False)
    lanes = Column(Integer, default=2)
    capacity_vph = Column(Integer, default=1500)
    base_speed_kmph = Column(Float, default=50.0)
    elevation_m = Column(Float, nullable=False)
    from_node = Column(String(50), nullable=False)
    to_node = Column(String(50), nullable=False)
    coordinates_json = Column(Text, nullable=False)
    is_closed = Column(Boolean, default=False)
    closure_reason = Column(String(200), nullable=True)
    current_water_depth_m = Column(Float, default=0.0)

    catchment = relationship("Catchment", back_populates="roads")

class Shelter(Base):
    __tablename__ = "shelters"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    elevation_m = Column(Float, nullable=False)
    total_capacity = Column(Integer, nullable=False)
    current_occupancy = Column(Integer, default=0)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    power_backup = Column(String(100), nullable=True)
    drinking_water = Column(String(100), nullable=True)
    medical_facilities = Column(String(100), nullable=True)
    food_stock_days = Column(Integer, default=7)
    is_accessible = Column(Boolean, default=True)
    status = Column(String(50), default="Operational - Green")

    catchment = relationship("Catchment", back_populates="shelters")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(50), primary_key=True)
    catchment_id = Column(String(50), ForeignKey("catchments.id"), nullable=False)
    alert_id_code = Column(String(50), unique=True, nullable=False)
    headline = Column(String(200), nullable=False)
    risk_level = Column(String(20), nullable=False)  # Low, Moderate, High, Critical
    severity = Column(String(50), nullable=False)  # Yellow Advisory, Orange Watch, Red Alert Order
    issued_by = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    message = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    nearest_shelter = Column(String(100), nullable=True)
    evacuation_route_summary = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING_APPROVAL")  # DRAFT, PENDING_APPROVAL, APPROVED, BROADCASTED, CANCELLED
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    catchment = relationship("Catchment", back_populates="alerts")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    catchment_id = Column(String(50), nullable=False)
    user_name = Column(String(100), nullable=False)
    user_phone = Column(String(50), nullable=True)
    village_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    report_type = Column(String(50), nullable=False)  # Waterlogging, Road Blocked, Landslide, Bridge Overtopped
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="Moderate")  # Low, Moderate, High, Critical
    status = Column(String(20), default="UNVERIFIED")  # UNVERIFIED, VERIFIED, RESOLVED
    created_at = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True)
    user_role = Column(String(20), nullable=True)
    action = Column(String(100), nullable=False)
    target_resource = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utc_now)
