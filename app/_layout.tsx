import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { AlertProvider } from '@/components/common/AlertProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { initAudioConfig } from '@/lib/audioConfig';
import { AuthProvider } from '@/lib/auth';
import { onboardingState } from '@/lib/onboardingState';
import { asyncStoragePersister, queryClient } from '@/lib/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    PoppinsBold: require('../assets/fonts/Poppins-Bold.ttf'),
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    console.log('[RootLayout] loaded:', loaded, 'error:', error);
    if (error) throw error;
  }, [error, loaded]);

  useEffect(() => {
    if (loaded) {
      console.log('[RootLayout] Hiding Splash Screen');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { subscriptionService } from '@/services/SubscriptionService';
import { useRouter, useSegments } from 'expo-router';
import { useState } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // 1. One-time system initialization
  useEffect(() => {
    async function initializeSystem() {
      try {
        await Promise.all([
          initAudioConfig().catch(err => console.warn('initAudioConfig error:', err)),
          subscriptionService.initialize().catch(err => console.error('RevenueCat initialization error:', err))
        ]);

        const completed = await onboardingState.isCompleted();
        setOnboardingCompleted(completed);
        setIsReady(true);
      } catch (e) {
        console.error('[RootLayoutNav] System initialization error:', e);
        setIsReady(true);
      }
    }
    initializeSystem();
  }, []);

  // 1b. Listen for onboarding state changes (Sync across components)
  useEffect(() => {
    const unsubscribe = onboardingState.onChange((completed) => {
      console.log('[RootLayoutNav] Onboarding state changed:', completed);
      setOnboardingCompleted(completed);
    });
    return unsubscribe;
  }, []);

  // 2. Routing logic (Guards)
  useEffect(() => {
    if (!isReady || onboardingCompleted === null) return;

    const isIntroFlow = segments[0] === 'welcome' || segments[0] === 'onboarding' || segments[0] === 'paywall';

    if (!onboardingCompleted && !isIntroFlow) {
      router.replace('/welcome');
    }
  }, [segments, isReady, onboardingCompleted]);

  if (!isReady) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AlertProvider>
            <ThemeProvider value={DefaultTheme}>
              <Stack>
                <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="paywall" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="edit-profile" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="bird-detail" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="search" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="tutorial/[slug]" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="manage-account" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="knowledge-level" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="delete-account-confirm" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </ThemeProvider>
          </AlertProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}
