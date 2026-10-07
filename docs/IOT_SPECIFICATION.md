# HydroGuard IoT Field Hardware & Ingestion Specification

## 1. Edge Node Architecture
HydroGuard edge telemetry nodes are designed around low-power ESP32 microcontrollers with solar harvesting and dual communication options (Wi-Fi/Cellular HTTP REST & LoRaWAN).

### Sensor Pinouts (ESP32 DevKit v1)
| Peripheral | Sensor Model | Interface | ESP32 GPIO | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Rain Gauge** | Misol Tipping Bucket | Digital Interrupt | `GPIO 13` | Falling edge interrupt (0.20 mm per bucket tip) |
| **Ultrasonic Stage** | JSN-SR04T Waterproof | Digital Pulse | `TRIG: GPIO 5`<br>`ECHO: GPIO 18` | Distance to water surface (20 cm - 600 cm range) |
| **Soil Saturation** | Capacitive Soil v1.2 | Analog ADC | `GPIO 34` | ADC1 Channel 6 (0 - 3.3V) |
| **Battery Monitor** | 100k/27k Divider | Analog ADC | `GPIO 35` | ADC1 Channel 7 (0 - 3.3V scaled from 0 - 15.5V) |
| **Status Indicator** | Surface LED | Digital Output | `GPIO 2` | Heartbeat & Wi-Fi status blinker |

## 2. Ingestion API Contract
- **Endpoint**: `POST /api/v1/sensors/telemetry`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Payload Schema**:
```json
{
  "sensor_id": "HG-DKR-R01",
  "rainfall_mm": 14.5,
  "river_stage_m": 6.85,
  "soil_moisture": 79.2,
  "battery_voltage": 3.92
}
```

## 3. Server Response
```json
{
  "status": "INGESTED",
  "sensor_id": "HG-DKR-R01",
  "recorded_at": "2026-10-01T12:20:00Z",
  "sensor_status": "WARNING",
  "rate_of_rise_m_hr": 0.65
}
```

Upon ingestion, the server evaluates stage thresholds (`warning_stage_m` and `danger_stage_m`), computes rate of rise from the previous timestamp, updates database records, and broadcasts a `TELEMETRY_UPDATE` event across all active WebSocket subscribers.
