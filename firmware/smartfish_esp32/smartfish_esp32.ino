#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "A INTERNET UTILIZADA";
const char* WIFI_PASS = "SENHA DA REDE UTILIZADA ";

const char* SUPABASE_URL = "A URL DO SEU SUPABASE";
const char* SUPABASE_KEY = "SEU SUPABASE KEY";

const int PINO_PH = 34;
const float TENSAO_NEUTRA = 1.26;
const float FATOR_ESCALA = 5.70;

void setup() {
  Serial.begin(115200);
  pinMode(PINO_PH, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado!");
}

float lerPHCalibrado() {
  long soma = 0;
  for (int i = 0; i < 20; i++) {
    soma += analogRead(PINO_PH);
    delay(20);
  }
  float adcMedio = soma / 20.0;
  float tensao = adcMedio * (3.3 / 4095.0);
  float ph = 7.0 + ((TENSAO_NEUTRA - tensao) * FATOR_ESCALA);

  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;
  return ph;
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float phAtual = lerPHCalibrado();

    HTTPClient http;
    http.begin(SUPABASE_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    String payload = "{\"tanque_id\": 1, \"ph\": " + String(phAtual, 2) + "}";

    int httpCode = http.POST(payload);

    if (httpCode == 201) {
      Serial.println("Sucesso [201] -> Enviado: " + payload);
    } else {
      Serial.print("Erro no envio HTTP: ");
      Serial.println(httpCode);
      Serial.println(http.getString());
    }

    http.end();
  } else {
    Serial.println("Wi-Fi desconectado. Tentando reconectar...");
    WiFi.reconnect();
  }

  delay(5000);
}
