import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

export default function Index() {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [loading, setLoading] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(true);

  const flatListRef = useRef<any>(null);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    const data = await AsyncStorage.getItem("chat");
    if (data) setMensagens(JSON.parse(data));
  };

  const salvarHistorico = async (dados: any[]) => {
    await AsyncStorage.setItem("chat", JSON.stringify(dados));
  };

  const scrollFinal = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const animarTexto = (texto: string, callback: any) => {
    let i = 0;
    let textoAtual = "";

    const intervalo = setInterval(() => {
      textoAtual += texto[i];
      i++;

      callback(textoAtual);

      if (i >= texto.length) {
        clearInterval(intervalo);
      }
    }, 15);
  };

  const enviarPergunta = async () => {
    if (!pergunta) return;

    const userMsg = {
      id: Date.now().toString(),
      texto: pergunta,
      tipo: "usuario"
    };

    const novas = [...mensagens, userMsg];
    setMensagens(novas);
    salvarHistorico(novas);

    setPergunta("");
    setLoading(true);

    scrollFinal();

    try {
      const res = await fetch("http://10.0.0.245:3000/perguntar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pergunta })
      });

      const data = await res.json();

      let textoIA = "";

      const novaMsgIA = {
        id: Date.now().toString() + "-ia",
        texto: "",
        tipo: "ia"
      };

      setMensagens(prev => [...prev, novaMsgIA]);

      animarTexto(data.choices[0].message.content, (textoAnimado: string) => {
        textoIA = textoAnimado;

        setMensagens(prev =>
          prev.map(msg =>
            msg.id === novaMsgIA.id
              ? { ...msg, texto: textoIA }
              : msg
          )
        );

        scrollFinal();
      });

      salvarHistorico([...novas, { ...novaMsgIA, texto: data.choices[0].message.content }]);

    } catch {
      setMensagens(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          texto: "Erro ao conectar",
          tipo: "ia"
        }
      ]);
    }

    setLoading(false);
  };

  const limparChat = async () => {
    await AsyncStorage.removeItem("chat");
    setMensagens([]);
  };

  const renderItem = ({ item }: any) => {
    const isUser = item.tipo === "usuario";

    return (
      <View style={styles.row}>
        {!isUser && <Text style={styles.avatar}>🤖</Text>}

        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.iaBubble,
          { backgroundColor: isUser ? "#22c55e" : (temaEscuro ? "#1e293b" : "#e2e8f0") }
        ]}>
          <Markdown style={{
            body: { color: temaEscuro ? "#fff" : "#000" }
          }}>
            {item.texto}
          </Markdown>
        </View>

        {isUser && <Text style={styles.avatar}>👤</Text>}
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: temaEscuro ? "#020617" : "#f1f5f9" }
    ]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={{ color: temaEscuro ? "#fff" : "#000", fontSize: 20 }}>
          Lumina🤖 Sobre o que você gostaria de conversar?
        </Text>

        <View style={{ flexDirection: "row", gap: 15 }}>
          <TouchableOpacity onPress={() => setTemaEscuro(!temaEscuro)}>
            <Text>🌓</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={limparChat}>
            <Text style={{ color: "red" }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CHAT */}
      <FlatList
        ref={flatListRef}
        data={mensagens}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        onContentSizeChange={scrollFinal}
      />

      {loading && <ActivityIndicator />}

      {/* INPUT */}
      <View style={[
        styles.inputContainer,
        { backgroundColor: temaEscuro ? "#020617" : "#fff" }
      ]}>
        <TextInput
          value={pergunta}
          onChangeText={setPergunta}
          placeholder="Digite..."
          onSubmitEditing={enviarPergunta}
          returnKeyType="send"
          placeholderTextColor="#888"
          style={[
            styles.input,
            {
              backgroundColor: temaEscuro ? "#0f172a" : "#e2e8f0",
              color: temaEscuro ? "#fff" : "#000"
            }
          ]}
        />

        <TouchableOpacity style={styles.button} onPress={enviarPergunta}>
          <Text style={{ color: "#fff" }}>Enviar</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#1e293b"
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5
  },

  avatar: {
    fontSize: 20,
    marginHorizontal: 5
  },

  bubble: {
    padding: 12,
    borderRadius: 15,
    maxWidth: "75%"
  },

  userBubble: {
    marginLeft: "auto"
  },

  iaBubble: {},

  inputContainer: {
    flexDirection: "row",
    padding: 10
  },

  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10
  },

  button: {
    marginLeft: 10,
    backgroundColor: "#22c55e",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 10
  }
});