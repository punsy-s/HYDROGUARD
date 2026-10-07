import React from 'react';
import { Building2, Users, AlertTriangle, AlertOctagon, Car, ShieldAlert, HeartPulse } from 'lucide-react';
import { DamageReport } from '../types';

interface DownstreamDamageProps {
  damageReport: DamageReport | null;
}

export const DownstreamDamage: React.FC<DownstreamDamageProps> = ({ damageReport }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-red-400" />
          <span>Downstream Impact & Demographic Exposure Assessment</span>
        </h1>
        <p className="text-xs text-slate-400">
          Spatial GIS intersection of 2D hydraulic flood envelopes with census demographics, road passability, and lifeline bridges
        </p>
      </div>

      {/* High-level Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Exposed Population</span>
            <Users className="w-4 h-4 text-[#C1A0AC]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {damageReport ? damageReport.total_exposed_population.toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Citizens in simulated flood corridor
          </div>
        </div>

        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>High Vulnerability Groups</span>
            <HeartPulse className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {damageReport ? (damageReport.vulnerable_elderly_count + damageReport.vulnerable_children_count).toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {damageReport?.vulnerable_elderly_count || 0} elderly • {damageReport?.vulnerable_children_count || 0} children
          </div>
        </div>

        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Submerged Roadways</span>
            <Car className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {damageReport ? damageReport.total_flooded_roads_km : 0} km
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {damageReport?.inundated_roads_count || 0} road corridors with waterlogging
          </div>
        </div>

        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Compromised Bridges</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {damageReport ? damageReport.severed_bridges.length : 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Critical crossings overtopped / scoured
          </div>
        </div>
      </div>

      {/* Affected Settlements Table */}
      <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Settlement Impact Matrix
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            [CENSUS-CALIBRATED ESTIMATE]
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16131F]/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#806C79]">
              <tr>
                <th className="py-2.5 px-3">Village / Township</th>
                <th className="py-2.5 px-3">District</th>
                <th className="py-2.5 px-3">Max Flood Depth</th>
                <th className="py-2.5 px-3">Wave Arrival</th>
                <th className="py-2.5 px-3">Exposed Citizens</th>
                <th className="py-2.5 px-3">Action Priority</th>
                <th className="py-2.5 px-3">Designated Shelter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {damageReport?.affected_villages && damageReport.affected_villages.length > 0 ? (
                damageReport.affected_villages.map((v) => {
                  const isImmediate = v.priority.toLowerCase().includes('immediate') || v.priority.toLowerCase().includes('extreme');
                  return (
                    <tr key={v.village_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-white">{v.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{v.district}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${v.flood_depth_m > 1.5 ? 'text-red-400' : 'text-amber-400'}`}>
                          {v.flood_depth_m} m
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#C1A0AC] font-semibold">{v.estimated_arrival_hrs} hrs</td>
                      <td className="py-2.5 px-3">
                        <div>{v.exposed_population.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">
                          {v.vulnerable_elderly} eld • {v.vulnerable_children} chd
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isImmediate ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {v.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{v.recommended_shelter_id || 'SHELTER-01'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No downstream settlements currently in simulated flood inundation zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submerged Roads & Cutoff Bridges Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Inundated Roads */}
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Submerged Road Corridors
            </span>
            <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded font-semibold">
              Filter: Depth &gt; 0.30m
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {damageReport?.inundated_roads && damageReport.inundated_roads.length > 0 ? (
              damageReport.inundated_roads.map((r) => (
                <div key={r.road_id} className="bg-[#16131F]/60 p-3 rounded-lg border border-[#806C79] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{r.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.is_passable ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Submerged Depth: <strong className="text-white">{r.water_depth_m}m</strong> • {r.recommended_action}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 py-3 text-center">All road corridors clear of floodwater.</div>
            )}
          </div>
        </div>

        {/* Compromised Bridges */}
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-3 shadow-sm">
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Critical Bridge Crossings Status
          </span>

          <div className="space-y-2 text-xs">
            {damageReport?.severed_bridges && damageReport.severed_bridges.length > 0 ? (
              damageReport.severed_bridges.map((b) => (
                <div key={b.infrastructure_id} className="bg-red-950/30 border border-red-500/40 p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300">{b.name}</span>
                    <span className="text-[10px] font-extrabold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                      SEVERED
                    </span>
                  </div>
                  <p className="text-[11px] text-red-200">{b.hazard}</p>
                  <div className="text-[10px] text-slate-400">Status: {b.status}</div>
                </div>
              ))
            ) : (
              <div className="bg-[#16131F]/60 p-4 rounded-lg border border-[#806C79] text-center text-slate-400">
                All Dikrong and tributary bridge structures operational and structurally sound.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
