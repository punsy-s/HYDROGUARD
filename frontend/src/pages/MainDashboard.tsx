import React from 'react';
import {
  CloudRain,
  Waves,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Navigation,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { MapView } from '../components/MapView';
import {
  Catchment,
  Village,
  Sensor,
  Shelter,
  WeatherData,
  PredictionData,
  DamageReport,
  SimulationScenario,
} from '../types';
import { PageId } from '../components/Sidebar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MainDashboardProps {
  catchment: Catchment | null;
  boundaryGeoJson: any;
  riverGeoJson: any;
  villages: Village[];
  sensors: Sensor[];
  shelters: Shelter[];
  roads: any[];
  weather: WeatherData | null;
  prediction: PredictionData | null;
  damageReport: DamageReport | null;
  activeScenario?: SimulationScenario;
  onNavigate: (page: PageId) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  catchment,
  boundaryGeoJson,
  riverGeoJson,
  villages,
  sensors,
  shelters,
  roads,
  weather,
  prediction,
  damageReport,
  activeScenario,
  onNavigate,
}) => {
  // Hydrograph mock data representing stage rise
  const hydrographData = [
    { time: '10:00', stage: 2.4, danger: 8.5, warning: 7.0 },
    { time: '11:00', stage: 2.8, danger: 8.5, warning: 7.0 },
    { time: '12:00', stage: 3.5, danger: 8.5, warning: 7.0 },
    { time: '13:00', stage: 5.2, danger: 8.5, warning: 7.0 },
    {
      time: '14:00',
      stage: activeScenario?.midstream_gauge_m || 6.8,
      danger: 8.5,
      warning: 7.0,
    },
  ];

  const riskCat = prediction?.risk_category || 'Low';
  const riskColor =
    riskCat === 'Critical'
      ? 'red'
      : riskCat === 'High'
        ? 'amber'
        : 'emerald';

  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Flash Flood Risk Score"
          value={prediction ? `${(prediction.risk_score * 100).toFixed(0)}%` : '12%'}
          unit={riskCat.toUpperCase()}
          subtitle={
            prediction?.warning_lead_time_min
              ? `Lead time: ~${prediction.warning_lead_time_min} mins`
              : 'Stable baseline'
          }
          icon={AlertTriangle}
          color={riskColor}
          provenance="[PREDICTED]"
        />

        <StatCard
          title="Catchment Rainfall"
          value={weather ? weather.rainfall_intensity_mm_per_hr.toFixed(1) : '12.0'}
          unit="mm/h"
          subtitle={`24h Total: ${
            weather ? weather.accumulated_24h_rainfall_mm : 45
          } mm`}
          icon={CloudRain}
          color="blue"
          provenance={
            weather?.data_source_label.includes('Live')
              ? '[OBSERVED]'
              : '[FORECAST]'
          }
        />

        <StatCard
          title="Dikrong Peak River Stage"
          value={
            activeScenario
              ? activeScenario.midstream_gauge_m.toFixed(2)
              : '3.10'
          }
          unit="m"
          subtitle="Warning Level: 7.0m • Danger: 8.5m"
          icon={Waves}
          color={
            activeScenario && activeScenario.midstream_gauge_m > 7.0
              ? 'red'
              : 'emerald'
          }
          provenance="[OBSERVED / IOT]"
        />

        <StatCard
          title="Exposed Population"
          value={
            damageReport
              ? damageReport.total_exposed_population.toLocaleString()
              : '0'
          }
          unit="citizens"
          subtitle={`${
            damageReport ? damageReport.affected_villages_count : 0
          } settlements in 2D flood path`}
          icon={Users}
          color={
            damageReport && damageReport.total_exposed_population > 0
              ? 'red'
              : 'emerald'
          }
          provenance="[ESTIMATE]"
        />
      </div>

      {/* Main Map & Hydrograph Grid */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        {/* Interactive Map */}
        <section className="space-y-4 2xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-[#F0D9E4]/10">
                <Navigation className="h-5 w-5 text-[#C1A0AC]" />
              </div>

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                  Dikrong Catchment
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Geospatial Command Map
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full border border-[#806C79] bg-[#4A3F4B]    px-3 py-1.5 text-[11px] font-medium text-slate-400">
              Papum Pare & Lakhimpur Foothills • Leaflet 2D GIS
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#806C79] bg-[#4A3F4B]    p-2 shadow-xl shadow-black/10">
            <MapView
              boundaryGeoJson={boundaryGeoJson}
              riverGeoJson={riverGeoJson}
              villages={villages}
              sensors={sensors}
              shelters={shelters}
              roads={roads}
              floodPolygons={
                damageReport
                  ? damageReport.inundated_roads.map((r, i) => ({
                      coordinates: [
                        [93.744, 27.147],
                        [93.750, 27.143],
                        [93.746, 27.136],
                        [93.740, 27.139],
                        [93.744, 27.147],
                      ],
                      max_depth_m: r.water_depth_m,
                    }))
                  : []
              }
              height="520px"
            />
          </div>
        </section>

        {/* Right Side Panels */}
        <aside className="space-y-5">
          {/* Hydrograph Card */}
          <div className="rounded-2xl border border-[#806C79] bg-[#4A3F4B]   /80 p-5 shadow-lg shadow-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  River Water Stage
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Doimukh Gauge
                </p>
              </div>

              <span className="rounded-full border border-cyan-500/20 bg-[#F0D9E4]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#C1A0AC]">
                [OBSERVED]
              </span>
            </div>

            <div className="mt-5 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={hydrographData}
                  margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
                >
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    domain={[0, 12]}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />

                  <ReferenceLine
                    y={8.5}
                    label={{
                      value: 'Danger (8.5m)',
                      fill: '#ef4444',
                      fontSize: 10,
                    }}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                  />

                  <ReferenceLine
                    y={7.0}
                    label={{
                      value: 'Warning (7.0m)',
                      fill: '#f59e0b',
                      fontSize: 10,
                    }}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                  />

                  <Line
                    type="monotone"
                    dataKey="stage"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#38bdf8' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#806C79] pt-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Rate of Rise
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {activeScenario?.rate_of_rise_m_per_hr || 0.15} m/hr
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Upstream Lead Time
                </p>
                <p className="mt-1 text-sm font-semibold text-[#C1A0AC]">
                  ~{prediction?.warning_lead_time_min || 180} min
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Routing */}
          <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-slate-900 p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">
                  Emergency Routing
                </h2>
                <p className="mt-1 text-xs text-cyan-200/60">
                  Safe route planning
                </p>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-[#F0D9E4]/10 p-2.5">
                <Navigation className="h-5 w-5 text-[#C1A0AC]" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-300">
              Find safe high-ground evacuation routes avoiding submerged roads
              (&gt;0.30m) and compromised bridges.
            </p>

            <button
              onClick={() => onNavigate('evacuation')}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:bg-[#F0D9E4] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <span>Calculate Safe Evacuation Route</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Critical Settlements */}
          <div className="rounded-2xl border border-[#806C79] bg-[#4A3F4B]   /80 p-5 shadow-lg shadow-black/10">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Settlements Status
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Flood-prone areas
                </p>
              </div>

              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {villages.length}
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {villages.slice(0, 4).map(v => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="truncate text-xs font-medium text-slate-300">
                    {v.name}
                  </span>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      v.flood_prone_zone.toLowerCase().includes('critical')
                        ? 'border border-red-500/20 bg-red-500/10 text-red-400'
                        : 'border border-[#806C79] bg-slate-800/70 text-slate-400'
                    }`}
                  >
                    {v.flood_prone_zone.split('-')[0].trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};