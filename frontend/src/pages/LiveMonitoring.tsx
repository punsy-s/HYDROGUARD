import React, { useState } from 'react';
import { Activity, Battery, Wifi, AlertTriangle, RefreshCw, Cpu, CheckCircle2 } from 'lucide-react';
import { Sensor } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface LiveMonitoringProps {
  sensors: Sensor[];
  onRefresh: () => void;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ sensors, onRefresh }) => {
  const [selectedSensorId, setSelectedSensorId] = useState<string>(sensors[0]?.id || '');
  const selectedSensor = sensors.find(s => s.id === selectedSensorId) || sensors[0];

  // Mock 24-hour reading time series for selected sensor
  const mockSeriesData = [
    { time: '08:00', rain: 2.1, soil: 32, stage: 2.1 },
    { time: '09:00', rain: 4.5, soil: 38, stage: 2.4 },
    { time: '10:00', rain: 8.2, soil: 49, stage: 3.0 },
    { time: '11:00', rain: 14.5, soil: 62, stage: 4.1 },
    { time: '12:00', rain: 24.0, soil: 78, stage: 5.6 },
    { time: '13:00', rain: 38.5, soil: 86, stage: 7.2 },
    { time: '14:00', rain: selectedSensor?.latest_reading?.rainfall_mm || 18.0, soil: selectedSensor?.latest_reading?.soil_moisture_pct || 82, stage: selectedSensor?.latest_reading?.water_level_m || 6.8 },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Fleet Health Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center space-x-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>ESP32 IoT Hydro-Meteorological Monitoring Fleet</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry stream across upper, mid, and lower Dikrong river reaches
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-[#806C79] flex items-center space-x-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#C1A0AC]" />
          <span>Poll Gauges</span>
        </button>
      </div>

      {/* Sensor Station Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sensors.map((s) => {
          const isSelected = s.id === selectedSensorId;
          const isOffline = s.status === 'OFFLINE';
          return (
            <div
              key={s.id}
              onClick={() => setSelectedSensorId(s.id)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                isSelected 
                  ? 'bg-slate-800/90 border-[#806C79] shadow-md shadow-blue-500/10' 
                  : 'bg-[#4A3F4B]    border-[#806C79] hover:border-[#806C79]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{s.device_id}</span>
                  <div className="text-xs font-bold text-white mt-0.5 line-clamp-1">{s.name}</div>
                  <div className="text-[11px] text-slate-400">Elev: {s.elevation_m}m</div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse'}`} />
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#806C79]/80 grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Rain</div>
                  <div className="text-xs font-bold text-white">{s.latest_reading?.rainfall_mm || 0} mm</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Stage</div>
                  <div className="text-xs font-bold text-[#C1A0AC]">{s.latest_reading?.water_level_m || 0} m</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Soil</div>
                  <div className="text-xs font-bold text-amber-400">{s.latest_reading?.soil_moisture_pct || 0}%</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Battery className="w-3 h-3 text-[#20C7A2]" />
                  <span>{s.battery_level_pct}%</span>
                </span>
                <span>{s.is_simulated ? 'Simulated Telemetry' : 'Physical ESP32'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Sensor Detailed Telemetry Hydrographs */}
      {selectedSensor && (
        <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#806C79] pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">{selectedSensor.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F0D9E4]/10 text-[#C1A0AC] border border-[#806C79]/30">
                  {selectedSensor.device_id}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  [OBSERVED TELEMETRY]
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Coordinates: {selectedSensor.latitude.toFixed(4)}°N, {selectedSensor.longitude.toFixed(4)}°E • Elevation: {selectedSensor.elevation_m}m
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Heartbeat: <strong className="text-slate-200">Active</strong> ({selectedSensor.staleness_seconds}s ago)
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Rainfall Chart */}
            <div className="bg-[#16131F]/60 rounded-xl p-3 border border-[#806C79] space-y-2">
              <span className="text-xs font-semibold text-slate-300">Precipitation Rate (mm/hr)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSeriesData}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Bar dataKey="rain" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. River Stage Chart */}
            <div className="bg-[#16131F]/60 rounded-xl p-3 border border-[#806C79] space-y-2">
              <span className="text-xs font-semibold text-slate-300">River Water Stage (m)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockSeriesData}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 10]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="stage" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Soil Moisture Chart */}
            <div className="bg-[#16131F]/60 rounded-xl p-3 border border-[#806C79] space-y-2">
              <span className="text-xs font-semibold text-slate-300">Volumetric Soil Moisture (%)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockSeriesData}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="soil" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
