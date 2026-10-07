# HydroGuard System Architecture

## 1. High-Level Concept
HydroGuard operates on a cyclical 9-phase paradigm:
```
OBSERVE → MONITOR → PREDICT → SIMULATE → ASSESS IMPACT → PLAN EVACUATION → ALERT → VERIFY → LEARN
```

Rather than focusing solely on precipitation totals, HydroGuard evaluates the critical systemic threshold:
> *"Can the ground and river channel accommodate the incoming hydraulic volume before overbank spilling?"*

```
       +------------------------------------+
       | Field IoT Nodes (ESP32 / LoRa / IP)|
       | Rain Gauge + Ultrasonic + Moisture |
       +-----------------+------------------+
                         | (REST / MQTT)
                         v
       +------------------------------------+
       |        FastAPI Core Gateway        |
       | Telemetry, Auth, Routing, Alerts   |
       +--------+------------------+--------+
                |                  |
       +--------v-------+  +-------v--------+
       |   PostgreSQL   |  |   WebSocket    |
       |  PostGIS DB    |  | Event Broadcaster
       +--------+-------+  +-------+--------+
                |                  |
       +--------v------------------v--------+
       |  HEC-RAS 2D Adapter / Fallback     |
       |  Hydrodynamic Simulation Engine    |
       +-----------------+------------------+
                         |
       +-----------------v------------------+
       | React 19 + Leaflet GIS Operations  |
       | Command & Citizen Web Portals      |
       +------------------------------------+
```

## 2. Component Subsystems
1. **IoT Edge Telemetry Layer**: Real-time rainfall intensity (mm/h), ultrasonic river stage (m), capacitive soil saturation (%), and battery status.
2. **Hydrological Model**: Manning open-channel uniform flow equation $Q = \frac{1}{n} A R^{2/3} S^{1/2}$ calculating discharge, hydraulic depth, velocity, and Froude number.
3. **Multi-Criteria Prediction Engine**: 6-factor risk scoring algorithm generating risk classifications (NORMAL, LOW, MODERATE, HIGH, CRITICAL), warning lead times, and explainable feature weight decompositions.
4. **Hydrodynamic Simulation Engine**: HEC-RAS 2D simulation adapter generating unsteady flow geometry and hydrographs, coupled with a calibrated 2D diffusive wave fallback simulator generating depth grids, velocity vectors, and flood contours labeled `SIMULATED — FALLBACK MODEL`.
5. **Impact Assessment**: Spatial intersection of simulated flood extent polygons against villages, population census data, road networks, bridges, and hospitals.
6. **Evacuation Routing Engine**: Dijkstra/A* pathfinding with water depth road closures (>0.3m) and Greenshields traffic density speed degradation $v(k) = v_f (1 - k/k_j)$.
7. **Emergency Alert & SOS Triage**: Authorized incident commander broadcasts with mandatory `"CONFIRM EMERGENCY ALERT"` confirmation phrases, coupled with real-time WebSocket citizen distress dispatch.
