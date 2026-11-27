import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, LogBox, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../src/lib/supabase';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../src/context/ThemeContext';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const GEMINI_API_KEY = 'SUA CHAVE API';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const themes = {
  dark: {
    bg: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    sub: '#a4b0be',
    primary: '#2ecc71',
    userMsg: '#2ecc71',
    aiMsg: '#2f3640',
    aiText: '#ffffff',
    inputBg: '#2f3640',
    border: '#333333',
  },
  light: {
    bg: '#f5f6fa',
    card: '#ffffff',
    text: '#2f3640',
    sub: '#7f8c8d',
    primary: '#27ae60',
    userMsg: '#2ecc71',
    aiMsg: '#ffffff',
    aiText: '#2f3640',
    inputBg: '#f1f2f6',
    border: '#e1e8ed',
  },
};

export default function ChatScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? themes.dark : themes.light;

  const [mensagens, setMensagens] = useState<any[]>([
    { id: '1', texto: 'Olá! Sou o Biólogo Virtual. Estou monitorando o seu tanque e tenho acesso a todo o histórico. O que deseja saber?', isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessaoAtualId, setSessaoAtualId] = useState<string | null>(null);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [sessoes, setSessoes] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const ultimoAlertaRef = useRef<string | null>(null);

  useEffect(() => {
    carregarSessoes();
    pedirPermissaoNotificacao();

    const monitorarTanque = setInterval(async () => {
      try {
        const { data } = await supabase.from('leituras_sensor').select('*').order('created_at', { ascending: false }).limit(1);

        if (data && data.length > 0) {
          const leituraAtual = data[0];

          if (ultimoAlertaRef.current !== leituraAtual.id) {
            let tituloAlerta = "";
            let mensagemAlerta = "";

            if (leituraAtual.oxigenio != null && leituraAtual.oxigenio < 4.0) {
              tituloAlerta = "🚨 PERIGO: Oxigênio Baixo!";
              mensagemAlerta = `O nível de O2 caiu para ${leituraAtual.oxigenio.toFixed(1)} mg/L. Ligue a aeração!`;
            } else if (leituraAtual.ph != null && (leituraAtual.ph < 6.5 || leituraAtual.ph > 8.5)) {
              tituloAlerta = "⚠️ ATENÇÃO: pH Desregulado!";
              mensagemAlerta = `O pH da água está em ${leituraAtual.ph.toFixed(1)}.`;
            } else if (leituraAtual.temperatura != null && (leituraAtual.temperatura > 32 || leituraAtual.temperatura < 20)) {
              tituloAlerta = "🌡️ ALERTA TÉRMICO!";
              mensagemAlerta = `Temperatura da água atingiu ${leituraAtual.temperatura.toFixed(1)}°C.`;
            }

            if (mensagemAlerta !== "") {
              await Notifications.scheduleNotificationAsync({
                content: { title: tituloAlerta, body: mensagemAlerta, sound: true },
                trigger: null,
              });
              ultimoAlertaRef.current = leituraAtual.id;
            }
          }
        }
      } catch (error) {
        console.log("Erro no monitoramento invisível: ", error);
      }
    }, 30000);

    return () => clearInterval(monitorarTanque);
  }, []);

  const pedirPermissaoNotificacao = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') console.log('Permissão para notificações negada!');
  };

  const carregarSessoes = async () => {
    const { data } = await supabase.from('sessoes_chat').select('*').order('created_at', { ascending: false });
    if (data) setSessoes(data);
  };

  const abrirSessao = async (sessaoId: string) => {
    setSessaoAtualId(sessaoId);
    setModalVisivel(false);
    const { data } = await supabase.from('mensagens_chat').select('*').eq('sessao_id', sessaoId).order('created_at', { ascending: true });
    if (data && data.length > 0) {
      const msgsFormatadas = data.map(m => ({ id: m.id, texto: m.texto, isUser: m.is_user }));
      setMensagens(msgsFormatadas);
    }
  };

  const novaConversa = () => {
    setSessaoAtualId(null);
    setMensagens([{ id: '1', texto: 'Olá! Sou o Biólogo Virtual. Estou monitorando o seu tanque e tenho acesso a todo o histórico. O que deseja saber?', isUser: false }]);
    setModalVisivel(false);
    carregarSessoes();
  };

  const confirmarExclusao = (id: string, titulo: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Tem certeza que deseja apagar "${titulo}"?`)) executarExclusao(id);
    } else {
      Alert.alert(
        "Excluir Conversa", `Tem certeza que deseja apagar "${titulo}"?`,
        [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => executarExclusao(id) }]
      );
    }
  };

  const executarExclusao = async (id: string) => {
    try {
      await supabase.from('sessoes_chat').delete().eq('id', id);
      if (sessaoAtualId === id) novaConversa();
      else carregarSessoes();
    } catch (err) { console.error(err); }
  };

  const enviarMensagem = async () => {
    if (input.trim() === '') return;
    const msgUsuario = input;
    setInput('');
    setMensagens(prev => [...prev, { id: Date.now().toString(), texto: msgUsuario, isUser: true }]);
    setLoading(true);

    try {
      let currentSessaoId = sessaoAtualId;
      if (!currentSessaoId) {
        const tituloSessao = msgUsuario.length > 30 ? msgUsuario.substring(0, 30) + '...' : msgUsuario;
        const { data: novaSessao } = await supabase.from('sessoes_chat').insert([{ titulo: tituloSessao }]).select().single();
        if (novaSessao) {
          currentSessaoId = novaSessao.id;
          setSessaoAtualId(currentSessaoId);
        }
      }

      if (currentSessaoId) await supabase.from('mensagens_chat').insert([{ sessao_id: currentSessaoId, texto: msgUsuario, is_user: true }]);

      const { data: dadosSensor } = await supabase.from('leituras_sensor').select('*').order('created_at', { ascending: false }).limit(35);

      let contextoAtual = "Dados atuais indisponíveis.";
      let contextoHistorico = "Sem histórico recente.";

      if (dadosSensor && dadosSensor.length > 0) {
        const atual = dadosSensor[0];
        const ultimaTemp = dadosSensor.find(d => d.temperatura != null)?.temperatura ?? 'N/D';
        const ultimoPh = dadosSensor.find(d => d.ph != null)?.ph ?? 'N/D';
        const ultimoOx = dadosSensor.find(d => d.oxigenio != null)?.oxigenio ?? 'N/D';

        const dataAtualStr = new Date(atual.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        contextoAtual = `[ÚLTIMA LEITURA EM ${dataAtualStr}] Temp: ${ultimaTemp}°C | pH: ${ultimoPh} | O2: ${ultimoOx} mg/L.`;

        if (dadosSensor.length > 1) {
          contextoHistorico = dadosSensor.slice(1).map(d => {
            const dataHora = new Date(d.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const t = d.temperatura != null ? `${d.temperatura}°C` : '--';
            const p = d.ph != null ? `${d.ph}` : '--';
            const o = d.oxigenio != null ? `${d.oxigenio} mg/L` : '--';
            return `[${dataHora}] Temp: ${t} | pH: ${p} | O2: ${o}`;
          }).join('\n');
        }
      }

      let contextoConversa = "Nenhuma mensagem anterior nesta sessão.";
      if (currentSessaoId) {
        const { data: ultimasMsgs } = await supabase.from('mensagens_chat').select('texto, is_user').eq('sessao_id', currentSessaoId).order('created_at', { ascending: false }).limit(6);
        if (ultimasMsgs && ultimasMsgs.length > 0) {
          contextoConversa = ultimasMsgs.reverse().map(m => m.is_user ? `Usuário: ${m.texto}` : `IA: ${m.texto}`).join('\n');
        }
      }

      const promptSistema = `
        Você é o "Smart Fish AI", um biólogo sênior de Aquicultura 4.0.
        Você tem acesso aos dados reais e às DATAS EXATAS em que os sensores registraram as informações.
        Use as datas e horas nas suas respostas para dar análises temporais precisas ao produtor (exemplo: "Notei que hoje às 14:30 houve uma queda de oxigênio..."). Seja claro, prestativo e evite textos gigantes.

        📊 [DADOS DO TANQUE]
        - SITUAÇÃO ATUAL: ${contextoAtual}
        - HISTÓRICO DAS ÚLTIMAS 20 LEITURAS:
        ${contextoHistorico}

        🗣️ [MEMÓRIA DA CONVERSA]
        ${contextoConversa}

        PERGUNTA DO USUÁRIO: "${msgUsuario}"
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(promptSistema);
      const respostaIA = result.response.text();

      setMensagens(prev => [...prev, { id: Date.now().toString(), texto: respostaIA, isUser: false }]);
      if (currentSessaoId) await supabase.from('mensagens_chat').insert([{ sessao_id: currentSessaoId, texto: respostaIA, is_user: false }]);

    } catch (error: any) {
      setMensagens(prev => [...prev, { id: Date.now().toString(), texto: 'Deu ruim na conexão! Tente novamente.', isUser: false }]);
    } finally {
      setLoading(false);
      carregarSessoes();
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.balao,
        item.isUser
          ? [styles.balaoUsuario, { backgroundColor: theme.userMsg }]
          : [
              styles.balaoIA,
              {
                backgroundColor: theme.aiMsg,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ],
      ]}
    >
      {!item.isUser && (
        <View style={styles.aiBadgeRow}>
          <Ionicons name="hardware-chip" size={15} color={theme.primary} />
          <Text style={[styles.aiBadgeText, { color: theme.primary }]}>Smart Fish AI</Text>
        </View>
      )}
      <Text style={[styles.textoBalao, { color: item.isUser ? '#ffffff' : theme.aiText }]}>
        {item.texto}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      <View style={[styles.headerWrapper, { borderBottomColor: theme.border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Biólogo <Text style={{ color: '#2ecc71' }}>Virtual</Text>
            </Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>IA Conectada ao Supabase</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDarkMode ? 0 : 1 }]}
              onPress={toggleTheme}
            >
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#f1c40f" : "#2c3e50"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDarkMode ? 0 : 1 }]}
              onPress={() => { carregarSessoes(); setModalVisivel(true); }}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={mensagens}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
              placeholder="Pergunte sobre a água..."
              placeholderTextColor={theme.sub}
              value={input}
              onChangeText={setInput}
              editable={!loading}
              multiline={true}
            />
            <TouchableOpacity
              style={[styles.botaoEnviar, { backgroundColor: theme.primary, opacity: input.trim() === '' || loading ? 0.5 : 1 }]}
              onPress={enviarMensagem}
              disabled={input.trim() === '' || loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="white" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Conversas Anteriores</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close-circle" size={28} color={theme.sub} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btnNovaConversa, { backgroundColor: theme.primary }]} onPress={novaConversa}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.txtNovaConversa}>Nova Consulta</Text>
            </TouchableOpacity>

            <FlatList
              data={sessoes}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.sessaoRow, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity style={styles.sessaoItem} onPress={() => abrirSessao(item.id)}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.sub} />
                    <Text style={[styles.sessaoTitulo, { color: theme.text }]} numberOfLines={1}>{item.titulo}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarExclusao(item.id, item.titulo)} style={styles.btnExcluir}>
                    <Ionicons name="trash-outline" size={20} color="#ff4757" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: theme.sub, textAlign: 'center', marginTop: 20 }}>Nenhum histórico encontrado.</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerWrapper: { borderBottomWidth: 1, width: '100%' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  chatContainer: {
    padding: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  balao: {
    maxWidth: '82%',
    padding: 15,
    borderRadius: 18,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  balaoUsuario: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  balaoIA: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textoBalao: { fontSize: 15, lineHeight: 22 },
  inputWrapper: {
    borderTopWidth: 1,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 15,
    maxHeight: 100,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  botaoEnviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  btnNovaConversa: { flexDirection: 'row', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 },
  txtNovaConversa: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sessaoRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
  sessaoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sessaoTitulo: { fontSize: 16, flex: 1 },
  btnExcluir: { padding: 8 },
});