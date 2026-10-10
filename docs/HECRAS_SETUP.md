# HEC-RAS 2D Integration & Fallback Hydrodynamic Model

## Overview
HydroGuard features an enterprise dual-engine simulation architecture:
1. **Native HEC-RAS 2D Simulation Engine**: Invoked when the USACE Hydrologic Engineering Center's River Analysis System (HEC-RAS 6.x) is installed on the host operating system.
2. **Calibrated 2D Hydrodynamic Fallback Engine**: Executed automatically when native HEC-RAS is absent or when running in lightweight cloud environments.

## Native HEC-RAS Setup (Windows)
1. Download and install HEC-RAS 6.4.1 or later from the official USACE website.
2. Locate the installation binary (typically `C:\Program Files (x86)\HEC\HEC-RAS\6.4.1\Ras.exe`).
3. Set the environment variable in `.env`:
   ```env
   HECRAS_PATH=C:\Program Files (x86)\HEC\HEC-RAS\6.4.1\Ras.exe
   ```
4. Verify detection via API:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```
   Look for `"hecras_engine": "NATIVE_HECRAS_DETECTED"`.

## Calibrated Fallback Hydrodynamic Model
When HEC-RAS is not present on the host system:
- HydroGuard dynamically invokes `app.services.fallback_simulator.FallbackHydrodynamicSimulator`.
- This engine solves 2D diffusive wave flood wave propagation over the Dikrong valley reach using channel geometry and digital elevation constraints.
- Output GeoJSON polygons, depth grids, velocity vectors, and peak wave arrival times are generated.
- All fallback results are transparently tagged in API and UI with:
  ```
  PROVENANCE: SIMULATED — FALLBACK MODEL
  ```
- **Integrity Rule**: HydroGuardver falsely misrepresents fallback results as native HEC-RAS computations.
