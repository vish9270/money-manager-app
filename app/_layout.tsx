import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MoneyProvider } from '@/providers/MoneyProvider';
import Colors from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-transaction" 
        options={{ 
          presentation: 'modal',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="add-account" 
        options={{ 
          presentation: 'modal',
          headerShown: true,
        }} 
      />
      <Stack.Screen name="goals" options={{ headerShown: true }} />
      <Stack.Screen name="recurring" options={{ headerShown: true }} />
      <Stack.Screen name="investment" options={{ headerShown: true }} />
      <Stack.Screen name="debts" options={{ headerShown: true }} />
      <Stack.Screen name="reports" options={{ headerShown: true }} />
      <Stack.Screen name="import" options={{ headerShown: true }} />
      <Stack.Screen name="notifications" options={{ headerShown: true }} />
      <Stack.Screen name="security" options={{ headerShown: true }} />
      <Stack.Screen name="settings" options={{ headerShown: true }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MoneyProvider>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </MoneyProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}