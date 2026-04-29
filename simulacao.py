import math
import time
import random
from datetime import datetime
from supabase import create_client, Client

# --- CONFIGURAÇÕES DO SUPABASE ---
SUPABASE_URL = ""
SUPABASE_KEY = "" # Use a sua key anon/public

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def gerar_leitura_biologica():
    """
    Simula o comportamento de um tanque real baseado na hora do dia.
    """
    agora = datetime.now()
    # Hora decimal (ex: 14:30 vira 14.5) para cálculos matemáticos
    hora_decimal = agora.hour + agora.minute / 60.0
    
    # 1. TEMPERATURA (°C)
    # Segue uma onda senoidal: mais fria às 5h da manhã, mais quente às 15h.
    # Fórmula: $Temp = 25 + 3 \cdot \sin((hora - 10) \cdot \frac{\pi}{12})$
    temp_base = 25 + 3 * math.sin((hora_decimal - 10) * (math.pi / 12))
    temperatura = round(temp_base + random.uniform(-0.3, 0.3), 1)

    # 2. OXIGÊNIO DISSOLVIDO (mg/L)
    # Sobe durante o dia (fotossíntese) e cai à noite (respiração das algas/peixes).
    # Pico às 16h, mínima às 4h da manhã.
    o2_base = 6 + 2 * math.sin((hora_decimal - 11) * (math.pi / 12))
    oxigenio = round(o2_base + random.uniform(-0.2, 0.2), 2)

    # 3. pH
    # Tende a ser mais ácido à noite devido ao acúmulo de CO2.
    ph_base = 7.2 + 0.2 * math.sin((hora_decimal - 12) * (math.pi / 12))
    ph = round(ph_base + random.uniform(-0.05, 0.05), 2)

    return {
        "ph": ph,
        "oxigenio": oxigenio,
        "temperatura": temperatura
    }

def enviar_para_supabase():
    print("--- 🐟 Smart Fish: Sistema de Monitoramento Ativo ---")
    print(f"Conectado em: {SUPABASE_URL}")
    print("Pressione Ctrl+C para parar a simulação.\n")

    while True:
        try:
            # Gera os dados simulados
            dados = gerar_leitura_biologica()
            
            # Insere na tabela do Supabase
            # Certifique-se que o nome da tabela é 'leituras_sensor'
            resultado = supabase.table("leituras_sensor").insert(dados).execute()
            
            # Log no terminal para você acompanhar
            horario = datetime.now().strftime("%H:%M:%S")
            print(f"[{horario}] 📥 Dados Enviados:")
            print(f"   🌡️ Temp: {dados['temperatura']}°C | 💧 pH: {dados['ph']} | 💨 O2: {dados['oxigenio']} mg/L")
            print("-" * 40)

        except Exception as e:
            print(f"❌ Erro ao enviar dados: {e}")

        # Aguarda 10 segundos para a próxima leitura
        # (Tempo ideal para ver o gráfico se mexer no React)
        time.sleep(10)

if __name__ == "__main__":
    enviar_para_supabase()
