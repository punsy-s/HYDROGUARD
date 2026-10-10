#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// HydroGuard - ESP32 Node Configuration
// ==========================================

// Wi-Fi Credentials (or GSM / LoRaWAN gateway)
#define WIFI_SSID           "HydroGuard_Mesh_Gateway"
#define WIFI_PASSWORD       "DikrongSafe2026"

// Backend Telemetry Server
#define BACKEND_HOST        "192.168.1.100"  // Set to backend server IP
#define BACKEND_PORT        8000
#define TELEMETRY_ENDPOINT  "/api/sensors/readings"

// Sensor Identity & Authentication
#define DEVICE_ID           "ESP32-NIRJULI-03"
#define CATCHMENT_ID        "CATCH-DIKRONG-01"
#define SENSOR_API_KEY      "key_nirjuli_esp32_secret_9983"

// Hardware Pinout Definitions
// 1. Tipping Bucket Rain Gauge (Reed Switch Interrupt)
#define PIN_RAIN_INTERRUPT  13  // GPIO 13 with internal PULLUP
#define RAIN_MM_PER_TIP     0.2 // Standard Davis / Pronamic 0.2mm per tip

// 2. Ultrasonic River Stage Sensor (JSN-SR04T Waterproof)
#define PIN_ULTRASONIC_TRIG 5   // GPIO 5
#define PIN_ULTRASONIC_ECHO 18  // GPIO 18
#define SENSOR_BRIDGE_OFFSET_M 15.0 // Height of bridge/boom above river bottom bed

// 3. Capacitive Soil Moisture Sensor v1.2
#define PIN_SOIL_ANALOG     34  // GPIO 34 (ADC1_CH6 - Input Only)
#define SOIL_AIR_RAW        3200 // Raw ADC reading in dry air
#define SOIL_WATER_RAW      1450 // Raw ADC reading in 100% water

// 4. Battery Voltage Monitoring (100k / 100k Voltage Divider)
#define PIN_BATTERY_ADC     35  // GPIO 35 (ADC1_CH7)
#define BATTERY_DIVIDER_RATIO 2.0

// Deep Sleep and Sampling Cycle
#define TRANSMIT_INTERVAL_SEC  60    // 1-minute telemetry burst during warning
#define OFFLINE_BUFFER_CAPACITY 500  // Maximum buffered readings in SPIFFS

#endif // CONFIG_H
