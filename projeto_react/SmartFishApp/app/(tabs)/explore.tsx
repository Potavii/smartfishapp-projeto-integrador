import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, RefreshControl, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';

// 🎨 Cérebro das Cores
const themes = {
  dark: { bg: '#121212', card: '#1e1e1e', textTitle: '#ffffff', textSub: '#a4b0be', border: '#333', pillBg: '#2f3640', pillActive: '#2ecc71' },
  light: { bg: '#f5f6fa', card: '#ffffff', textTitle: '#2f3640', textSub: '#7f8c8d', border: '#e1e8ed', pillBg: '#ecf0f1', pillActive: '#27ae60' }
};

export default function HistoryScreen() {
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 🎛️ ESTADOS DOS FILTROS
  const [filtroTempo, setFiltroTempo] = useState('semana'); // 'hoje', 'semana', 'mes', 'todos'
  const [mostrarApenasAlertas, setMostrarApenasAlertas] = useState(false);

  const theme = isDarkMode ? themes.dark : themes.light;

  // 🚀 O "MOTOR" DE BUSCA INTELIGENTE
  async function fetchHistorico() {
    setLoading(true);
    
    // Inicia a query base
    let query = supabase.from('leituras_sensor').select('*').order('created_at', { ascending: false });

    // 1. Aplica o filtro de Tempo direto no Banco de Dados (Supabase)
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
      query = query.limit(100); // Se for 'todos', limita a 100 para não travar o celular
    }

    const { data, error } = await query;
    let resultados = data || [];

    // 2. Aplica o filtro de Anomalias (Visão de Raio-X do Biólogo)
    if (mostrarApenasAlertas) {
      resultados = resultados.filter(item => 
        item.ph < 6.5 || item.ph > 8.5 || 
        item.temperatura > 29 || item.temperatura < 20 || 
        item.oxigenio < 4.0
      );
    }

    setHistorico(resultados);
    setLoading(false);
  }

  // Sempre que um filtro mudar, a tela busca os dados novamente
  useEffect(() => {
    fetchHistorico();
  }, [filtroTempo, mostrarApenasAlertas]);

  // Cores dinâmicas para mostrar logo na lista se algo deu ruim
  const getStatusColor = (tipo: string, valor: number) => {
    if (tipo === 'ph') return (valor < 6.5 || valor > 8.5) ? '#ff4757' : '#2ecc71';
    if (tipo === 'temp') return (valor > 29 || valor < 20) ? '#ffa502' : '#2ecc71';
    return valor < 4.0 ? '#ff4757' : '#3498db';
  };

  const renderItem = ({ item }: { item: any }) => {
    const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    return (
      <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={16} color={theme.textSub} />
          <Text style={[styles.dateText, { color: theme.textSub }]}>{dataFormatada}</Text>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>Temp</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('temp', item.temperatura) }]}>{item.temperatura.toFixed(1)}°</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>pH</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('ph', item.ph) }]}>{item.ph.toFixed(1)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textSub }]}>O2</Text>
            <Text style={[styles.metricValue, { color: getStatusColor('ox', item.oxigenio) }]}>{item.oxigenio.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Componente visual do botão de filtro
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
        <TouchableOpacity style={[styles.themeButton, { backgroundColor: theme.card }]} onPress={() => setIsDarkMode(!isDarkMode)}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? "#f1c40f" : "#2c3e50"} />
        </TouchableOpacity>
      </View>

      {/* 🎛️ BARRA DE FILTROS */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        
        {/* Filtros de Tempo (Rolagem Horizontal) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillContainer}>
          <FilterPill label="Hoje" value="hoje" />
          <FilterPill label="Últimos 7 dias" value="semana" />
          <FilterPill label="Últimos 30 dias" value="mes" />
          <FilterPill label="Todo o Histórico" value="todos" />
        </ScrollView>

        {/* Filtro de Alertas (Anomalias) */}
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

      {/* RESULTADOS DA BUSCA */}
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
  themeButton: { padding: 10, borderRadius: 50, elevation: 2 },
  
  // Estilos dos Filtros
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