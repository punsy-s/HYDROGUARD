import {
  Catchment, Village, Sensor, WeatherData, PredictionData,
  SimulationScenario, DamageReport, Shelter, EvacuationResponse,
  Alert, CitizenReport, SystemHealth
} from '../types';

const API_BASE = '/api';

export async function fetchCatchment(id: string = 'CATCH-DIKRONG-01'): Promise<Catchment> {
  const res = await fetch(`${API_BASE}/catchments/${id}`);
  if (!res.ok) throw new Error('Failed to fetch catchment');
  return res.json();
}

export async function fetchCatchmentBoundary(id: string = 'CATCH-DIKRONG-01'): Promise<any> {
  const res = await fetch(`${API_BASE}/catchments/${id}/boundary`);
  if (!res.ok) throw new Error('Failed to fetch boundary');
  return res.json();
}

export async function fetchCatchmentRiverNetwork(id: string = 'CATCH-DIKRONG-01'): Promise<any> {
  const res = await fetch(`${API_BASE}/catchments/${id}/river-network`);
  if (!res.ok) throw new Error('Failed to fetch river network');
  return res.json();
}

export async function fetchVillages(id: string = 'CATCH-DIKRONG-01'): Promise<Village[]> {
  const res = await fetch(`${API_BASE}/catchments/${id}/villages`);
  if (!res.ok) throw new Error('Failed to fetch villages');
  return res.json();
}

export async function fetchRoads(id: string = 'CATCH-DIKRONG-01'): Promise<any[]> {
  const res = await fetch(`${API_BASE}/catchments/${id}/roads`);
  if (!res.ok) throw new Error('Failed to fetch roads');
  return res.json();
}

export async function fetchShelters(id: string = 'CATCH-DIKRONG-01'): Promise<Shelter[]> {
  const res = await fetch(`${API_BASE}/catchments/${id}/shelters`);
  if (!res.ok) throw new Error('Failed to fetch shelters');
  return res.json();
}

export async function fetchSensors(catchmentId: string = 'CATCH-DIKRONG-01'): Promise<Sensor[]> {
  const res = await fetch(`${API_BASE}/sensors?catchment_id=${catchmentId}`);
  if (!res.ok) throw new Error('Failed to fetch sensors');
  return res.json();
}

export async function fetchSensorHistory(sensorId: string, limit: number = 30): Promise<any[]> {
  const res = await fetch(`${API_BASE}/sensors/${sensorId}/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch sensor history');
  return res.json();
}

export async function fetchWeather(catchmentId: string = 'CATCH-DIKRONG-01'): Promise<WeatherData> {
  const res = await fetch(`${API_BASE}/weather/${catchmentId}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function fetchLatestPrediction(catchmentId: string = 'CATCH-DIKRONG-01'): Promise<PredictionData> {
  const res = await fetch(`${API_BASE}/predictions/${catchmentId}/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest prediction');
  return res.json();
}

export async function triggerPrediction(params: any): Promise<PredictionData> {
  const res = await fetch(`${API_BASE}/predictions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to run prediction');
  return res.json();
}

export async function fetchScenarios(): Promise<SimulationScenario[]> {
  const res = await fetch(`${API_BASE}/simulations/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function switchScenario(scenarioId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/switch-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id: scenarioId })
  });
  if (!res.ok) throw new Error('Failed to switch scenario');
  return res.json();
}

export async function fetchHECRASEngineInfo(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/hecras/engine-info`);
  if (!res.ok) throw new Error('Failed to fetch HEC-RAS engine info');
  return res.json();
}

export async function runHECRAS2DSimulation(params: {
  catchment_id?: string;
  scenario_id?: string;
  custom_inflow_discharge_cumecs?: number;
  manning_n_channel?: number;
  manning_n_floodplain?: number;
  equation_set?: string;
  computation_interval_sec?: number;
  simulation_duration_hours?: number;
  enable_embankment_breach?: boolean;
  solver_mode?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/hecras/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      catchment_id: params.catchment_id || 'CATCH-DIKRONG-01',
      scenario_id: params.scenario_id,
      custom_inflow_discharge_cumecs: params.custom_inflow_discharge_cumecs,
      manning_n_channel: params.manning_n_channel,
      manning_n_floodplain: params.manning_n_floodplain,
      equation_set: params.equation_set || 'DIFFUSION_WAVE',
      computation_interval_sec: params.computation_interval_sec || 60,
      simulation_duration_hours: params.simulation_duration_hours || 6.0,
      enable_embankment_breach: params.enable_embankment_breach || false,
      solver_mode: params.solver_mode || 'AUTO'
    })
  });
  if (!res.ok) throw new Error('Failed to launch HEC-RAS 2D simulation');
  return res.json();
}

export async function fetchHECRASJobStatus(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/hecras/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch HEC-RAS job status');
  return res.json();
}

export async function fetchHECRASJobResults(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/hecras/jobs/${jobId}/results`);
  if (!res.ok) throw new Error('Failed to fetch HEC-RAS job results');
  return res.json();
}

export async function applyHECRASToImpact(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/hecras/jobs/${jobId}/apply-to-impact`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to apply HEC-RAS simulation to downstream impact');
  return res.json();
}

export async function exportHECRASProject(params?: {
  catchmentId?: string;
  peakDischarge?: number;
  manningNChannel?: number;
  manningNFloodplain?: number;
  equationSet?: string;
  enableBreach?: boolean;
}): Promise<any> {
  const query = new URLSearchParams({
    catchment_id: params?.catchmentId || 'CATCH-DIKRONG-01',
    peak_discharge_cumecs: String(params?.peakDischarge || 1450),
    manning_n_channel: String(params?.manningNChannel || 0.038),
    manning_n_floodplain: String(params?.manningNFloodplain || 0.065),
    equation_set: params?.equationSet || 'DIFFUSION_WAVE',
    enable_breach: String(params?.enableBreach || false)
  });
  const res = await fetch(`${API_BASE}/simulations/hecras/export-project?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to export HEC-RAS project files');
  return res.json();
}

export async function triggerSimulation(catchmentId: string, scenarioId?: string, discharge?: number): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      catchment_id: catchmentId,
      scenario_id: scenarioId,
      custom_inflow_discharge_cumecs: discharge
    })
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function fetchSimulationStatus(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch simulation status');
  return res.json();
}

export async function fetchSimulationResults(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/simulations/${jobId}/results`);
  if (!res.ok) throw new Error('Failed to fetch simulation results');
  return res.json();
}

export async function fetchDownstreamDamage(catchmentId: string = 'CATCH-DIKRONG-01', scenarioId?: string): Promise<DamageReport> {
  const url = scenarioId 
    ? `${API_BASE}/impact/${catchmentId}?scenario_id=${scenarioId}`
    : `${API_BASE}/impact/${catchmentId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch damage report');
  return res.json();
}

export async function fetchEvacuationRoutes(
  villageId?: string,
  targetShelterId?: string,
  lat?: number,
  lon?: number
): Promise<EvacuationResponse> {
  const res = await fetch(`${API_BASE}/evacuation/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      village_id: villageId,
      target_shelter_id: targetShelterId,
      origin_lat: lat,
      origin_lon: lon,
      transport_mode: 'VEHICLE'
    })
  });
  if (!res.ok) throw new Error('Failed to calculate evacuation routes');
  return res.json();
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function approveAlert(alertId: string, status: string = 'APPROVED', notes?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/approve`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      // Simulated incident commander token or bearer
      'Authorization': 'Bearer demo-official-token'
    },
    body: JSON.stringify({
      status,
      official_notes: notes
    })
  });
  if (!res.ok) throw new Error('Failed to approve alert');
  return res.json();
}

export async function fetchReports(): Promise<CitizenReport[]> {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function submitCitizenReport(report: any): Promise<any> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  if (!res.ok) throw new Error('Failed to submit citizen report');
  return res.json();
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/admin/system-health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}
