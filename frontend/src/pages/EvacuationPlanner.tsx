import React, { useState, useEffect } from 'react';
import { 
  Navigation, ShieldCheck, MapPin, Clock, 
  ArrowRight, CheckCircle2, AlertTriangle, Building, Car 
} from 'lucide-react';
import { Village, Shelter, EvacuationResponse, EvacuationRouteOption } from '../types';
import { fetchEvacuationRoutes } from '../services/api';
import { MapView } from '../components/MapView';

interface EvacuationPlannerProps {
  villages: Village[];
  shelters: Shelter[];
  roads: any[];
  boundaryGeoJson: any;
  riverGeoJson: any;
}

export const EvacuationPlanner: React.FC<EvacuationPlannerProps> = ({
  villages,
  shelters,
  roads,
  boundaryGeoJson,
  riverGeoJson
}) => {
  const [selectedVillageId, setSelectedVillageId] = useState<string>(villages[1]?.id || 'VIL-02'); // Nirjuli default
  const [targetShelterId, setTargetShelterId] = useState<string>('');
  const [evacResponse, setEvacResponse] = useState<EvacuationResponse | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRouteOption | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleComputeRoutes = async (vilId: string, shelterId?: string) => {
    setLoading(true);
    try {
      const data = await fetchEvacuationRoutes(vilId, shelterId || undefined);
      setEvacResponse(data);
      setSelectedRoute(data.primary_recommendation || (data.routes.length > 0 ? data.routes[0] : null));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (villages.length > 0) {
      handleComputeRoutes(selectedVillageId, targetShelterId);
    }
  }, [selectedVillageId, targetShelterId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-[#C1A0AC]" />
          <span>Traffic-Aware Safe Evacuation Route Engine</span>
        </h1>
        <p className="text-xs text-slate-400">
          Safety-first Dijkstra path optimization strictly excluding inundated roads (&gt;0.30m) and compromised bridges, with Greenshields traffic capacity impedance
        </p>
      </div>

      {/* Origin & Shelter Selectors Bar */}
      <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Origin Village */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium shrink-0">Origin:</span>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="bg-[#16131F] border border-[#806C79] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer w-full sm:w-56"
            >
              {villages.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} (Elev: {v.elevation_m}m)
                </option>
              ))}
            </select>
          </div>

          {/* Target Shelter Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Building className="w-4 h-4 text-[#20C7A2] shrink-0" />
            <span className="text-xs text-slate-400 font-medium shrink-0">Destination:</span>
            <select
              value={targetShelterId}
              onChange={(e) => setTargetShelterId(e.target.value)}
              className="bg-[#16131F] border border-[#806C79] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer w-full sm:w-60"
            >
              <option value="">Auto-Assign (Capacity Aware)</option>
              {shelters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.total_capacity - s.current_occupancy} spots)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => handleComputeRoutes(selectedVillageId, targetShelterId)}
          disabled={loading}
          className="w-full md:w-auto px-5 py-2 rounded-lg bg-cyan-600 hover:bg-[#F0D9E4] text-white font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50"
        >
          <span>{loading ? 'Optimizing Routes...' : 'Recalculate Safe Paths'}</span>
        </button>
      </div>

      {/* Main Grid: Route Options vs Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Alternative Route Cards & Turn-by-Turn */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Safe Feasible Routes ({evacResponse?.routes.length || 0})
            </span>
            <span className="text-[10px] text-[#20C7A2] bg-[#20C7A2]/10 px-2 py-0.5 rounded font-semibold border border-[#20C7A2]/20">
              Zero Unsafe Inundations
            </span>
          </div>

          {/* Route Options List */}
          <div className="space-y-3">
            {evacResponse?.routes && evacResponse.routes.length > 0 ? (
              evacResponse.routes.map((rt, idx) => {
                const isSelected = selectedRoute?.route_id === rt.route_id;
                return (
                  <div
                    key={rt.route_id}
                    onClick={() => setSelectedRoute(rt)}
                    className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-[#4A3F4B]    border-[#806C79] hover:border-[#806C79]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white">{rt.name}</span>
                          {rt.is_recommended && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F0D9E4]/20 text-[#C1A0AC] border border-cyan-500/30">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Shelter: {rt.shelter_name} (Elev: {rt.shelter_elevation_m}m)
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#C1A0AC]">{rt.estimated_travel_time_min} mins</span>
                    </div>

                    {/* Route Metric Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1 border-t border-[#806C79]/80">
                      <div className="bg-[#16131F]/60 p-1.5 rounded">
                        <div className="text-slate-500">Distance</div>
                        <div className="font-bold text-slate-200">{rt.distance_km} km</div>
                      </div>
                      <div className="bg-[#16131F]/60 p-1.5 rounded">
                        <div className="text-slate-500">Max Water Depth</div>
                        <div className="font-bold text-[#20C7A2]">{rt.max_flood_depth_on_route_m} m</div>
                      </div>
                      <div className="bg-[#16131F]/60 p-1.5 rounded">
                        <div className="text-slate-500">Available Beds</div>
                        <div className="font-bold text-white">{rt.shelter_available_capacity}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center space-x-1">
                        <Car className="w-3 h-3 text-slate-400" />
                        <span>{rt.congestion_level}</span>
                      </span>
                      <span className="text-[#20C7A2] font-semibold">{rt.safety_rating}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-6 text-center text-xs text-slate-400 space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                <p>Computing safe connectivity graph. All roads being screened for flood clearance.</p>
              </div>
            )}
          </div>

          {/* Turn-by-Turn Navigation for Selected Route */}
          {selectedRoute && (
            <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C1A0AC]" />
                <span>Turn-by-Turn Navigation</span>
              </span>

              <div className="space-y-2 text-xs">
                {selectedRoute.turn_by_turn.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-[#C1A0AC] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="text-[10px] text-slate-400 bg-[#4A3F4B]   /60 border border-[#806C79] p-3 rounded-lg leading-relaxed">
            {evacResponse?.safety_disclaimer}
          </div>
        </div>

        {/* Right 2 Cols: Interactive Map highlighting selected route */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Active Evacuation Corridor Visualization
            </span>
            <span className="text-xs text-[#C1A0AC] font-medium">
              Glowing Line: Safe Transit Vector
            </span>
          </div>

          <MapView
            boundaryGeoJson={boundaryGeoJson}
            riverGeoJson={riverGeoJson}
            villages={villages}
            shelters={shelters}
            roads={roads}
            selectedRoute={selectedRoute}
            height="560px"
          />
        </div>
      </div>
    </div>
  );
};
