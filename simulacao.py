import time
import math
import random
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = "SUA_URL_SUPABASE"
SUPABASE_KEY = "SUA_SUPABASE_ANON_KEY"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

TEMPO_ENVIO = 10
CHANCE_CRISE = 0.05

estado_atual = {
    "temperatura": 26.2,
    "oxigenio": 6.2,
    "em_crise": False,
    "tempo_crise": 0
}

def calcular_ambiente_realista():
    global estado_atual

    agora = datetime.now()
    hora_decimal = agora.hour + (agora.minute / 60.0)

    temp_base = 25.5
    variacao_sol = 2.0 * math.sin(math.pi * (hora_decimal - 9) / 12)
    nova_temp = temp_base + variacao_sol + random.uniform(-0.15, 0.15)

    ox_base = 6.2
    ciclo_algas = 1.2 * math.sin(math.pi * (hora_decimal - 8) / 12)
    perda_calor = (nova_temp - 25.0) * 0.1
    novo_ox = ox_base + ciclo_algas - perda_calor + random.uniform(-0.1, 0.1)

    if not estado_atual["em_crise"]:
        if random.random() < CHANCE_CRISE:
            estado_atual["em_crise"] = True
            estado_atual["tempo_crise"] = random.randint(4, 8)
            print("\n⚠️ [ALERTA] EVENTO CAÓTICO INICIADO: Falha simulada na aeração!")

    if estado_atual["em_crise"]:
        novo_ox -= random.uniform(2.2, 3.0)
        estado_atual["tempo_crise"] -= 1
        if estado_atual["tempo_crise"] <= 0:
            estado_atual["em_crise"] = False
            print("\n✅ [SISTEMA] Aeração normalizada.")

    estado_atual["temperatura"] = round(nova_temp, 2)
    estado_atual["oxigenio"] = round(max(1.5, novo_ox), 2)

    return estado_atual

print("🌊 Iniciando Gêmeo Digital: Smart Fish PRO (Sincronizado com ESP32) 🌊")
print(f"Atualizando a cada {TEMPO_ENVIO} segundos...")
print("-" * 55)

while True:
    try:
        dados = calcular_ambiente_realista()
        hora_str = datetime.now().strftime("%H:%M:%S")
        status_crise = "🚨 [CRISE]" if dados["em_crise"] else "✅ [NORMAL]"

        pendentes = supabase.table("leituras_sensor").select("id").is_("temperatura", "null").execute()

        if pendentes.data and len(pendentes.data) > 0:
            supabase.table("leituras_sensor").update({
                "temperatura": dados["temperatura"],
                "oxigenio": dados["oxigenio"]
            }).is_("temperatura", "null").execute()
            print(f"[{hora_str}] 🔗 [UNIFICADO] {status_crise} Temp: {dados['temperatura']}°C | O2: {dados['oxigenio']} mg/L (+ pH real)")
        else:
            supabase.table("leituras_sensor").insert({
                "temperatura": dados["temperatura"],
                "oxigenio": dados["oxigenio"],
                "tanque_id": 1
            }).execute()
            print(f"[{hora_str}] 📡 [SIMULADO] {status_crise} Temp: {dados['temperatura']}°C | O2: {dados['oxigenio']} mg/L")

        time.sleep(TEMPO_ENVIO)

    except Exception as e:
        print(f"\n❌ ERRO DO SUPABASE: {e}\n")
        time.sleep(5)
