import React from 'react';
import { Info, BookOpen, AlertCircle, FileCheck, Mountain, Layers, ExternalLink } from 'lucide-react';

export const ProjectInfo: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Info className="w-5 h-5 text-blue-400" />
          <span>Project Methodology, Science & Engineering Disclaimers</span>
        </h1>
        <p className="text-xs text-slate-400">
          TerraGuard NE – Architectural specification, hydraulic formulas, and data provenance standards
        </p>
      </div>

      {/* Provenance Classification Standard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Truth & Data Provenance Standard</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          To ensure emergency incident commanders and citizens are never misled by simulated or unverified numbers, 
          every data element presented in TerraGuard NE is strictly classified under one of the following five tags:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 font-mono">[OBSERVED]</span>
            <p className="text-slate-400 text-[11px]">Real-time physical telemetry from field ESP32 edge stations, tipping buckets, and river stage sensors.</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-blue-400 font-mono">[FORECAST]</span>
            <p className="text-slate-400 text-[11px]">Numerical weather prediction from certified public meteorological providers (Open-Meteo ECMWF/GFS ensemble).</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 font-mono">[PREDICTED]</span>
            <p className="text-slate-400 text-[11px]">AI/ML and hydrological flash flood risk probability scores and calculated lead-time estimations.</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 font-mono">[SIMULATED]</span>
            <p className="text-slate-400 text-[11px]">HEC-RAS 2D shallow-water hydrodynamic flood depth contours, wave celerities, and arrival times.</p>
          </div>
        </div>
      </div>

      {/* Mathematical & Physical Foundations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Hydraulic & Traffic Engineering Equations</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-white">1. Manning's Open Channel Flow (River Stage):</div>
            <div className="font-mono text-cyan-400 text-[11px] py-1">Q = (1 / n) * A * R^(2/3) * S0^(1/2)</div>
            <p className="text-[11px] text-slate-400">
              Where n is Manning's roughness coefficient (0.038 for coarse mountain riverbed), A is cross-sectional area, R is hydraulic radius, and S0 is the energy slope (0.012 - 0.024 in foothill reach).
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-white">2. Greenshields Macroscopic Traffic Density Model (Evacuation Speed):</div>
            <div className="font-mono text-cyan-400 text-[11px] py-1">v(k) = v_free * (1 - k / k_jam)</div>
            <p className="text-[11px] text-slate-400">
              Penalizes arterial roadway speed as evacuating traffic volume approaches jam density, preventing the algorithm from routing entire populations into bottlenecks.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-white">3. Roadway Safety Threshold:</div>
            <p className="text-[11px] text-slate-400">
              According to FEMA and Indian Road Congress guidelines, passenger vehicles lose traction and risk buoyant sweep in flood depths exceeding <strong>0.30 meters (12 inches)</strong>. Any roadway with simulated depth &gt; 0.30m is strictly pruned from the evacuation graph.
            </p>
          </div>
        </div>
      </div>

      {/* Model Limitations & Disclaimer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 text-xs text-slate-400 shadow-sm">
        <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
          <AlertCircle className="w-4 h-4" />
          <span>Operational Limitations & Ethical Disclaimer</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          TerraGuard NE is designed as a decision-support platform for academic research, engineering hackathons, and emergency preparedness planning. Real-world flood evacuations must always adhere to verified directives from the National Disaster Management Authority (NDMA), State Disaster Management Authority (SDMA), and on-ground emergency first responders.
        </p>
      </div>
    </div>
  );
};
