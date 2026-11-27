import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, FlatList, RefreshControl, StatusBar, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeContext';


// 🖨️ NOVOS IMPORTS PARA O PDF
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// 🎨 Cérebro das Cores
const themes = {
  dark: { bg: '#121212', card: '#1e1e1e', textTitle: '#ffffff', textSub: '#a4b0be', border: '#333', pillBg: '#2f3640', pillActive: '#2ecc71' },
  light: { bg: '#f5f6fa', card: '#ffffff', textTitle: '#2f3640', textSub: '#7f8c8d', border: '#e1e8ed', pillBg: '#ecf0f1', pillActive: '#27ae60' }
};

export default function HistoryScreen() {
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();

  // 🎛️ ESTADOS DOS FILTROS
  const [filtroTempo, setFiltroTempo] = useState('semana'); 
  const [mostrarApenasAlertas, setMostrarApenasAlertas] = useState(false);

  const theme = isDarkMode ? themes.dark : themes.light;

  async function fetchHistorico() {
    setLoading(true);
    let query = supabase.from('leituras_sensor').select('*').order('created_at', { ascending: false });

    const agora = new Date();
    if (filtroTempo === 'hoje') {
      const inicioHoje = new Date(agora.setHours(0,0,0,0)).toISOString();
      query = query.gte('created_at', inicioHoje);
    } else if (filtroTempo === 'semana') {
      const inicioSemana = new Date(agora.setDate(agora.getDate() - 7)).toISOString();
      query = query.gte('created_at', inicioSemana);
    } else if (filtroTempo === 'mes') {
      const inicioMes = new Date(agora.setDate(agora.getDate() - 30)).toISOString();
      query = query.gte('created_at', inicioMes);
    } else {
      query = query.limit(100); 
    }

    const { data } = await query;
    let resultados = data || [];

    if (mostrarApenasAlertas) {
      resultados = resultados.filter(item => 
        (item.ph != null && (item.ph < 6.5 || item.ph > 8.5)) || 
        (item.temperatura != null && (item.temperatura > 29 || item.temperatura < 20)) || 
        (item.oxigenio != null && item.oxigenio < 4.0)
      );
    }

    setHistorico(resultados);
    setLoading(false);
  }

  useEffect(() => {
    fetchHistorico();
  }, [filtroTempo, mostrarApenasAlertas]);

  // 📄 FUNÇÃO QUE GERA O PDF LINDO
  const gerarPDF = async () => {
    if (historico.length === 0) {
      Alert.alert("Ops!", "Não há dados para gerar o relatório com os filtros atuais.");
      return;
    }

    // Traduz o filtro para colocar no título do PDF
    const periodoDe = filtroTempo === 'hoje' ? 'Hoje' : filtroTempo === 'semana' ? 'Últimos 7 dias' : filtroTempo === 'mes' ? 'Últimos 30 dias' : 'Todo o período';
    const tipoRelatorio = mostrarApenasAlertas ? '⚠️ RELATÓRIO DE ANOMALIAS E ALERTAS CRÍTICOS' : '📊 RELATÓRIO COMPLETO DE QUALIDADE DA ÁGUA';

    // Monta o visual do PDF em HTML
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2ecc71; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #2c3e50; margin: 0; font-size: 28px; text-transform: uppercase; }
            h3 { color: #7f8c8d; margin: 5px 0 0 0; font-weight: normal; }
            .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-box p { margin: 5px 0; font-size: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background-color: #2c3e50; color: white; font-weight: bold; text-transform: uppercase; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .alert { color: #e74c3c; font-weight: bold; }
            .ok { color: #27ae60; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #95a5a6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Smart Fish PRO</h1>
            <h3>Gêmeo Digital de Aquicultura 4.0</h3>
          </div>
          
          <div class="info-box">
            <p>Tipo: <span style="color: ${mostrarApenasAlertas ? '#e74c3c' : '#2ecc71'};">${tipoRelatorio}</span></p>
            <p>Período Filtrado: ${periodoDe}</p>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Total de Registros: ${historico.length}</p>
          </div>

          <table>
            <tr>
              <th>Data e Hora</th>
              <th>Temperatura (°C)</th>
              <th>pH</th>
              <th>Oxigênio (mg/L)</th>
            </tr>
            ${historico.map(item => {
              const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR');
              // Lógica para colorir a tabela
              const tempClass = (item.temperatura != null && (item.temperatura > 29 || item.temperatura < 20)) ? 'alert' : 'ok';
              const phClass = (item.ph != null && (item.ph < 6.5 || item.ph > 8.5)) ? 'alert' : 'ok';
              const oxClass = (item.oxigenio != null && item.oxigenio < 4.0) ? 'alert' : 'ok';
              
              return `
                <tr>
                  <td>${dataFormatada}</td>
                  <td class="${tempClass}">${item.temperatura != null ? item.temperatura.toFixed(1) : '--'}</td>
                  <td class="${phClass}">${item.ph != null ? item.ph.toFixed(1) : '--'}</td>
                  <td class="${oxClass}">${item.oxigenio != null ? item.oxigenio.toFixed(1) : '--'}</td>
                </tr>
              `;
            }).join('')}
          </table>

          <div class="footer">
            Relatório gerado automaticamente pelo aplicativo Smart Fish.
          </div>
        </body>
      </html>
    `;

    try {
      // 1. Cria o PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      // 2. Abre a tela para compartilhar/salvar
      await Sharing.shareAsync(uri, { dialogTitle: 'Exportar Relatório Smart Fish' });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    }
  };

  const getStatusColor = (tipo: string, valor: number | null) => {
    if (valor == null) return theme.textSub; 
    if (tipo === 'ph') return (valor < 6.5 || valor > 8.5) ? '#ff4757' : '#2ecc71';
    if (tipo === 'temp') return (valor > 29 || valor < 20) ? '#ffa502' : '#2ecc71';
    return valor < 4.0 ? '#ff4757' : '#3498db';
  };

  const renderItem = ({ item }: { item: any }) => {
    const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const tempFormatada = item.temperatura != null ? `${item.temperatura.toFixed(1)}°` : '--';
    const phFormatado = item.ph != null ? item.ph.toFixed(1) : '--';
    const oxFormatado = item.oxigenio != null ? item.oxigenio.toFixed(1) : '--';

    return (
      <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={16} color={theme.textSub} />
          <Text style={[styles.dateText, { color: theme.textSub }]}>{dataFormatada}</Text>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>Temp</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('temp', item.temperatura) }]}>{tempFormatada}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>pH</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('ph', item.ph) }]}>{phFormatado}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>O2</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('ox', item.oxigenio) }]}>{oxFormatado}</Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterPill = ({ label, value }: { label: string, value: string }) => {
    const isActive = filtroTempo === value;
    return (
      <TouchableOpacity 
        style={[styles.pill, { backgroundColor: isActive ? theme.pillActive : theme.pillBg }]}
        onPress={() => setFiltroTempo(value)}
      >
        <Text style={[styles.pillText, { color: isActive ? '#fff' : theme.textSub, fontWeight: isActive ? 'bold' : 'normal' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textTitle }]}>Auditoria</Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>Histórico e Filtros</Text>
        </View>
        
        {/* 🛠️ HEADER BUTTONS: Botão de PDF e Botão de Tema */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.themeButton, { backgroundColor: '#e74c3c' }]} onPress={gerarPDF}>
            <Ionicons name="document-text" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.themeButton, { backgroundColor: theme.card }]} onPress={toggleTheme}>
            <Ionicons name={isDarkMode ? "sunny" : "moon"} size={22} color={isDarkMode ? "#f1c40f" : "#2c3e50"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillContainer}>
          <FilterPill label="Hoje" value="hoje" />
          <FilterPill label="Últimos 7 dias" value="semana" />
          <FilterPill label="Últimos 30 dias" value="mes" />
          <FilterPill label="Todo o Histórico" value="todos" />
        </ScrollView>

        <TouchableOpacity 
          style={[styles.alertFilterBtn, { borderColor: mostrarApenasAlertas ? '#ff4757' : theme.border, backgroundColor: mostrarApenasAlertas ? '#ff475711' : 'transparent' }]}
          onPress={() => setMostrarApenasAlertas(!mostrarApenasAlertas)}
        >
          <Ionicons name={mostrarApenasAlertas ? "warning" : "warning-outline"} size={18} color={mostrarApenasAlertas ? '#ff4757' : theme.textSub} />
          <Text style={[styles.alertFilterText, { color: mostrarApenasAlertas ? '#ff4757' : theme.textSub }]}>
            {mostrarApenasAlertas ? "Mostrando Apenas Anomalias" : "Ocultar Leituras Normais"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={historico}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistorico} tintColor={theme.pillActive} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={theme.textSub} style={{opacity: 0.5, marginBottom: 10}} />
            <Text style={[styles.emptyText, { color: theme.textSub }]}>
              {loading ? "Buscando registros..." : "Nenhuma leitura encontrada para este filtro."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 2 },
  themeButton: { padding: 10, borderRadius: 50, elevation: 2, justifyContent: 'center', alignItems: 'center', width: 44, height: 44 },
  
  pillContainer: { flexDirection: 'row', marginBottom: 15 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  pillText: { fontSize: 13 },
  
  alertFilterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  alertFilterText: { fontSize: 13, fontWeight: 'bold' },

  listContainer: { padding: 20, paddingBottom: 40 },
  historyCard: { padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 6 },
  dateText: { fontSize: 13, fontWeight: '600' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: '900' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', fontSize: 14 }
});
