import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDatabase } from '../lib/database';
import { useAuthStore } from '../stores';
import { theme } from '../constants/theme';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep native splash visible while we load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        await initialize();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
        // Hide native splash once init is done — animated splash takes over
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      {isReady && (
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      )}
      {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
