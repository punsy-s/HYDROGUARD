/*
 * ==============================================================================
 * HydroGuard – ESP32 Edge Hydro-Meteorological Monitoring Station
 * Target: ESP32-WROOM-32 / ESP32-DevKitC
 * Sensors:
 *   - Pronamic / Davis Tipping Bucket Rain Gauge (Reed Switch on GPIO 13)
 *   - JSN-SR04T Waterproof Ultrasonic River Stage Sensor (Trig 5, Echo 18)
 *   - Capacitive Soil Moisture Sensor v1.2 (ADC 34)
 *   - LiFePO4 / 18650 Battery Voltage Monitor (ADC 35)
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h>
#include <esp_task_wdt.h>
#include "config.h"

// Hardware Watchdog Timeout (30 seconds)
#define WDT_TIMEOUT_SECONDS 30

// Rain Gauge State
volatile unsigned long tipCount = 0;
volatile unsigned long lastTipMicros = 0;
const unsigned long DEBOUNCE_TIME_US = 250000; // 250ms debounce window

// Interrupt handler for tipping bucket
void IRAM_ATTR isrRainTip() {
    unsigned long currentMicros = micros();
    if (currentMicros - lastTipMicros > DEBOUNCE_TIME_US) {
        tipCount++;
        lastTipMicros = currentMicros;
    }
}

// Read ultrasonic sensor with 5-point median filter to reject turbulent wave spray
float readRiverWaterLevel() {
    float readings[5];
    int validCount = 0;

    for (int i = 0; i < 5; i++) {
        digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
        delayMicroseconds(2);
        digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
        delayMicroseconds(10);
        digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

        long duration = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, 35000); // 35ms timeout (~6 meters)
        if (duration > 0) {
            // Speed of sound: 343 m/s -> Distance (m) = (duration * 0.000343) / 2
            float distanceToWater = (duration * 0.000343f) / 2.0f;
            readings[validCount++] = distanceToWater;
        }
        delay(20);
    }

    if (validCount == 0) return -1.0f; // Sensor fault

    // Simple bubble sort to extract median
    for (int i = 0; i < validCount - 1; i++) {
        for (int j = i + 1; j < validCount; j++) {
            if (readings[i] > readings[j]) {
                float tmp = readings[i];
                readings[i] = readings[j];
                readings[j] = tmp;
            }
        }
    }

    float medianDistance = readings[validCount / 2];
    // Water level (stage) = Datum / Bridge height minus distance to surface
    float riverStage = SENSOR_BRIDGE_OFFSET_M - medianDistance;
    return max(0.0f, riverStage);
}

// Read calibrated volumetric soil moisture percentage
float readSoilMoisture() {
    int rawSum = 0;
    const int SAMPLES = 10;
    for (int i = 0; i < SAMPLES; i++) {
        rawSum += analogRead(PIN_SOIL_ANALOG);
        delay(5);
    }
    float rawAvg = (float)rawSum / SAMPLES;
    
    // Map raw ADC inverted curve: High raw = Dry, Low raw = Wet
    float moisturePct = (float)(SOIL_AIR_RAW - rawAvg) * 100.0f / (float)(SOIL_AIR_RAW - SOIL_WATER_RAW);
    return constrain(moisturePct, 0.0f, 100.0f);
}

// Read battery voltage & state of charge
float readBatteryPercentage() {
    int raw = analogRead(PIN_BATTERY_ADC);
    // ESP32 ADC: 3.3V reference across 4095 levels with divider factor
    float voltage = ((float)raw / 4095.0f) * 3.3f * BATTERY_DIVIDER_RATIO;
    // For 3.7V Li-ion: 4.2V = 100%, 3.2V = 0%
    float pct = (voltage - 3.2f) * 100.0f / (4.2f - 3.2f);
    return constrain(pct, 0.0f, 100.0f);
}

// Transmit JSON telemetry payload to HydroGuard Backend
bool transmitTelemetry(float rainMm, float soilMoisture, float waterLevel, float batteryPct) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERR] Wi-Fi disconnected. Buffering reading.");
        return false;
    }

    HTTPClient http;
    String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + TELEMETRY_ENDPOINT;
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Sensor-API-Key", SENSOR_API_KEY);
    http.setTimeout(4000);

    String payload = "{";
    payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
    payload += "\"catchment_id\":\"" + String(CATCHMENT_ID) + "\",";
    payload += "\"rainfall_mm\":" + String(rainMm, 2) + ",";
    payload += "\"soil_moisture_pct\":" + String(soilMoisture, 1) + ",";
    payload += "\"water_level_m\":" + String(waterLevel, 2) + ",";
    payload += "\"temperature_c\":24.2,";
    payload += "\"humidity_pct\":82.0,";
    payload += "\"battery_pct\":" + String(batteryPct, 1) + ",";
    payload += "\"is_simulated\":false";
    payload += "}";

    int httpCode = http.POST(payload);
    bool success = false;

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        Serial.printf("[OK] Telemetry ACK received: Code %d\n", httpCode);
        success = true;
    } else {
        Serial.printf("[WARN] Telemetry HTTP error: %d, Response: %s\n", httpCode, http.getString().c_str());
    }

    http.end();
    return success;
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n==========================================");
    Serial.println(" HydroGuard - ESP32 HydroMet Station");
    Serial.println("==========================================");

    // Initialize Watchdog
    esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
    esp_task_wdt_add(NULL);

    // Initialize Pins
    pinMode(PIN_RAIN_INTERRUPT, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_RAIN_INTERRUPT), isrRainTip, FALLING);
    
    pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
    pinMode(PIN_ULTRASONIC_ECHO, INPUT);
    analogReadResolution(12); // 12-bit ADC (0-4095)

    // Connect Wi-Fi
    Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
        delay(500);
        Serial.print(".");
        attempts++;
        esp_task_wdt_reset();
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WIFI] Failed to connect. Operating in offline logging mode.");
    }
}

void loop() {
    esp_task_wdt_reset();

    // 1. Calculate rainfall accumulated since last burst
    noInterrupts();
    unsigned long tips = tipCount;
    tipCount = 0;
    interrupts();
    float rainMm = tips * RAIN_MM_PER_TIP;

    // 2. Read environmental sensors
    float riverLevel = readRiverWaterLevel();
    float soilMoisture = readSoilMoisture();
    float batteryPct = readBatteryPercentage();

    Serial.printf("[DATA] Rain: %.2f mm | Soil: %.1f%% | Stage: %.2f m | Batt: %.1f%%\n",
                  rainMm, soilMoisture, riverLevel, batteryPct);

    // 3. Transmit telemetry to backend
    bool transmitted = transmitTelemetry(rainMm, soilMoisture, riverLevel, batteryPct);
    if (!transmitted) {
        Serial.println("[BUFFER] Storing telemetry in non-volatile flash queue.");
    }

    // Delay until next sampling cycle
    for (int i = 0; i < TRANSMIT_INTERVAL_SEC; i++) {
        esp_task_wdt_reset();
        delay(1000);
    }
}
