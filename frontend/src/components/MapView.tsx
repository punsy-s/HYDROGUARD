import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, EyeOff, Navigation, ZoomIn, ZoomOut, ArrowUpRight } from 'lucide-react';
import { Village, Sensor, Shelter, EvacuationRouteOption, HECRASVelocityVector } from '../types';

interface MapViewProps {
  boundaryGeoJson?: any;
  riverGeoJson?: any;
  villages?: Village[];
  sensors?: Sensor[];
  shelters?: Shelter[];
  roads?: any[];
  floodPolygons?: any[];
  velocityVectors?: HECRASVelocityVector[];
  selectedRoute?: EvacuationRouteOption | null;
  onSelectVillage?: (village: Village) => void;
  onSelectShelter?: (shelter: Shelter) => void;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  boundaryGeoJson,
  riverGeoJson,
  villages = [],
  sensors = [],
  shelters = [],
  roads = [],
  floodPolygons = [],
  velocityVectors = [],
  selectedRoute = null,
  onSelectVillage,
  onSelectShelter,
  height = '560px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer group refs
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const riverLayerRef = useRef<L.LayerGroup | null>(null);
  const floodLayerRef = useRef<L.LayerGroup | null>(null);
  const velocityLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const villagesLayerRef = useRef<L.LayerGroup | null>(null);
  const sensorsLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer visibility toggles
  const [layersVisible, setLayersVisible] = useState({
    boundary: true,
    river: true,
    flood: true,
    velocity: true,
    roads: true,
    villages: true,
    sensors: true,
    shelters: true,
  });

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centroid of Dikrong River Basin: 27.12 N, 93.80 E
    const map = L.map(mapContainerRef.current, {
      center: [27.12, 93.80],
      zoom: 11,
      zoomControl: false,
    });

   const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
   if (!mapTilerKey) {
    console.error('Missing VITE_MAPTILER_KEY in frontend/.env');
  }
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
   {
     attribution:
      'Tiles &copy; Esri',
      maxZoom: 19,
    }
  ).addTo(map);


    // Initialize LayerGroups
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    riverLayerRef.current = L.layerGroup().addTo(map);
    floodLayerRef.current = L.layerGroup().addTo(map);
    velocityLayerRef.current = L.layerGroup().addTo(map);
    roadsLayerRef.current = L.layerGroup().addTo(map);
    villagesLayerRef.current = L.layerGroup().addTo(map);
    sensorsLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Catchment Boundary
  useEffect(() => {
    if (!boundaryLayerRef.current || !boundaryGeoJson) return;
    boundaryLayerRef.current.clearLayers();

    if (layersVisible.boundary) {
      L.geoJSON(boundaryGeoJson, {
        style: {
          color: '#38bdf8',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#0284c7',
          fillOpacity: 0.06
        }
      }).addTo(boundaryLayerRef.current);
    }
  }, [boundaryGeoJson, layersVisible.boundary]);

  // Update River Network
  useEffect(() => {
    if (!riverLayerRef.current || !riverGeoJson) return;
    riverLayerRef.current.clearLayers();

    if (layersVisible.river) {
      L.geoJSON(riverGeoJson, {
        style: (feat) => ({
          color: feat?.properties?.reach_type === 'Mainstream' ? '#0ea5e9' : '#38bdf8',
          weight: feat?.properties?.reach_type === 'Mainstream' ? 4 : 2,
          opacity: 0.85
        }),
        onEachFeature: (feat, layer) => {
          layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #1758f0;">
              <strong>${feat.properties.name}</strong><br/>
              Length: ${feat.properties.length_km} km<br/>
              Manning's n: ${feat.properties.manning_n}<br/>
              Danger Level: ${feat.properties.danger_level_m}m
            </div>
          `);
        }
      }).addTo(riverLayerRef.current);
    }
  }, [riverGeoJson, layersVisible.river]);

  // Update Flood Inundation Polygons
  useEffect(() => {
    if (!floodLayerRef.current) return;
    floodLayerRef.current.clearLayers();

    if (layersVisible.flood && floodPolygons.length > 0) {
      floodPolygons.forEach((fp) => {
        const coords = fp.coordinates || [];
        if (coords.length > 2) {
          // Convert [lon, lat] to [lat, lon]
          const latlngs: L.LatLngExpression[] = coords.map((c: number[]) => [c[1], c[0]]);
          const depth = fp.max_depth_m || 1.0;
          const fillColor = depth > 1.8 ? '#ef4444' : depth > 0.8 ? '#f97316' : '#eab308';

          const polygon = L.polygon(latlngs, {
            color: fillColor,
            weight: 2,
            fillColor: fillColor,
            fillOpacity: 0.45
          }).addTo(floodLayerRef.current!);

          polygon.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
              <strong>HEC-RAS 2D Inundation Zone</strong><br/>
              Reach: <strong>${fp.reach || 'Dikrong Basin'}</strong><br/>
              Max Water Depth: <span style="color:${fillColor}; font-weight:bold;">${depth}m</span><br/>
              Flow Velocity: ${fp.velocity_mps || 'N/A'} m/s<br/>
              Wave Arrival: ${fp.arrival_time_hrs || 1.5} hrs<br/>
              Hazard Level: <strong>${fp.hazard_rating || fp.severity || 'Critical'}</strong>
            </div>
          `);
        }
      });
    }
  }, [floodPolygons, layersVisible.flood]);

  // Update Velocity Vectors
  useEffect(() => {
    if (!velocityLayerRef.current) return;
    velocityLayerRef.current.clearLayers();

    if (layersVisible.velocity && velocityVectors.length > 0) {
      velocityVectors.forEach((v) => {
        const speed = v.velocity_mps || 1.0;
        const color = speed > 3.0 ? '#ef4444' : speed > 1.5 ? '#f97316' : '#06b6d4';
        
        const arrowHtml = `
          <div style="transform: rotate(${v.direction_deg}deg); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: rgba(15,23,42,0.85); border: 1.5px solid ${color}; border-radius: 50%; box-shadow: 0 0 6px ${color}66;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </div>
        `;

        const icon = L.divIcon({
          html: arrowHtml,
          className: 'custom-velocity-arrow',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([v.latitude, v.longitude], { icon }).addTo(velocityLayerRef.current!);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <strong>2D Flow Velocity Vector</strong><br/>
            Reach: <strong>${v.reach}</strong><br/>
            Magnitude: <span style="color: ${color}; font-weight: bold;">${speed.toFixed(2)} m/s (${(speed * 3.6).toFixed(1)} km/h)</span><br/>
            Flow Direction: ${v.direction_deg}° Azimuth<br/>
            Vector Components: u = ${v.u_mps} m/s, v = ${v.v_mps} m/s
          </div>
        `);
      });
    }
  }, [velocityVectors, layersVisible.velocity]);

  // Update Roads Layer
  useEffect(() => {
    if (!roadsLayerRef.current) return;
    roadsLayerRef.current.clearLayers();

    if (layersVisible.roads && roads.length > 0) {
      roads.forEach((r) => {
        const coords = r.coordinates || [];
        if (coords.length > 1) {
          const latlngs: L.LatLngExpression[] = coords.map((c: number[]) => [c[1], c[0]]);
          const isClosed = r.is_closed || (r.current_water_depth_m > 0.30);
          const color = isClosed ? '#ef4444' : r.current_water_depth_m > 0.05 ? '#f59e0b' : '#10b981';

          const line = L.polyline(latlngs, {
            color,
            weight: isClosed ? 3 : 2.5,
            dashArray: isClosed ? '4, 4' : undefined,
            opacity: 0.8
          }).addTo(roadsLayerRef.current!);

          line.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
              <strong>${r.name}</strong><br/>
              Type: ${r.road_type}<br/>
              Status: <span style="color: ${color}; font-weight: bold;">${isClosed ? 'CLOSED / FLOODED' : 'PASSABLE'}</span><br/>
              Water Depth: ${r.current_water_depth_m || 0.0}m
            </div>
          `);
        }
      });
    }
  }, [roads, layersVisible.roads]);

  // Update Villages Layer
  useEffect(() => {
    if (!villagesLayerRef.current) return;
    villagesLayerRef.current.clearLayers();

    if (layersVisible.villages && villages.length > 0) {
      villages.forEach((v) => {
        const isHighRisk = v.flood_prone_zone.toLowerCase().includes('critical') || v.flood_prone_zone.toLowerCase().includes('high');
        const color = isHighRisk ? '#ef4444' : '#38bdf8';

        const marker = L.circleMarker([v.latitude, v.longitude], {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(villagesLayerRef.current!);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 160px;">
            <strong>${v.name}</strong><br/>
            Elevation: ${v.elevation_m}m<br/>
            Population: ${v.total_population.toLocaleString()} (${v.vulnerable_elderly} elderly)<br/>
            Zone: <span style="color: ${isHighRisk ? '#dc2626' : '#0284c7'}; font-weight: bold;">${v.flood_prone_zone}</span><br/>
            Contact: ${v.contact_person || 'Panchayat'} (${v.contact_phone || 'N/A'})
          </div>
        `);

        marker.on('click', () => {
          if (onSelectVillage) onSelectVillage(v);
        });
      });
    }
  }, [villages, layersVisible.villages, onSelectVillage]);

  // Update Sensors Layer
  useEffect(() => {
    if (!sensorsLayerRef.current) return;
    sensorsLayerRef.current.clearLayers();

    if (layersVisible.sensors && sensors.length > 0) {
      sensors.forEach((s) => {
        const isOffline = s.status === 'OFFLINE';
        const color = isOffline ? '#94a3b8' : '#eab308';

        const marker = L.circleMarker([s.latitude, s.longitude], {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(sensorsLayerRef.current!);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 180px;">
            <strong>${s.name}</strong><br/>
            Device ID: <code>${s.device_id}</code><br/>
            Status: <span style="color: ${isOffline ? '#64748b' : '#16a34a'}; font-weight: bold;">${s.status}</span><br/>
            Battery: ${s.battery_level_pct}%<br/>
            ${s.latest_reading ? `
              <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;"/>
              Rainfall: <strong>${s.latest_reading.rainfall_mm} mm</strong><br/>
              River Stage: <strong>${s.latest_reading.water_level_m} m</strong><br/>
              Soil Moisture: <strong>${s.latest_reading.soil_moisture_pct}%</strong>
            ` : '<em>No recent readings</em>'}
          </div>
        `);
      });
    }
  }, [sensors, layersVisible.sensors]);

  // Update Shelters Layer
  useEffect(() => {
    if (!sheltersLayerRef.current) return;
    sheltersLayerRef.current.clearLayers();

    if (layersVisible.shelters && shelters.length > 0) {
      shelters.forEach((sh) => {
        const avail = Math.max(0, sh.total_capacity - sh.current_occupancy);
        const marker = L.circleMarker([sh.latitude, sh.longitude], {
          radius: 8,
          fillColor: '#10b981',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(sheltersLayerRef.current!);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 180px;">
            <strong>${sh.name}</strong><br/>
            Elevation: <strong>${sh.elevation_m}m (Safe Ridge)</strong><br/>
            Available Capacity: <strong>${avail} / ${sh.total_capacity}</strong><br/>
            Status: ${sh.status}<br/>
            Food Stock: ${sh.food_stock_days} days<br/>
            Medical: ${sh.medical_facilities || 'First Aid'}
          </div>
        `);

        marker.on('click', () => {
          if (onSelectShelter) onSelectShelter(sh);
        });
      });
    }
  }, [shelters, layersVisible.shelters, onSelectShelter]);

  // Update Selected Evacuation Route
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (selectedRoute && selectedRoute.waypoints.length > 1) {
      const latlngs: L.LatLngExpression[] = selectedRoute.waypoints.map(c => [c[1], c[0]]);
      
      // Glowing cyan route polyline
      const line = L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 5,
        opacity: 0.9,
      }).addTo(routeLayerRef.current);

      // Fit map bounds to route
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
      }
    }
  }, [selectedRoute]);

  const toggleLayer = (layerName: keyof typeof layersVisible) => {
    setLayersVisible(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#806C79] shadow-lg bg-[#4A3F4B]   " style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Layer Control Widget */}
      <div className="absolute top-3 right-3 z-[1000] bg-[#4A3F4B]   /90 backdrop-blur border border-[#806C79]/80 rounded-lg p-2.5 shadow-xl text-xs space-y-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-slate-300 pb-1 border-b border-[#806C79]">
          <Layers className="w-3.5 h-3.5 text-[#C1A0AC]" />
          <span>GIS Layers</span>
        </div>
        
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
          <button 
            onClick={() => toggleLayer('boundary')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.boundary ? 'text-[#C1A0AC] bg-[#F0D9E4]/10' : 'text-slate-500'}`}
          >
            <span>Catchment</span>
          </button>
          <button 
            onClick={() => toggleLayer('river')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.river ? 'text-[#C1A0AC] bg-[#F0D9E4]/10' : 'text-slate-500'}`}
          >
            <span>River Reach</span>
          </button>
          <button 
            onClick={() => toggleLayer('flood')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.flood ? 'text-red-400 bg-red-500/10' : 'text-slate-500'}`}
          >
            <span>Flood 2D</span>
          </button>
          <button 
            onClick={() => toggleLayer('velocity')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.velocity ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500'}`}
          >
            <span>2D Velocity</span>
          </button>
          <button 
            onClick={() => toggleLayer('roads')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.roads ? 'text-[#20C7A2] bg-[#20C7A2]/10' : 'text-slate-500'}`}
          >
            <span>Road Status</span>
          </button>
          <button 
            onClick={() => toggleLayer('villages')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.villages ? 'text-white bg-slate-800' : 'text-slate-500'}`}
          >
            <span>Villages</span>
          </button>
          <button 
            onClick={() => toggleLayer('sensors')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.sensors ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500'}`}
          >
            <span>IoT Sensors</span>
          </button>
          <button 
            onClick={() => toggleLayer('shelters')}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition ${layersVisible.shelters ? 'text-[#20C7A2] bg-[#20C7A2]/10' : 'text-slate-500'}`}
          >
            <span>Safe Shelters</span>
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#4A3F4B]   /90 backdrop-blur border border-[#806C79]/80 rounded-lg p-2.5 text-[11px] shadow-xl text-slate-300 space-y-1">
        <div className="font-semibold text-slate-400 text-[10px] uppercase">Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
          <span>Inundation Depth &gt; 1.0m (Hazard)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
          <span>2D Flow Velocity Vector (m/s)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>IoT Hydro-Met Telemetry Station</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Safe Emergency Relief Shelter</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-0.5 bg-cyan-400 inline-block"></span>
          <span>Recommended Safe Evacuation Path</span>
        </div>
      </div>
    </div>
  );
};
