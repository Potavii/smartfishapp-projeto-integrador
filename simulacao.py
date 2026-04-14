import random
import time
from supabase import create_client, Client

#coloque seus dados do suapbase aqui
URL = ""
KEY = ""

supabase: Client = create_client(URL, KEY)

def gerar_dados_simulados():
    """Gera dados realistas para piscicultura baseados em fontes técnicas [cite: 6]"""
    dados = {
        "ph": round(random.uniform(6.5, 8.5), 2),
        "oxigenio": round(random.uniform(4.5, 7.5), 2),
        "temperatura": round(random.uniform(24.0, 30.0), 2),
        "tanque_id": 1 # ID de teste do seu tanque
    }
    return dados

print("🚀 Iniciando simulação do Ecossistema Smart Fish...")

try:
    while True:
        dados = gerar_dados_simulados()
        
        # Enviando para a tabela 'leituras_sensor'
        response = supabase.table("leituras_sensor").insert(dados).execute()
        
        if response.data:
            print(f"✅ Dados enviados: pH {dados['ph']} | O2 {dados['oxigenio']}mg/L | Temp {dados['temperatura']}°C")
        
        # Espera 10 segundos para a próxima leitura
        time.sleep(10)

except KeyboardInterrupt:
    print("\n🛑 Simulação interrompida pelo usuário.")