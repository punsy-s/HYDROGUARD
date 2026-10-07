import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { MainDashboard } from './pages/MainDashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { FloodPrediction } from './pages/FloodPrediction';
import { FloodSimulation } from './pages/FloodSimulation';
import { DownstreamDamage } from './pages/DownstreamDamage';
import { EvacuationPlanner } from './pages/EvacuationPlanner';
import { AlertsHub } from './pages/AlertsHub';
import { AdminConsole } from './pages/AdminConsole';
import { ProjectInfo } from './pages/ProjectInfo';
import {
  Catchment, Village, Sensor, Shelter, WeatherData,
  PredictionData, SimulationScenario, DamageReport, Alert, CitizenReport
} from './types';
import {
  fetchCatchment, fetchCatchmentBoundary, fetchCatchmentRiverNetwork,
  fetchVillages, fetchSensors, fetchShelters, fetchRoads,
  fetchWeather, fetchLatestPrediction, fetchScenarios,
  switchScenario, fetchDownstreamDamage, fetchAlerts, fetchReports
} from './services/api';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('landing');
  const [userRole, setUserRole] = useState<string>('PUBLIC');
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-normal');

  // Application data state
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [catchment, setCatchment] = useState<Catchment | null>(null);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null);
  const [riverGeoJson, setRiverGeoJson] = useState<any>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [roads, setRoads] = useState<any[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [damageReport, setDamageReport] = useState<DamageReport | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);

  // Initial Data Load
  const loadInitialData = async () => {
    try {
      const [
        scList, cData, bGeo, rGeo, vList, sList, shList, rdList,
        wData, pData, dmgData, aList, repList
      ] = await Promise.all([
        fetchScenarios().catch(() => []),
        fetchCatchment().catch(() => null),
        fetchCatchmentBoundary().catch(() => null),
        fetchCatchmentRiverNetwork().catch(() => null),
        fetchVillages().catch(() => []),
        fetchSensors().catch(() => []),
        fetchShelters().catch(() => []),
        fetchRoads().catch(() => []),
        fetchWeather().catch(() => null),
        fetchLatestPrediction().catch(() => null),
        fetchDownstreamDamage().catch(() => null),
        fetchAlerts().catch(() => []),
        fetchReports().catch(() => []),
      ]);

      setScenarios(scList);
      if (scList.length > 0) {
        const def = scList.find(s => s.is_default) || scList[0];
        setActiveScenarioId(def.id);
      }
      setCatchment(cData);
      setBoundaryGeoJson(bGeo);
      setRiverGeoJson(rGeo);
      setVillages(vList);
      setSensors(sList);
      setShelters(shList);
      setRoads(rdList);
      setWeather(wData);
      setPrediction(pData);
      setDamageReport(dmgData);
      setAlerts(aList);
      setReports(repList);
    } catch (e) {
      console.error('Error loading initial data', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle Scenario Switch
  const handleScenarioChange = async (newScenarioId: string) => {
    setActiveScenarioId(newScenarioId);
    try {
      await switchScenario(newScenarioId);
      // Reload refreshed telemetry, prediction, and damage data
      const [sList, pData, dmgData, aList] = await Promise.all([
        fetchSensors(),
        fetchLatestPrediction(),
        fetchDownstreamDamage('CATCH-DIKRONG-01', newScenarioId),
        fetchAlerts()
      ]);
      setSensors(sList);
      setPrediction(pData);
      setDamageReport(dmgData);
      setAlerts(aList);
    } catch (e) {
      console.error('Failed to switch scenario', e);
    }
  };

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  const riskCategory = prediction?.risk_category || activeScenario?.risk_category || 'Low';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onScenarioChange={handleScenarioChange}
        userRole={userRole}
        onRoleChange={setUserRole}
        riskCategory={riskCategory}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activePage={activePage}
          onPageSelect={setActivePage}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activePage === 'landing' && (
            <LandingPage
              onNavigate={setActivePage}
              activeScenario={activeScenario}
            />
          )}

          {activePage === 'dashboard' && (
            <MainDashboard
              catchment={catchment}
              boundaryGeoJson={boundaryGeoJson}
              riverGeoJson={riverGeoJson}
              villages={villages}
              sensors={sensors}
              shelters={shelters}
              roads={roads}
              weather={weather}
              prediction={prediction}
              damageReport={damageReport}
              activeScenario={activeScenario}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'monitoring' && (
            <LiveMonitoring
              sensors={sensors}
              onRefresh={async () => {
                const s = await fetchSensors();
                setSensors(s);
              }}
            />
          )}

          {activePage === 'prediction' && (
            <FloodPrediction
              prediction={prediction}
              onPredictionUpdated={setPrediction}
            />
          )}

          {activePage === 'simulation' && (
            <FloodSimulation
              scenarios={scenarios}
              activeScenario={activeScenario}
              boundaryGeoJson={boundaryGeoJson}
              riverGeoJson={riverGeoJson}
              villages={villages}
              sensors={sensors}
              shelters={shelters}
              roads={roads}
              onScenarioSwitched={handleScenarioChange}
              onNavigateToDamage={() => setActivePage('damage')}
              onNavigateToEvacuation={() => setActivePage('evacuation')}
            />
          )}

          {activePage === 'damage' && (
            <DownstreamDamage
              damageReport={damageReport}
            />
          )}

          {activePage === 'evacuation' && (
            <EvacuationPlanner
              villages={villages}
              shelters={shelters}
              roads={roads}
              boundaryGeoJson={boundaryGeoJson}
              riverGeoJson={riverGeoJson}
            />
          )}

          {activePage === 'alerts' && (
            <AlertsHub
              alerts={alerts}
              reports={reports}
              userRole={userRole}
              onAlertsUpdated={async () => {
                const a = await fetchAlerts();
                setAlerts(a);
              }}
              onReportsUpdated={async () => {
                const r = await fetchReports();
                setReports(r);
              }}
            />
          )}

          {activePage === 'admin' && (
            <AdminConsole />
          )}

          {activePage === 'info' && (
            <ProjectInfo />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
