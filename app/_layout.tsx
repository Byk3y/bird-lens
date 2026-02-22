import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
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
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { subscriptionService } from '@/services/SubscriptionService';

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Basic setup for audio playback across the app
    initAudioConfig().catch(err => console.warn('initAudioConfig error:', err));

    // Initialize RevenueCat
    subscriptionService.initialize().catch(err => console.error('RevenueCat initialization error:', err));
  }, []);

  return (
    <AuthProvider>
      <AlertProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="bird-detail" options={{ presentation: 'card', headerShown: false }} />
            <Stack.Screen name="search" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="birding-tips" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="identification-detail" options={{ presentation: 'transparentModal', headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </AlertProvider>
    </AuthProvider>
  );
}
