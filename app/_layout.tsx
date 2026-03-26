import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { AlertProvider } from '@/components/common/AlertProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { analytics } from '@/lib/analytics';
import { initAudioConfig } from '@/lib/audioConfig';
import { AuthProvider, useAuth } from '@/lib/auth';
import { onboardingState } from '@/lib/onboardingState';
import { asyncStoragePersister, queryClient } from '@/lib/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/ modal` keeps a back button present.
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

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { subscriptionService } from '@/services/SubscriptionService';
import { useState } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // 1. One-time system initialization
  useEffect(() => {
    async function initializeSystem() {
      try {
        await Promise.all([
          initAudioConfig().catch((err) => console.warn('initAudioConfig error:', err)),
          subscriptionService.initialize().catch((err) => console.error('RevenueCat initialization error:', err)),
        ]);

        // Silently pre-fetch offerings in the background so the Paywall opens instantly later
        subscriptionService.getOfferings().catch((err) => console.log('Background offering pre-fetch failed:', err));

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

  // 2. Hide splash once state is resolved and the correct screen group will render
  useEffect(() => {
    if (!isReady || onboardingCompleted === null) return;
    SplashScreen.hideAsync();
  }, [isReady, onboardingCompleted]);

  if (!isReady || onboardingCompleted === null) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
        options={{
          host: 'https://us.i.posthog.com',
          enableSessionReplay: false,
          captureAppLifecycleEvents: true,
        }}
      >
        <AppContent onboardingCompleted={onboardingCompleted} />
      </PostHogProvider>
    </View>
  );
}

// Separate component so we can successfully call usePostHog() *after* the Provider wraps it
function AppContent({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const posthog = usePostHog();
  const segments = useSegments();
  const pathname = usePathname();

  // Initialize the analytics singleton so non-React code can fire events
  useEffect(() => {
    if (posthog) analytics.init(posthog);
  }, [posthog]);

  // TestFlight Force Ping
  useEffect(() => {
    posthog.capture('TestFlight_App_Open', { source: 'forced_manual_ping' });
  }, []);

  // Screen Auto-Tracking
  useEffect(() => {
    if (pathname && posthog) {
      posthog.screen(pathname, { segments: segments });
    }
  }, [pathname, segments]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AnalyticsIdentify />
          <AlertProvider>
            <ThemeProvider value={DefaultTheme}>
              <Stack>
                {/* Onboarding flow — only accessible when onboarding is NOT complete */}
                <Stack.Protected guard={!onboardingCompleted}>
                  <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
                  <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
                </Stack.Protected>

                {/* Paywall — accessible in both states (shown after onboarding + from settings) */}
                <Stack.Screen name="paywall" options={{ headerShown: false, animation: 'slide_from_bottom' }} />

                {/* Main app — only accessible when onboarding IS complete */}
                <Stack.Protected guard={!!onboardingCompleted}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="edit-profile" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="bird-detail" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="search" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
                  <Stack.Screen name="tutorial/[slug]" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="manage-account" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="knowledge-level" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="delete-account-confirm" options={{ presentation: 'card', headerShown: false }} />
                  <Stack.Screen name="(enhancer)" options={{ headerShown: false, animation: 'none' }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack.Protected>
              </Stack>
            </ThemeProvider>
          </AlertProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}

function AnalyticsIdentify() {
  const { user, isPro, isGuest } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    if (!user.is_anonymous) {
      analytics.identify(user.id, { is_pro: isPro, is_guest: isGuest });
    }
  }, [user?.id, user?.is_anonymous, isPro, isGuest]);

  return null;
}
