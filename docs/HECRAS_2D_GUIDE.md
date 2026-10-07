# 🌊 HydroGuard HEC-RAS 2D Hydraulic Modeling Guide

## 1. Overview

**HEC-RAS 2D** (Hydrologic Engineering Center - River Analysis System 2D) is the two-dimensional hydraulic simulation engine integrated into **HydroGuard**. Developed by the U.S. Army Corps of Engineers (USACE), HEC-RAS 2D solves the shallow-water hydrodynamic equations across a computational horizontal mesh to simulate flood depth, flow velocity, wave celerity, and flood inundation propagation.

In HydroGuard, HEC-RAS 2D powers the transition from hydrological rainfall-runoff forecasting to **hyper-local physical inundation and impact intelligence**:

```text
                  Upstream Telemetry & Hydrographs Q(t)
                                   ↓
                     HEC-RAS 2D Hydraulic Engine
       (Native HEC-RAS 6.x HDF5 or Calibrated 2D Hydrodynamic Solver)
                                   ↓
        Water Depth (h) • Flow Velocity (v) • Inundation Polygon
                                   ↓
                 Spatial GIS Overlay with Downstream Reaches
                                   ↓
          Affected Villages • Exposed Population • Submerged Roads
                                   ↓
           Traffic-Aware, Life-Safety Evacuation Routing
```

---

## 2. Supported Hydrodynamic Engines & Dual-Mode Execution

HydroGuard implements a **clean adapter interface** with full dual-mode execution to ensure that development environments and cloud servers function without requiring a Windows host or desktop HEC-RAS installation:

### Mode A: Native HEC-RAS 2D (`NativeHECRASAdapter`)
- **Host Requirement**: Windows or Linux host with USACE HEC-RAS 6.x (`Ras.exe` / `ras-compute`).
- **Configuration**: Set `ENABLE_HECRAS_NATIVE=true` and `HECRAS_EXE_PATH=C:\Program Files (x86)\HEC\HEC-RAS\6.4.1\Ras.exe` in `.env`.
- **Workflow**:
  1. Automatically builds project files (`.prj`, `.p01`, `.u01`, `.g01`).
  2. Executes unsteady flow computation.
  3. Parses binary HDF5 output (`.p01.hdf`) extracting cell water surface elevation (WSE), face velocities, arrival times, and mesh geometry.
  4. Generates GeoJSON spatial layers.
- **Provenance Tag**: `[HEC-RAS 2D Native HDF5 Engine]`.

### Mode B: Calibrated 2D Hydrodynamic Solver Fallback (`CalibratedHydrodynamicSolverAdapter`)
- **Host Requirement**: None (pure Python / Shapely / NumPy stack, runs on macOS, Linux, Windows, Docker).
- **Formulation**:
  - Solves 2D Saint-Venant shallow water equations and 2D diffusion-wave equations calibrated to the Dikrong River basin geometry (Sagalee Gorge $\to$ Doimukh Confluence $\to$ Nirjuli Bridge bottleneck $\to$ Pichola Embankment $\to$ Harmuti $\to$ Bihpuria Lowlands).
  - Open-channel normal depth: $y = \left(\frac{Q \cdot n}{W \cdot S_0^{1/2}}\right)^{3/5}$
  - Flow velocity: $V = \frac{Q}{W \cdot y}$
  - Froude number: $Fr = \frac{V}{\sqrt{g \cdot y}}$
  - Dynamic wave celerity: $c = \frac{5}{3} V_{mean}$
  - Defra / USACE Flood Hazard Rating: $HR = d \cdot (v + 0.5) + DF$
  - Multi-timestep unsteady wave propagation ($T+0.5h$ to $T+6.0h$).
- **Provenance Tag**: `[SIMULATED - Calibrated 2D Hydrodynamic Fallback]`.

> [!IMPORTANT]
> **Provenance Transparency**: Fallback demo results are never presented as native HEC-RAS executions. Metadata, API responses, and frontend badges clearly identify the active solver engine.

---

## 3. Downstream Impact & Evacuation Pipeline Connection

When a HEC-RAS 2D simulation is executed:
1. **Inundation Envelope**: 2D polygons representing water depths ($0.5m$, $1.5m$, $>2.0m$) and arrival times are generated.
2. **Velocity Field**: Directional flow vectors $(u, v)$ with speed in $m/s$ and flow azimuth are computed.
3. **Spatial Intersection**:
   - Compares inundation boundary with 8 census villages $\to$ exposed population, vulnerable demographic counts.
   - Compares inundation with critical lifelines (bridges, hospitals, substations) $\to$ overtopping hazard and scour vulnerability.
   - Compares with road network $\to$ roads with water depth $>0.30m$ (1 foot) are marked **CLOSED** (impassable for passenger vehicles).
4. **Evacuation Re-Routing**: Multi-target Dijkstra router computes safe transit corridors avoiding flooded roads and compromised bridges to high-ground relief shelters.

---

## 4. API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/simulations/hecras/engine-info` | `GET` | Returns host HEC-RAS availability, detected version, and supported equations |
| `/api/simulations/hecras/run` | `POST` | Launches an asynchronous 2D hydraulic flood simulation job |
| `/api/simulations/hecras/jobs/{job_id}` | `GET` | Retrieves job progress percentage, logs, and completion status |
| `/api/simulations/hecras/jobs/{job_id}/results` | `GET` | Retrieves full 2D hydraulic envelope, reach profiles, velocity vectors, and GeoJSON |
| `/api/simulations/hecras/jobs/{job_id}/apply-to-impact` | `POST` | Synchronizes 2D simulation output with downstream damage and evacuation routing |
| `/api/simulations/hecras/export-project` | `GET` | Generates and exports USACE HEC-RAS 6.x `.prj`, `.p01`, `.u01`, `.g01` files |

---

## 5. Exporting to Desktop HEC-RAS 6.x

HydroGuard allows exporting complete HEC-RAS 6.x project bundles:
1. Click **"Export HEC-RAS 6.x Project Bundle"** in the Flood Simulation tab.
2. Download `dikrong_2d.prj`, `dikrong_2d.p01`, `dikrong_2d.u01`, and `dikrong_2d.g01`.
3. Open USACE HEC-RAS $\to$ `File` $\to$ `Open Project` $\to$ Select `dikrong_2d.prj`.

---

## 6. Disclaimer

> [!CAUTION]
> Simulation outputs generated by HydroGuard are designed for decision-support, planning, and academic demonstration. Real emergency evacuation instructions must be confirmed by National / State Disaster Management Authorities (NDMA / SDMA).
