import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext';

function TabsNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2ecc71',
        tabBarInactiveTintColor: isDarkMode ? '#a4b0be' : '#7f8c8d',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderTopColor: isDarkMode ? '#333333' : '#e1e8ed',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <TabsNavigator />
    </ThemeProvider>
  );
}