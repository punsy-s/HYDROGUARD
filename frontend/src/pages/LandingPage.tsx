import React from 'react';
import { 
  ShieldAlert, Activity, Cpu, Waves, 
  Navigation, ArrowRight, CheckCircle2, AlertTriangle, Mountain, ShieldCheck 
} from 'lucide-react';
import { PageId } from '../components/Sidebar';
import { SimulationScenario } from '../types';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
  activeScenario?: SimulationScenario;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, activeScenario }) => {
  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-[#806C79] p-6 md:p-10 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F0D9E4]/10 border border-[#806C79]/30 text-[#C1A0AC] text-xs font-semibold">
            <Mountain className="w-3.5 h-3.5" />
            <span>Target Catchment: Dikrong River Basin, Eastern Himalayas</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            HydroGuard
          </h1>
          <p className="text-lg md:text-xl font-medium text-slate-300">
            Intelligent Flash Flood Prediction, Downstream Impact Simulation & Smart Evacuation System
          </p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
            A comprehensive, physics-informed disaster intelligence platform engineered for hilly terrains of India.
            Combines real-time ESP32 hydro-meteorological telemetry, Open-Meteo numerical forecasting, 
            HEC-RAS 2D hydraulic flood propagation, and traffic-constrained safe evacuation routing.
          </p>

          <div className="pt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-lg bg-[#F0D9E4] hover:bg-[#C1A0AC] text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <span>Launch Command Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('evacuation')}
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#806C79] font-semibold text-sm flex items-center space-x-2 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-[#C1A0AC]" />
              <span>Safe Evacuation Planner</span>
            </button>
          </div>
        </div>

        {/* Live Status Pill */}
        {activeScenario && (
          <div className="mt-6 md:mt-0 md:absolute md:top-8 md:right-8 bg-[#4A3F4B]   /90 border border-[#806C79] rounded-xl p-4 w-full md:w-72 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-[#806C79]">
              <span>Active Condition</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                activeScenario.risk_category === 'Critical' ? 'bg-red-500/20 text-red-400' :
                activeScenario.risk_category === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-[#20C7A2]'
              }`}>
                {activeScenario.risk_category}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="font-semibold text-white truncate">{activeScenario.name}</div>
              <div className="text-slate-400 text-[11px] leading-tight line-clamp-2">
                {activeScenario.description}
              </div>
              <div className="pt-2 flex justify-between text-[11px] text-slate-300">
                <span>Rain: {activeScenario.rainfall_intensity_mm_per_hr} mm/h</span>
                <span>Discharge: {activeScenario.river_discharge_cumecs} m³/s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Core Operational Philosophy */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide">
          Core Operational Philosophy
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            { step: '1. Predict', desc: 'AI & hydrological threshold modeling' },
            { step: '2. Monitor', desc: 'Real-time ESP32 sensor telemetry' },
            { step: '3. Simulate', desc: 'HEC-RAS 2D hydraulic wave solver' },
            { step: '4. Assess Impact', desc: 'Spatial GIS overlay with villages' },
            { step: '5. Evacuate', desc: 'Safety-first constrained routing' },
            { step: '6. Verify', desc: 'Ground truth field observations' },
            { step: '7. Learn', desc: 'Post-event model improvement' },
          ].map((item, idx) => (
            <div key={idx} className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-3 text-center space-y-1">
              <div className="text-xs font-bold text-[#C1A0AC]">{item.step}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div 
          onClick={() => onNavigate('monitoring')}
          className="bg-[#4A3F4B]    border border-[#806C79] hover:border-[#806C79]/50 rounded-xl p-5 space-y-3 cursor-pointer transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Real-Time IoT Telemetry</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Edge sensor stations equipped with tipping bucket rain gauges, JSN-SR04T ultrasonic river gauges, and capacitive soil moisture sensors transmit encrypted telemetry.
          </p>
          <div className="text-xs font-medium text-[#C1A0AC] flex items-center space-x-1 pt-1">
            <span>Explore Gauges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('simulation')}
          className="bg-[#4A3F4B]    border border-[#806C79] hover:border-[#806C79]/50 rounded-xl p-5 space-y-3 cursor-pointer transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-[#F0D9E4]/10 border border-cyan-500/20 flex items-center justify-center text-[#C1A0AC] group-hover:scale-105 transition">
            <Waves className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">HEC-RAS 2D Simulation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hydrodynamic modeling calculates 2D flood depths, flow velocities, and arrival times down the Dikrong reach (Manning's n = 0.038, slope = 28.4°).
          </p>
          <div className="text-xs font-medium text-[#C1A0AC] flex items-center space-x-1 pt-1">
            <span>Run Hydraulic Model</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('evacuation')}
          className="bg-[#4A3F4B]    border border-[#806C79] hover:border-[#806C79]/50 rounded-xl p-5 space-y-3 cursor-pointer transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-lg bg-[#20C7A2]/10 border border-[#20C7A2]/20 flex items-center justify-center text-[#20C7A2] group-hover:scale-105 transition">
            <Navigation className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Smart Evacuation Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Prioritizes human life safety over distance. Excludes roads submerged &gt; 0.30m or compromised bridges, applies Greenshields traffic impedance, and assigns safe shelters.
          </p>
          <div className="text-xs font-medium text-[#C1A0AC] flex items-center space-x-1 pt-1">
            <span>Plan Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
