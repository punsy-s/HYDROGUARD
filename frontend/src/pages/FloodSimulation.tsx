import React, { useState } from 'react';
import { Waves, Play, CheckCircle2, AlertCircle, Clock, Droplets, ArrowRight } from 'lucide-react';
import { SimulationScenario } from '../types';
import { triggerSimulation, fetchSimulationStatus, fetchSimulationResults } from '../services/api';

interface FloodSimulationProps {
  scenarios: SimulationScenario[];
  activeScenario?: SimulationScenario;
  onScenarioSwitched: (scenarioId: string) => void;
}

export const FloodSimulation: React.FC<FloodSimulationProps> = ({
  scenarios,
  activeScenario,
  onScenarioSwitched
}) => {
  const [inflowDischarge, setInflowDischarge] = useState<number>(activeScenario?.river_discharge_cumecs || 1450);
  const [simulationJob, setSimulationJob] = useState<any>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [activeTimestepIndex, setActiveTimestepIndex] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleLaunchSimulation = async () => {
    setIsRunning(true);
    setSimulationResults(null);
    try {
      const job = await triggerSimulation('CATCH-DIKRONG-01', activeScenario?.id, inflowDischarge);
      setSimulationJob(job);

      // Poll job progress every 500ms
      const pollInterval = setInterval(async () => {
        try {
          const status = await fetchSimulationStatus(job.job_id);
          setSimulationJob(status);

          if (status.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setIsRunning(false);
            const results = await fetchSimulationResults(job.job_id);
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
      console.error(e);
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Waves className="w-5 h-5 text-[#C1A0AC]" />
          <span>HEC-RAS 2D Hydraulic Flood Propagation Engine</span>
        </h1>
        <p className="text-xs text-slate-400">
          Hydrodynamic shallow-water solver modeling unsteady flood wave crests, 2D inundation depths, and downstream arrival times
        </p>
      </div>

      {/* Simulation Controls & Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Setup & Boundary Controls */}
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Boundary Hydrograph Setup
          </span>

          {/* Scenario Select */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Select Flood Scenario:</label>
            <select
              value={activeScenario?.id}
              onChange={(e) => {
                onScenarioSwitched(e.target.value);
                const sc = scenarios.find(s => s.id === e.target.value);
                if (sc) setInflowDischarge(sc.river_discharge_cumecs);
              }}
              className="w-full bg-[#16131F] border border-[#806C79] rounded-lg p-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              {scenarios.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upstream Boundary Inflow Discharge */}
          <div className="space-y-2 bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Upstream Peak Discharge Q:</span>
              <span className="text-[#C1A0AC] font-bold">{inflowDischarge.toFixed(0)} m³/s</span>
            </div>
            <input
              type="range"
              min="200"
              max="4500"
              step="50"
              value={inflowDischarge}
              onChange={(e) => setInflowDischarge(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Baseflow (200 m³/s)</span>
              <span>100-Yr Peak (4,500 m³/s)</span>
            </div>
          </div>

          {/* Engine Indicator */}
          <div className="text-[11px] text-slate-400 bg-[#16131F]/40 p-2.5 rounded border border-[#806C79]/80">
            <div>Solver Engine: <strong className="text-white">Calibrated 2D Hydrodynamic Solver</strong></div>
            <div className="text-[10px] text-slate-500 mt-0.5">HEC-RAS COM Automation & Shallow Water Diffusion Wave</div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleLaunchSimulation}
            disabled={isRunning}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-[#F0D9E4] text-white font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Solving 2D Hydrodynamics...' : 'Execute 2D Simulation'}</span>
          </button>
        </div>

        {/* Right 2 Cols: Simulation Progress, 2D Depths & Timesteps */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress / Execution Console */}
          <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Simulation Execution Monitor
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                [SIMULATED - 2D HYDRAULIC]
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Status: <strong className="text-white">{simulationJob?.status || 'READY'}</strong></span>
                <span className="text-[#C1A0AC] font-bold">{simulationJob ? `${simulationJob.progress_percent}%` : '0%'}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F0D9E4] h-full rounded-full transition-all duration-300"
                  style={{ width: `${simulationJob?.progress_percent || 0}%` }}
                />
              </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-[#16131F] font-mono text-[11px] text-slate-400 p-3 rounded-lg border border-[#806C79] h-28 overflow-y-auto">
              {simulationJob?.log_output ? (
                <pre className="whitespace-pre-wrap">{simulationJob.log_output}</pre>
              ) : (
                <div className="text-slate-600">HEC-RAS 2D hydrodynamic solver ready. Click 'Execute 2D Simulation' to run unsteady flow model.</div>
              )}
            </div>
          </div>

          {/* Results Display */}
          {simulationResults && (
            <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#806C79] pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  Hydrodynamic 2D Output Envelope
                </span>
                <span className="text-xs text-[#20C7A2] font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Calculation Converged</span>
                </span>
              </div>

              {/* Stat Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#16131F] p-2.5 rounded-lg border border-[#806C79]">
                  <div className="text-[10px] text-slate-400">Max Flood Depth</div>
                  <div className="text-sm font-bold text-red-400">{simulationResults.max_flood_depth_m} m</div>
                </div>
                <div className="bg-[#16131F] p-2.5 rounded-lg border border-[#806C79]">
                  <div className="text-[10px] text-slate-400">Flooded Extent</div>
                  <div className="text-sm font-bold text-white">{simulationResults.flooded_area_sq_km} km²</div>
                </div>
                <div className="bg-[#16131F] p-2.5 rounded-lg border border-[#806C79]">
                  <div className="text-[10px] text-slate-400">Wave Celerity</div>
                  <div className="text-sm font-bold text-[#C1A0AC]">{simulationResults.wave_celerity_kmh} km/h</div>
                </div>
                <div className="bg-[#16131F] p-2.5 rounded-lg border border-[#806C79]">
                  <div className="text-[10px] text-slate-400">Nirjuli Gorge Depth</div>
                  <div className="text-sm font-bold text-amber-400">{simulationResults.reach_depths?.nirjuli_m || 0} m</div>
                </div>
              </div>

              {/* Timestep Playback Slider */}
              {simulationResults.simulation_timesteps && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Unsteady Flood Wave Hydrograph Playback:</span>
                    <span className="text-[#C1A0AC] font-bold">
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
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Surge Inception (T+0.5h)</span>
                    <span>Crest Inflow</span>
                    <span>Downstream Floodplain Spreading</span>
                    <span>Recession (T+6.0h)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
