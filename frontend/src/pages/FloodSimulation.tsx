import React, { useState, useEffect } from 'react';
import {
  Waves, Play, CheckCircle2, AlertCircle, Clock, Droplets,
  ArrowRight, Cpu, Download, Sliders, ShieldAlert, Compass,
  Layers, Info, FileCode, Check, RefreshCw
} from 'lucide-react';
import { SimulationScenario, HECRASEngineInfo, HECRASResults } from '../types';
import {
  runHECRAS2DSimulation, fetchHECRASJobStatus, fetchHECRASJobResults,
  fetchHECRASEngineInfo, applyHECRASToImpact, exportHECRASProject
} from '../services/api';
import { MapView } from '../components/MapView';

interface FloodSimulationProps {
  scenarios: SimulationScenario[];
  activeScenario?: SimulationScenario;
  boundaryGeoJson?: any;
  riverGeoJson?: any;
  villages?: any[];
  sensors?: any[];
  shelters?: any[];
  roads?: any[];
  onScenarioSwitched: (scenarioId: string) => void;
  onNavigateToDamage?: () => void;
  onNavigateToEvacuation?: () => void;
}

export const FloodSimulation: React.FC<FloodSimulationProps> = ({
  scenarios,
  activeScenario,
  boundaryGeoJson,
  riverGeoJson,
  villages = [],
  sensors = [],
  shelters = [],
  roads = [],
  onScenarioSwitched,
  onNavigateToDamage,
  onNavigateToEvacuation
}) => {
  // Engine info state
  const [engineInfo, setEngineInfo] = useState<HECRASEngineInfo | null>(null);

  // Boundary condition & parameter states
  const [inflowDischarge, setInflowDischarge] = useState<number>(activeScenario?.river_discharge_cumecs || 1450);
  const [manningNChannel, setManningNChannel] = useState<number>(0.038);
  const [manningNFloodplain, setManningNFloodplain] = useState<number>(0.065);
  const [equationSet, setEquationSet] = useState<string>('DIFFUSION_WAVE');
  const [enableBreach, setEnableBreach] = useState<boolean>(false);
  const [durationHours, setDurationHours] = useState<number>(6.0);

  // Simulation execution states
  const [simulationJob, setSimulationJob] = useState<any>(null);
  const [simulationResults, setSimulationResults] = useState<HECRASResults | null>(null);
  const [activeTimestepIndex, setActiveTimestepIndex] = useState<number>(2);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportedFiles, setExportedFiles] = useState<Record<string, string> | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<string>('dikrong_2d.p01');

  // Load HEC-RAS Engine info on mount
  useEffect(() => {
    fetchHECRASEngineInfo()
      .then(setEngineInfo)
      .catch(console.error);
  }, []);

  // Update discharge when scenario changes
  useEffect(() => {
    if (activeScenario) {
      setInflowDischarge(activeScenario.river_discharge_cumecs);
    }
  }, [activeScenario]);

  const handleLaunchSimulation = async () => {
    setIsRunning(true);
    setSimulationResults(null);
    setApplySuccessMessage(null);

    try {
      const job = await runHECRAS2DSimulation({
        catchment_id: 'CATCH-DIKRONG-01',
        scenario_id: activeScenario?.id,
        custom_inflow_discharge_cumecs: inflowDischarge,
        manning_n_channel: manningNChannel,
        manning_n_floodplain: manningNFloodplain,
        equation_set: equationSet,
        computation_interval_sec: 60,
        simulation_duration_hours: durationHours,
        enable_embankment_breach: enableBreach,
        solver_mode: 'AUTO'
      });

      setSimulationJob(job);

      // Poll job progress every 500ms
      const pollInterval = setInterval(async () => {
        try {
          const status = await fetchHECRASJobStatus(job.job_id);
          setSimulationJob(status);

          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setIsRunning(false);
            const results = await fetchHECRASJobResults(job.job_id);
            setSimulationResults(results);
          } else if (status.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsRunning(false);
          }
        } catch (e) {
          clearInterval(pollInterval);
          setIsRunning(false);
        }
      }, 500);
    } catch (e) {
      console.error('Failed to launch simulation', e);
      setIsRunning(false);
    }
  };

  const handleApplyToImpactPipeline = async () => {
    if (!simulationJob?.job_id) return;
    try {
      const res = await applyHECRASToImpact(simulationJob.job_id);
      setApplySuccessMessage(res.message || 'HEC-RAS 2D output successfully applied to downstream impact & evacuation routing!');
      setTimeout(() => setApplySuccessMessage(null), 6000);
    } catch (e) {
      console.error('Failed to apply to impact pipeline', e);
    }
  };

  const handleExportProject = async () => {
    try {
      const data = await exportHECRASProject({
        catchmentId: 'CATCH-DIKRONG-01',
        peakDischarge: inflowDischarge,
        manningNChannel: manningNChannel,
        manningNFloodplain: manningNFloodplain,
        equationSet: equationSet,
        enableBreach: enableBreach
      });
      setExportedFiles(data.files);
      setExportModalOpen(true);
    } catch (e) {
      console.error('Failed to export project', e);
    }
  };

  // Extract active timestep polygons
  const activeTimestep = simulationResults?.simulation_timesteps?.[activeTimestepIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <span>HEC-RAS 2D Hydraulic Flood Propagation Engine</span>
        </h1>
        <p className="text-xs text-slate-400">
          Hydrodynamic shallow-water solver modeling unsteady flood wave crests, 2D inundation depths, and downstream arrival times
        </p>
      </div>

      {/* Main Grid: Parameters on Left, Results & GIS Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Setup & Boundary Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Boundary Hydrograph Setup
          </span>

          {/* Preset Scenario Select */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Pre-configured Flood Scenario:</label>
            <select
              value={activeScenario?.id}
              onChange={(e) => {
                onScenarioSwitched(e.target.value);
                const sc = scenarios.find(s => s.id === e.target.value);
                if (sc) setInflowDischarge(sc.river_discharge_cumecs);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              {scenarios.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.river_discharge_cumecs} m³/s - {sc.risk_category})
                </option>
              ))}
            </select>
          </div>

          {/* Upstream Boundary Inflow Discharge */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Upstream Peak Discharge Q:</span>
              <span className="text-cyan-400 font-bold">{inflowDischarge.toFixed(0)} m³/s</span>
            </div>
            <input
              type="range"
              min="150"
              max="4500"
              step="50"
              value={inflowDischarge}
              onChange={(e) => setInflowDischarge(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Baseflow (150 m³/s)</span>
              <span>100-Yr Crest (4,500 m³/s)</span>
            </div>
          </div>

          {/* Manning's n Roughness Controls */}
          <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
              Manning's Roughness Coefficients (n)
            </div>

            {/* Main Channel n */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Main River Channel n:</span>
                <span className="text-white font-mono font-bold">{manningNChannel.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.020"
                max="0.080"
                step="0.002"
                value={manningNChannel}
                onChange={(e) => setManningNChannel(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Floodplain n */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Overbank Floodplain n:</span>
                <span className="text-white font-mono font-bold">{manningNFloodplain.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.035"
                max="0.150"
                step="0.005"
                value={manningNFloodplain}
                onChange={(e) => setManningNFloodplain(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Equation Scheme Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Hydrodynamic Equations:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEquationSet('DIFFUSION_WAVE')}
                className={`p-2 rounded-lg text-xs font-semibold border text-left transition cursor-pointer ${
                  equationSet === 'DIFFUSION_WAVE'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Diffusion Wave</div>
                <div className="text-[10px] opacity-80 mt-0.5">Fast Inundation Spread</div>
              </button>

              <button
                type="button"
                onClick={() => setEquationSet('FULL_MOMENTUM_SWE')}
                className={`p-2 rounded-lg text-xs font-semibold border text-left transition cursor-pointer ${
                  equationSet === 'FULL_MOMENTUM_SWE'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Full SWE (SWE-EM)</div>
                <div className="text-[10px] opacity-80 mt-0.5">High Velocity & Supercritical</div>
              </button>
            </div>
          </div>

          {/* Engine Indicator */}
          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
            <div>Solver Engine: <strong className="text-white">Calibrated 2D Hydrodynamic Solver</strong></div>
            <div className="text-[10px] text-slate-500 mt-0.5">HEC-RAS COM Automation & Shallow Water Diffusion Wave</div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleLaunchSimulation}
            disabled={isRunning}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Solving 2D Hydrodynamics...' : 'Execute 2D Simulation'}</span>
          </button>
        </div>

        {/* Right 2 Columns: Execution Console, Results Envelope, GIS Map */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress / Execution Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulation Execution Monitor</span>
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono">
                {simulationJob?.solver_type || 'HEC-RAS 2D Adapter'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Status: <strong className="text-white">{simulationJob?.status || 'READY'}</strong></span>
                <span className="text-[#C1A0AC] font-bold">{simulationJob ? `${simulationJob.progress_percent}%` : '0%'}</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-[#F0D9E4] h-full rounded-full transition-all duration-300"
                  style={{ width: `${simulationJob?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-slate-950 font-mono text-[11px] text-slate-400 p-3 rounded-lg border border-slate-800 h-28 overflow-y-auto">
              {simulationJob?.log_output ? (
                <pre className="whitespace-pre-wrap leading-relaxed">{simulationJob.log_output}</pre>
              ) : (
                <div className="text-slate-600">
                  HEC-RAS 2D hydraulic solver standby. Configure inflow discharge and parameters, then click 'Execute HEC-RAS 2D Simulation'.
                </div>
              )}
            </div>
          </div>

          {/* Results Display */}
          {simulationResults && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  Hydrodynamic 2D Output Envelope
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calculation Converged</span>
                </span>
              </div>

              {/* Stat Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Max Flood Depth</div>
                  <div className="text-sm font-bold text-red-400">{simulationResults.max_flood_depth_m} m</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Flooded Extent</div>
                  <div className="text-sm font-bold text-white">{simulationResults.flooded_area_sq_km} km²</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Wave Celerity</div>
                  <div className="text-sm font-bold text-cyan-400">{simulationResults.wave_celerity_kmh} km/h</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Nirjuli Gorge Depth</div>
                  <div className="text-sm font-bold text-amber-400">{simulationResults.reach_depths?.nirjuli_m || 0} m</div>
                </div>
              </div>

              {/* Dynamic Time-Step Unsteady Hydrograph Scrubber */}
              {simulationResults.simulation_timesteps && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Unsteady Flood Wave Hydrograph Playback:</span>
                    <span className="text-cyan-400 font-bold">
                      T + {simulationResults.simulation_timesteps[activeTimestepIndex]?.timestep_hrs} hrs ({simulationResults.simulation_timesteps[activeTimestepIndex]?.flood_stage})
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={simulationResults.simulation_timesteps.length - 1}
                    value={activeTimestepIndex}
                    onChange={(e) => setActiveTimestepIndex(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px] text-slate-400 pt-1">
                    {simulationResults.simulation_timesteps.map((ts, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTimestepIndex(idx)}
                        className={`p-1.5 rounded text-left transition border ${
                          activeTimestepIndex === idx
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div>T+{ts.timestep_hrs}h</div>
                        <div className="truncate text-[9px] opacity-80">{ts.flood_stage.split(' ')[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* GIS Map with 2D Inundation and Velocity Vectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wide">
                  <span className="flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>2D Floodplain Inundation & Velocity Vector Map</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Leaflet GIS Layer</span>
                </div>

                <MapView
                  boundaryGeoJson={boundaryGeoJson}
                  riverGeoJson={riverGeoJson}
                  villages={villages}
                  sensors={sensors}
                  shelters={shelters}
                  roads={roads}
                  floodPolygons={simulationResults.flood_polygons}
                  velocityVectors={simulationResults.velocity_vectors}
                  height="460px"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HEC-RAS 6.x Export Project Modal */}
      {exportModalOpen && exportedFiles && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">USACE HEC-RAS 6.x Project Bundle Export</h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Close
              </button>
            </div>

            {/* File Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 space-x-2">
              {Object.keys(exportedFiles).map(filename => (
                <button
                  key={filename}
                  onClick={() => setActiveFileTab(filename)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t border-t border-x transition ${
                    activeFileTab === filename
                      ? 'bg-slate-900 text-cyan-400 border-slate-700'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  {filename}
                </button>
              ))}
            </div>

            {/* File Content Box */}
            <div className="p-4 flex-1 overflow-y-auto">
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {exportedFiles[activeFileTab]}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Import these files directly into desktop USACE HEC-RAS 6.x.</span>
              <button
                onClick={() => {
                  const blob = new Blob([exportedFiles[activeFileTab]], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = activeFileTab;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {activeFileTab}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloodSimulation;
