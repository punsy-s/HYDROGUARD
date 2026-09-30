# ESP32 Edge Hydro-Meteorological Monitoring Station – Wiring & Setup Guide

**TerraGuard NE Flash Flood Early Warning Network**  
*Target Board: ESP32-WROOM-32 / DevKitC v4*

---

## 1. Hardware Bill of Materials (BOM)

| Component | Model / Spec | Purpose | Operating Voltage |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 (38-pin DevKit) | Core processing & telemetry | 3.3V / 5V USB |
| **Rain Gauge** | Pronamic / Davis Tipping Bucket (0.2mm) | Precipitation measurement | Contact closure (Reed) |
| **River Stage Sensor** | JSN-SR04T Waterproof Ultrasonic | River water surface elevation | 5V DC |
| **Soil Moisture** | Capacitive Soil Moisture Sensor v1.2 | Volumetric soil water content | 3.3V DC (Corrosion-free) |
| **Power Source** | 18650 LiFePO4 (2S 3000mAh) or 12V 7Ah SLA | Standalone field power | 3.2V - 12V |
| **Solar Panel & MPPT**| 10W Monocrystalline + TP4056/CN3791 | Continuous mountain charging | 6V - 18V Voc |
| **Enclosure** | IP67 Weatherproof Junction Box | Environmental protection | N/A |

---

## 2. Wiring Pinout Diagram

```
        +----------------------------------------------+
        |                 ESP32-DEVKIT                 |
        |                                              |
        | [GND] --------------------+                  |
        | [3V3] ----------------+   |                  |
        | [VIN/5V] ---------+   |   |                  |
        |                   |   |   |                  |
        | GPIO 13 [IN_PULLUP]   |   | <--- Tipping Bucket Rain Gauge (Pin 1)
        |                       |   + <--- Tipping Bucket Ground (Pin 2)
        |                       |   |
        | GPIO 5  [TRIG] -------|---| <--- JSN-SR04T Trig Pin
        | GPIO 18 [ECHO] -------|---| <--- JSN-SR04T Echo Pin (via 1k/2k divider)
        | [5V VIN] -------------+---| <--- JSN-SR04T VCC Pin
        | [GND] --------------------+ <--- JSN-SR04T GND Pin
        |                       |   |
        | GPIO 34 [ADC1_CH6] ---|---| <--- Capacitive Soil Vout (Analog)
        | [3V3] ----------------+---| <--- Capacitive Soil VCC
        | [GND] --------------------+ <--- Capacitive Soil GND
        |                           |
        | GPIO 35 [ADC1_CH7] -------+ <--- Battery Divider Midpoint (100k/100k)
        +----------------------------------------------+
```

### Ultrasonic Echo Level Shifter Note
> [!IMPORTANT]
> The JSN-SR04T module operates on 5V. Its `ECHO` output is 5V logic. To protect the ESP32 3.3V GPIO 18, use a simple resistor voltage divider:
> `JSN_ECHO` -> `1.8kΩ` resistor -> `GPIO 18` -> `3.3kΩ` resistor -> `GND`.

---

## 3. Field Calibration

### A. Tipping Bucket Rain Gauge
1. Standard tipping calibration is **0.20 mm of rain per tip**.
2. Run 100 mL of water through the funnel droplet-by-droplet.
3. Count tips: For a standard 200 mm diameter collector, 100 mL corresponds to:
   $$\text{Tips} = \frac{100 \text{ mL}}{\pi \times (10 \text{ cm})^2 \times 0.02 \text{ cm}} \approx 15.9 \approx 16 \text{ tips}$$
4. Adjust leveling screws on the base until the bubble level is centered.

### B. Capacitive Soil Moisture Sensor v1.2
1. **Air Reading (Dry)**: Hold probe in dry ambient air. Note raw ADC value (`SOIL_AIR_RAW` $\approx 3200$).
2. **Water Reading (Saturated)**: Submerge probe in water up to the marked limit line (do not submerge electronics). Note raw ADC value (`SOIL_WATER_RAW` $\approx 1450$).
3. Update `config.h` constants accordingly.

### C. JSN-SR04T Ultrasonic River Gauge
1. Mount the transducer firmly to the underside of the bridge girder or a cantilever mast over the river thalweg.
2. Measure vertical height from riverbed datum to transducer face ($H_{\text{bridge}}$).
3. The instantaneous water level is:
   $$\text{River Stage } (m) = H_{\text{bridge}} - D_{\text{measured}}$$

---

## 4. Flashing Firmware via PlatformIO / Arduino IDE

1. Install Arduino IDE (or PlatformIO in VS Code).
2. Install **ESP32 by Espressif Systems** via Board Manager.
3. Select Board: `ESP32 Dev Module`.
4. Set Flash Frequency: `80MHz`, Upload Speed: `921600`.
5. Open `esp32_terraguard_node.ino`.
6. Update `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_HOST`, and `SENSOR_API_KEY` in `config.h`.
7. Click **Upload**. Open Serial Monitor at **115200 baud** to verify live telemetry transmissions.
