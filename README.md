# SmartFishApp - Monitoramento Inteligente de Piscicultura 🐟
[![React Native](https://img.shields.io/badge/React%20Native-0.74.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~51.0.28-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.3-green.svg)](https://supabase.com/)

O **SmartFishApp** é um sistema projetado para o monitoramento inteligente de tanques de piscicultura, desenvolvido para o projeto SAGA SENAI. A solução integra a leitura de dados de qualidade da água (como os coletados por sensores ESP32) com um aplicativo móvel moderno, permitindo o acompanhamento em tempo real.

O repositório está dividido em duas partes principais: o aplicativo mobile e o script de simulação dos sensores.

## 🚀 Funcionalidades

* **Monitoramento via App:** Interface móvel desenvolvida com navegação em abas para visualização do status dos tanques.
* **Simulação de Sensores:** Script em Python projetado para simular o comportamento e a transmissão de dados dos sensores de qualidade da água do ESP32.

## 🛠️ Tecnologias Utilizadas

* **Mobile:** React Native, Expo, TypeScript e Expo Router (para navegação baseada em arquivos).
* **Simulação/Hardware:** Python.

## 📁 Estrutura do Projeto

* `/projeto_react/SmartFishApp/`: Contém todo o código-fonte do aplicativo React Native.
* `simulacao.py`: Script responsável por gerar e simular os dados de telemetria dos tanques.

## ⚙️ Como executar o projeto

### 1. Rodando a Simulação (Python)
Para iniciar a simulação dos sensores de qualidade da água, certifique-se de ter o Python instalado na sua máquina.

```bash
# Na raiz do repositório, execute:
python simulacao.py
```

### 2. Rodando o Aplicativo (React Native / Expo)
Para rodar o app, você precisará do Node.js instalado.

```bash
# Navegue até a pasta do aplicativo
cd projeto_react/SmartFishApp

# Instale as dependências do projeto
npm install

# Inicie o servidor de desenvolvimento do Expo
npx expo start
```

Após rodar o comando do Expo, um QR Code aparecerá no terminal. Você pode escaneá-lo usando o aplicativo **Expo Go** no seu celular físico (Android ou iOS) ou pressionar `a` para abrir em um emulador Android / `i` para abrir no simulador iOS.

## 👥 Integrantes

* Nicolas Mota de Almeida
* Paulo Otávio Silva Pereira
* Daniel Fonseca da Silva

## 🤝 Desenvolvimento

Projeto desenvolvido como parte da arquitetura de soluções em nuvem e hardware para automação em piscicultura.
