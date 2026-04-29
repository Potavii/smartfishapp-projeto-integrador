import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Dimensions, Platform, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../src/lib/supabase';

const screenWidth = Dimensions.get("window").width;
const chartWidth = Platform.OS === 'web' && screenWidth > 400 ? 360 : screenWidth - 50;

// 🎨 O "Cérebro" das Cores (Dark/Light)
const themes = {
  dark: { bg: '#121212', card: '#1e1e1e', textTitle: '#ffffff', textSub: '#a4b0be', chartLine: 'rgba(255, 255, 255, ' },
  light: { bg: '#f5f6fa', card: '#ffffff', textTitle: '#2f3640', textSub: '#7f8c8d', chartLine: 'rgba(47, 54, 64, ' }
};

export default function HomeScreen() {
  const [leitura, setLeitura] = useState({ ph: 7.0, oxigenio: 5.0, temperatura: 25.0 });
  const [historicoTemp, setHistoricoTemp] = useState([25, 25, 25, 25, 25, 25]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const theme = isDarkMode ? themes.dark : themes.light;

  useEffect(() => {
    fetchUltimaLeitura();
    const subscription = supabase.channel('dados-sensores').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leituras_sensor' },
      (payload: any) => {
        setLeitura(payload.new);
        setHistoricoTemp(prev => [...prev.slice(1), payload.new.temperatura]);
      }).subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  async function fetchUltimaLeitura() {
    const { data } = await supabase.from('leituras_sensor').select('*').order('created_at', { ascending: false }).limit(6);
    if (data && data.length > 0) {
      setLeitura(data[0]);
      const temps = data.reverse().map(item => item.temperatura);
      while(temps.length < 6) temps.unshift(25);
      setHistoricoTemp(temps);
    }
  }

  // 🚀 FUNÇÃO PARA GERAR O LAUDO TÉCNICO SEMANAL
  const gerarRelatorioPDF = async () => {
    setGerandoPdf(true);
    try {
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 7);

      const strInicio = dataInicio.toLocaleDateString('pt-BR');
      const strFim = dataFim.toLocaleDateString('pt-BR');

      const { data, error } = await supabase
        .from('leituras_sensor')
        .select('*')
        .gte('created_at', dataInicio.toISOString())
        .lte('created_at', dataFim.toISOString())
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        Alert.alert("Aviso", "Não há dados suficientes nesta semana para gerar um laudo.");
        setGerandoPdf(false); // Libera o botão se não tiver dados
        return;
      }

      let somaTemp = 0, somaPh = 0, somaOx = 0;
      let alertasPh = 0, alertasTemp = 0, alertasOx = 0;

      data.forEach(leitura => {
        somaTemp += leitura.temperatura;
        somaPh += leitura.ph;
        somaOx += leitura.oxigenio;

        if (leitura.ph < 6.5 || leitura.ph > 8.5) alertasPh++;
        if (leitura.temperatura > 29 || leitura.temperatura < 20) alertasTemp++;
        if (leitura.oxigenio < 4.0) alertasOx++;
      });

      const total = data.length;
      const mediaTemp = (somaTemp / total).toFixed(1);
      const mediaPh = (somaPh / total).toFixed(1);
      const mediaOx = (somaOx / total).toFixed(1);

      const dadosTabela = data.slice(0, 30);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e272e; background-color: #f5f6fa; }
              .page-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2ecc71; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; color: #2f3640; font-size: 28px; font-weight: 900; }
              .header h1 span { color: #2ecc71; }
              .header p { margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px; }

              h2 { color: #2c3e50; font-size: 20px; border-left: 5px solid #2ecc71; padding-left: 10px; margin-top: 40px; }

              .summary-grid { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 30px; }
              .summary-card { flex: 1; background: #f8f9fa; border: 1px solid #dcdde1; padding: 20px; border-radius: 8px; text-align: center; }
              .summary-card p { margin: 0; font-size: 12px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; }
              .summary-card h3 { margin: 10px 0 0 0; font-size: 28px; color: #2f3640; }
              .summary-card .alert { font-size: 11px; color: #e74c3c; margin-top: 8px; font-weight: bold; }

              table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; font-size: 12px; }
              th { background-color: #2f3640; color: white; padding: 12px; text-align: center; text-transform: uppercase; }
              td { padding: 10px; text-align: center; border-bottom: 1px solid #f1f2f6; }
              tr:nth-child(even) { background-color: #f8f9fa; }
              .danger { color: #e74c3c; font-weight: bold; }

              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #ecf0f1; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="page-box">
              <div class="header">
                <div>
                  <h1>Smart Fish <span>PRO</span></h1>
                  <p>Laudo Técnico de Monitoramento Biológico</p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Período:</strong> ${strInicio} até ${strFim}</p>
                  <p><strong>Leituras Analisadas:</strong> ${total}</p>
                </div>
              </div>

              <h2>Resumo Executivo da Semana</h2>
              <div class="summary-grid">
                <div class="summary-card" style="border-top: 4px solid #f39c12;">
                  <p>Média de Temperatura</p>
                  <h3>${mediaTemp}°C</h3>
                  ${alertasTemp > 0 ? `<div class="alert">${alertasTemp} picos anormais detectados</div>` : `<div class="alert" style="color:#2ecc71">Condição Ideal</div>`}
                </div>
                <div class="summary-card" style="border-top: 4px solid #2ecc71;">
                  <p>Média de Acidez (pH)</p>
                  <h3>${mediaPh}</h3>
                  ${alertasPh > 0 ? `<div class="alert">${alertasPh} variações bruscas detectadas</div>` : `<div class="alert" style="color:#2ecc71">Condição Ideal</div>`}
                </div>
                <div class="summary-card" style="border-top: 4px solid #3498db;">
                  <p>Média de Oxigênio</p>
                  <h3>${mediaOx} mg/L</h3>
                  ${alertasOx > 0 ? `<div class="alert">${alertasOx} quedas de O2 detectadas</div>` : `<div class="alert" style="color:#2ecc71">Condição Ideal</div>`}
                </div>
              </div>

              <h2>Amostragem de Leituras Recentes</h2>
              <p style="font-size: 12px; color: #7f8c8d; margin-top: -10px;">Exibindo as 30 medições mais recentes do período selecionado.</p>
              <table>
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Temperatura (°C)</th>
                    <th>Nível de pH</th>
                    <th>Oxigênio (mg/L)</th>
                  </tr>
                </thead>
                <tbody>
                  ${dadosTabela.map(item => `
                    <tr>
                      <td>${new Date(item.created_at).toLocaleString('pt-BR')}</td>
                      <td class="${item.temperatura > 29 || item.temperatura < 20 ? 'danger' : ''}">${item.temperatura.toFixed(1)}</td>
                      <td class="${item.ph < 6.5 || item.ph > 8.5 ? 'danger' : ''}">${item.ph.toFixed(1)}</td>
                      <td class="${item.oxigenio < 4.0 ? 'danger' : ''}">${item.oxigenio.toFixed(1)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="footer">
                Documento gerado automaticamente via Smart Fish App.<br>
                Emissão: ${new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </body>
        </html>
      `;

      // 🔥 A MÁGICA DO NAVEGADOR VS CELULAR ACONTECE AQUI 🔥
      if (Platform.OS === 'web') {
        // Se estiver no navegador do PC, abre a impressão direto com o HTML bonito
        await Print.printAsync({ html: htmlContent });
      } else {
        // Se estiver no celular, cria o arquivo PDF e abre o WhatsApp/Salvar
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

    } catch (err) {
      console.error("Erro interno ao gerar PDF:", err);
      Alert.alert("Erro", "Ocorreu um problema ao gerar o PDF.");
    } finally {
      setGerandoPdf(false); // Libera o botão independente de dar certo ou erro
    }
  };

  const getStatus = (tipo: string, valor: number) => {
    if (tipo === 'ph') return (valor < 6.5 || valor > 8.5) ? { cor: '#ff4757', txt: 'CRÍTICO', icon: 'alert-circle' } : { cor: '#2ecc71', txt: 'IDEAL', icon: 'checkmark-circle' };
    if (tipo === 'temp') return (valor > 29 || valor < 20) ? { cor: '#ffa502', txt: 'ALERTA', icon: 'thermometer' } : { cor: '#2ecc71', txt: 'ESTÁVEL', icon: 'thermometer' };
    return valor < 4.0 ? { cor: '#ff4757', txt: 'BAIXO', icon: 'warning' } : { cor: '#3498db', txt: 'NORMAL', icon: 'water' };
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textTitle }]}>Smart Fish <Text style={{color: '#2ecc71'}}>PRO</Text></Text>
            <Text style={[styles.subtitle, { color: theme.textSub }]}>Monitoramento em Tempo Real</Text>
          </View>
          <TouchableOpacity style={[styles.themeButton, { backgroundColor: theme.card }]} onPress={() => setIsDarkMode(!isDarkMode)}>
            <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? "#f1c40f" : "#2c3e50"} />
          </TouchableOpacity>
        </View>

        {leitura.ph < 6.5 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={24} color="white" />
            <Text style={styles.alertText}>ALERTA: Risco para os peixes! Verifique a água.</Text>
          </View>
        )}

        {/* 🔘 BOTÃO DE RELATÓRIO */}
        <TouchableOpacity
          style={[styles.reportButton, { opacity: gerandoPdf ? 0.5 : 1 }]}
          onPress={gerarRelatorioPDF}
          disabled={gerandoPdf}
        >
          <Ionicons name="document-text" size={20} color="white" />
          <Text style={styles.reportButtonText}>
            {gerandoPdf ? "Processando Laudo..." : "Gerar Laudo Semanal (PDF)"}
          </Text>
        </TouchableOpacity>

        <View style={styles.cardsContainer}>
          <MetricCard theme={theme} label="Temperatura da Água" value={leitura.temperatura.toFixed(1)} unit="°C" status={getStatus('temp', leitura.temperatura)} />
          <MetricCard theme={theme} label="Nível de Acidez (pH)" value={leitura.ph.toFixed(1)} unit="" status={getStatus('ph', leitura.ph)} />
          <MetricCard theme={theme} label="Oxigênio Dissolvido" value={leitura.oxigenio.toFixed(1)} unit=" mg/L" status={getStatus('ox', leitura.oxigenio)} />
        </View>

        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <View style={styles.chartHeader}>
            <Ionicons name="analytics" size={24} color="#2ecc71" />
            <Text style={[styles.chartTitle, { color: theme.textTitle }]}>Comportamento Térmico</Text>
          </View>
          <Text style={[styles.chartDescription, { color: theme.textSub }]}>
            Acompanhe a variação da temperatura nos últimos minutos. O ideal é manter a linha estável. Variações bruscas podem gerar estresse térmico nos peixes.
          </Text>

          <LineChart
            data={{ labels: ["-5", "-4", "-3", "-2", "-1", "Agora"], datasets: [{ data: historicoTemp }] }}
            width={chartWidth} height={220} yAxisSuffix="°C" yAxisInterval={1}
            chartConfig={{
              backgroundColor: theme.card, backgroundGradientFrom: theme.card, backgroundGradientTo: theme.card,
              decimalPlaces: 1, color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
              labelColor: (opacity = 1) => theme.chartLine + opacity + ')',
              propsForDots: { r: "5", strokeWidth: "2", stroke: theme.bg },
              propsForLabels: { fontSize: 12, fontWeight: 'bold' }
            }}
            bezier style={styles.chartStyle}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCard = ({ label, value, unit = "", status, theme }: any) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: status.cor }]}>
    <View style={styles.cardInfo}>
      <Text style={[styles.cardLabel, { color: theme.textSub }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: theme.textTitle }]}>{value}<Text style={[styles.cardUnit, { color: theme.textSub }]}>{unit}</Text></Text>
    </View>
    <View style={styles.cardStatusContainer}>
      <Ionicons name={status.icon} size={24} color={status.cor} style={{marginBottom: 4}} />
      <View style={[styles.badge, { backgroundColor: status.cor + '22' }]}>
        <Text style={[styles.badgeText, { color: status.cor }]}>{status.txt}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, width: '100%', maxWidth: 400 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 2 },
  themeButton: { padding: 10, borderRadius: 50, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  reportButton: { backgroundColor: '#2ecc71', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', gap: 10, width: '100%', maxWidth: 400, marginBottom: 20, justifyContent: 'center', elevation: 3 },
  reportButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  cardsContainer: { width: '100%', maxWidth: 400, gap: 15, marginBottom: 25 },
  card: { padding: 20, borderRadius: 16, borderLeftWidth: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  cardValue: { fontSize: 36, fontWeight: '900', marginTop: 4 },
  cardUnit: { fontSize: 16, fontWeight: 'normal' },
  cardStatusContainer: { alignItems: 'center' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  chartCard: { padding: 20, borderRadius: 20, width: '100%', maxWidth: 400, marginBottom: 30, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  chartTitle: { fontSize: 18, fontWeight: 'bold' },
  chartDescription: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  chartStyle: { borderRadius: 16, alignSelf: 'center', marginLeft: -10 },
  alertBanner: { backgroundColor: '#ff4757', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', gap: 10, width: '100%', maxWidth: 400, marginBottom: 20 },
  alertText: { color: 'white', fontWeight: 'bold', fontSize: 13, flex: 1 }
});