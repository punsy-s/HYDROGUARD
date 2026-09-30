export interface Catchment {
  id: string;
  name: string;
  state: string;
  districts: string;
  area_sq_km: number;
  max_elevation_m: number;
  min_elevation_m: number;
  mean_slope_degrees: number;
  soil_type: string;
  time_of_concentration_hours: number;
  critical_rainfall_threshold_mm_per_hr: number;
  warning_lead_time_min: number;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  total_population: number;
  households: number;
  vulnerable_elderly: number;
  vulnerable_children: number;
  elevation_m: number;
  flood_prone_zone: string;
  primary_shelter_id?: string;
  latitude: number;
  longitude: number;
  contact_person?: string;
  contact_phone?: string;
}

export interface SensorReading {
  rainfall_mm: number;
  soil_moisture_pct: number;
  water_level_m: number;
  temperature_c?: number;
  humidity_pct?: number;
  battery_pct?: number;
  data_quality_flag?: string;
  timestamp?: string;
}

export interface Sensor {
  id: string;
  device_id: string;
  name: string;
  sensor_type: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  status: 'ACTIVE' | 'WARNING' | 'OFFLINE' | string;
  battery_level_pct: number;
  last_heartbeat: string;
  staleness_seconds: number;
  is_simulated: boolean;
  latest_reading?: SensorReading;
}

export interface WeatherData {
  catchment_id: string;
  provider: string;
  timestamp: string;
  current_temp_c: number;
  current_humidity_pct: number;
  rainfall_intensity_mm_per_hr: number;
  accumulated_24h_rainfall_mm: number;
  forecast_6h_rainfall_mm: number;
  wind_speed_kmh: number;
  is_live_api: boolean;
  data_source_label: string;
  status: string;
}

export interface PredictionData {
  id: string;
  catchment_id: string;
  timestamp: string;
  risk_score: number;
  risk_category: 'Low' | 'Moderate' | 'High' | 'Critical';
  model_type: string;
  warning_lead_time_min: number | null;
  rainfall_contribution_pct: number;
  soil_contribution_pct: number;
  river_contribution_pct: number;
  terrain_contribution_pct: number;
  explanation: string;
  provenance_tag: string;
  recommendations?: string[];
}

export interface SimulationScenario {
  id: string;
  name: string;
  tag: string;
  description: string;
  rainfall_intensity_mm_per_hr: number;
  accumulated_24h_rainfall_mm: number;
  forecast_6h_rainfall_mm: number;
  soil_moisture_percent: number;
  upstream_gauge_m: number;
  midstream_gauge_m: number;
  downstream_gauge_m: number;
  river_discharge_cumecs: number;
  rate_of_rise_m_per_hr?: number;
  risk_score: number;
  risk_category: string;
  is_default: boolean;
}

export interface InundatedRoad {
  road_id: string;
  name: string;
  road_type: string;
  water_depth_m: number;
  is_passable: boolean;
  status: string;
  recommended_action: string;
}

export interface SeveredBridge {
  infrastructure_id: string;
  name: string;
  status: string;
  hazard: string;
  passable: boolean;
}

export interface AffectedVillage {
  village_id: string;
  name: string;
  district: string;
  elevation_m: number;
  flood_depth_m: number;
  estimated_arrival_hrs: number;
  exposed_population: number;
  vulnerable_elderly: number;
  vulnerable_children: number;
  severity: string;
  priority: string;
  recommended_shelter_id?: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface DamageReport {
  catchment_id: string;
  scenario_name: string;
  scenario_tag: string;
  peak_discharge_cumecs: number;
  total_exposed_population: number;
  vulnerable_elderly_count: number;
  vulnerable_children_count: number;
  affected_villages_count: number;
  affected_villages: AffectedVillage[];
  inundated_roads_count: number;
  total_flooded_roads_km: number;
  inundated_roads: InundatedRoad[];
  severed_bridges: SeveredBridge[];
  provenance_tag: string;
  data_notice: string;
}

export interface Shelter {
  id: string;
  name: string;
  type: string;
  elevation_m: number;
  total_capacity: number;
  current_occupancy: number;
  available_capacity: number;
  occupancy_pct: number;
  latitude: number;
  longitude: number;
  power_backup?: string;
  drinking_water?: string;
  medical_facilities?: string;
  food_stock_days: number;
  is_accessible: boolean;
  status: string;
}

export interface EvacuationRouteOption {
  route_id: string;
  name: string;
  shelter_id: string;
  shelter_name: string;
  shelter_available_capacity: number;
  shelter_elevation_m: number;
  distance_km: number;
  estimated_travel_time_min: number;
  max_flood_depth_on_route_m: number;
  safety_rating: string;
  congestion_level: string;
  is_recommended: boolean;
  waypoints: number[][]; // [[lon, lat], ...]
  turn_by_turn: string[];
}

export interface EvacuationResponse {
  origin: {
    node_id: string;
    name: string;
    latitude?: number;
    longitude?: number;
  };
  routes: EvacuationRouteOption[];
  primary_recommendation: EvacuationRouteOption | null;
  safety_disclaimer: string;
}

export interface Alert {
  id: string;
  catchment_id: string;
  alert_id_code: string;
  headline: string;
  risk_level: string;
  severity: string;
  issued_by: string;
  timestamp: string;
  message: string;
  recommended_action?: string;
  nearest_shelter?: string;
  evacuation_route_summary?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'BROADCASTED' | 'CANCELLED';
  approved_by?: string;
  approved_at?: string;
}

export interface CitizenReport {
  id: number;
  catchment_id: string;
  user_name: string;
  user_phone?: string;
  village_name: string;
  latitude: number;
  longitude: number;
  report_type: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  platform: {
    os: string;
    os_release: string;
    python_version: string;
  };
  adapters: {
    hydraulic_engine: {
      active_adapter: string;
      native_hecras_detected: boolean;
    };
    weather_provider: {
      name: string;
      status: string;
    };
    telecom_gateway: {
      name: string;
      status: string;
    };
  };
  database_metrics: {
    registered_sensors: number;
    registered_users: number;
    simulations_executed: number;
  };
}
