import React, { useState } from 'react';
import { Cpu, AlertTriangle, Clock, Sliders, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { PredictionData } from '../types';
import { triggerPrediction } from '../services/api';

interface FloodPredictionProps {
  prediction: PredictionData | null;
  onPredictionUpdated: (newPred: PredictionData) => void;
}

export const FloodPrediction: React.FC<FloodPredictionProps> = ({ prediction, onPredictionUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    rainfall_intensity_mm_per_hr: 45.0,
    accumulated_24h_rainfall_mm: 120.0,
    forecast_6h_rainfall_mm: 50.0,
    soil_moisture_percent: 75.0,
    river_water_level_m: 6.5,
    rate_of_rise_m_per_hr: 0.8
  });

  const handleRunPrediction = async () => {
    setLoading(true);
    try {
      const res = await triggerPrediction({
        catchment_id: 'CATCH-DIKRONG-01',
        ...params
      });
      onPredictionUpdated(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const riskScore = prediction?.risk_score || 0.15;
  const riskCategory = prediction?.risk_category || 'Low';

  const getRiskColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-[#20C7A2] bg-[#20C7A2]/10 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-[#C1A0AC]" />
          <span>Flash Flood Risk Prediction Engine</span>
        </h1>
        <p className="text-xs text-slate-400">
          Physics-guided machine learning model combining Antecedent Precipitation Index, soil saturation dynamics, and kinematic wave surge
        </p>
      </div>

      {/* Main Prediction & Explainability Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Risk Score Gauge & Lead Time */}
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Calibrated Risk Score
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              [PREDICTED]
            </span>
          </div>

          {/* Large Circular/Bar Gauge */}
          <div className="text-center py-4 space-y-2">
            <div className="text-5xl font-black text-white tracking-tight">
              {(riskScore * 100).toFixed(0)}%
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getRiskColor(riskCategory)}`}>
              {riskCategory} Risk
            </div>
          </div>

          {/* Lead Time Display */}
          <div className="bg-[#16131F]/60 rounded-xl p-3 border border-[#806C79] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-[#C1A0AC]" />
              <div>
                <div className="text-xs font-semibold text-white">Estimated Warning Lead Time</div>
                <div className="text-[10px] text-slate-400">Time until peak crest reaches downstream fan</div>
              </div>
            </div>
            <div className="text-sm font-bold text-[#C1A0AC]">
              {prediction?.warning_lead_time_min ? `${prediction.warning_lead_time_min} mins` : 'N/A'}
            </div>
          </div>

          {/* Feature Contribution Breakdown */}
          <div className="space-y-2 pt-2 border-t border-[#806C79]">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span>Risk Driver Contributions</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C1A0AC]" />
            </div>

            <div className="space-y-2 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>Precipitation (Instant & Antecedent)</span>
                  <span className="text-white font-medium">{prediction?.rainfall_contribution_pct || 40}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#C1A0AC] h-full rounded-full" style={{ width: `${prediction?.rainfall_contribution_pct || 40}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>Soil Moisture Saturation</span>
                  <span className="text-white font-medium">{prediction?.soil_contribution_pct || 25}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${prediction?.soil_contribution_pct || 25}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>River Surge & Rise Rate</span>
                  <span className="text-white font-medium">{prediction?.river_contribution_pct || 25}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#F0D9E4] h-full rounded-full" style={{ width: `${prediction?.river_contribution_pct || 25}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>Terrain Slope (28.4° Mean)</span>
                  <span className="text-white font-medium">{prediction?.terrain_contribution_pct || 10}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${prediction?.terrain_contribution_pct || 10}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Interactive Parameter Sandbox & Explanation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Explanation Box */}
          <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Hydrological Assessment Explanation
            </span>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
              {prediction?.explanation || 'Awaiting prediction execution...'}
            </p>

            {/* Tactical Recommendations */}
            {prediction?.recommendations && prediction.recommendations.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-white">Recommended Emergency Actions:</span>
                <ul className="space-y-1 text-xs text-slate-400">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C1A0AC] shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Interactive Scenario Sandbox Sliders */}
          <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-[#C1A0AC]" />
                <span>Simulate Environmental Variables & Stress Test Model</span>
              </span>
              <button
                onClick={handleRunPrediction}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-[#F0D9E4] hover:bg-[#C1A0AC] text-white font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{loading ? 'Evaluating...' : 'Run Prediction'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Rain Intensity */}
              <div className="space-y-1 bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
                <div className="flex justify-between text-slate-400">
                  <span>Rainfall Intensity</span>
                  <span className="text-white font-bold">{params.rainfall_intensity_mm_per_hr} mm/hr</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={params.rainfall_intensity_mm_per_hr}
                  onChange={(e) => setParams({ ...params, rainfall_intensity_mm_per_hr: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Accumulated 24h */}
              <div className="space-y-1 bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
                <div className="flex justify-between text-slate-400">
                  <span>24h Accumulated Rainfall</span>
                  <span className="text-white font-bold">{params.accumulated_24h_rainfall_mm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="10"
                  value={params.accumulated_24h_rainfall_mm}
                  onChange={(e) => setParams({ ...params, accumulated_24h_rainfall_mm: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Soil Moisture */}
              <div className="space-y-1 bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
                <div className="flex justify-between text-slate-400">
                  <span>Volumetric Soil Moisture</span>
                  <span className="text-white font-bold">{params.soil_moisture_percent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={params.soil_moisture_percent}
                  onChange={(e) => setParams({ ...params, soil_moisture_percent: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* River Stage */}
              <div className="space-y-1 bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79]">
                <div className="flex justify-between text-slate-400">
                  <span>River Water Level</span>
                  <span className="text-white font-bold">{params.river_water_level_m} m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={params.river_water_level_m}
                  onChange={(e) => setParams({ ...params, river_water_level_m: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
