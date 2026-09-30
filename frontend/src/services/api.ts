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
