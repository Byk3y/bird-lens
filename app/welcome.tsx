import LottieView from 'lottie-react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import CageScene from '@/components/onboarding/CageScene';
import FeatherParticles from '@/components/onboarding/FeatherParticles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Phase = 'idle' | 'door_opening' | 'bird_flying' | 'transitioning';

export default function WelcomeScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  // Animated values
  const doorRotation = useSharedValue(0);
  const birdTranslateY = useSharedValue(0);
  const birdTranslateX = useSharedValue(0);
  const birdScale = useSharedValue(1);
  const screenOpacity = useSharedValue(1);
  const promptOpacity = useSharedValue(1);

  // Pulsing "Tap to release" text
  React.useEffect(() => {
    promptOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const navigateToOnboarding = useCallback(() => {
    router.push('/onboarding');
  }, [router]);

  const startReleaseSequence = useCallback(() => {
    if (phase !== 'idle') return;

    // Reduced motion: skip animations entirely
    if (reducedMotion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      AccessibilityInfo.announceForAccessibility('Bird released! Moving to next screen.');
      setTimeout(() => navigateToOnboarding(), 300);
      return;
    }

    // Phase 1: Door opening
    setPhase('door_opening');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    doorRotation.value = withTiming(-110, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Phase 2: Bird emerges from cage, then flies away
    setTimeout(() => {
      setPhase('bird_flying');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Stage 1: Emerge — rise slowly out of cage with a gentle wobble
      birdTranslateY.value = withSequence(
        withTiming(-120, { duration: 900, easing: Easing.out(Easing.quad) }),
        // Stage 2: Fly away — accelerate off screen
        withTiming(-SCREEN_HEIGHT, { duration: 1000, easing: Easing.in(Easing.cubic) })
      );

      birdScale.value = withSequence(
        withTiming(1.15, { duration: 900 }),
        withTiming(0.5, { duration: 1000 })
      );

      birdTranslateX.value = withSequence(
        withTiming(12, { duration: 300 }),
        withTiming(-8, { duration: 300 }),
        withTiming(10, { duration: 300 }),
        withTiming(-5, { duration: 300 }),
        withTiming(30, { duration: 700 })
      );

      // Stop the pulse
      promptOpacity.value = withTiming(0, { duration: 400 });

      // Phase 3: Transition out (after emerge + fly = 1900ms)
      setTimeout(() => {
        setPhase('transitioning');
        screenOpacity.value = withTiming(0, { duration: 400 });
        AccessibilityInfo.announceForAccessibility('Bird released!');
        setTimeout(() => navigateToOnboarding(), 450);
      }, 1900);
    }, 600);
  }, [phase, reducedMotion]);

  // Animated styles
  const birdAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: birdTranslateX.value },
      { translateY: birdTranslateY.value },
      { scale: birdScale.value },
    ],
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const promptAnimatedStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, screenAnimatedStyle]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Branding */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 200 }}
            style={styles.branding}
          >
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.title}>BirdMark</Text>
          </MotiView>

          {/* Cage + Bird */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 600, delay: 400 }}
            style={styles.cageArea}
          >
            <View style={styles.cageWrapper}>
              <CageScene
                doorRotation={doorRotation}
                onTap={startReleaseSequence}
                phase={phase}
              />
              {/* Bird Lottie positioned inside cage */}
              <Animated.View style={[styles.birdContainer, birdAnimatedStyle]}>
                <LottieView
                  source={require('@/assets/animations/bird-loading.lottie')}
                  autoPlay
                  loop
                  style={styles.birdLottie}
                />
              </Animated.View>
              {/* Feather particles */}
              <FeatherParticles phase={phase} containerHeight={260} />
            </View>
          </MotiView>

          {/* Prompt — directly below cage */}
          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 600 }}
            style={styles.promptArea}
          >
            <Animated.Text style={[styles.promptText, promptAnimatedStyle]}>
              Tap the cage to release
            </Animated.Text>
            <Text style={styles.subtitleText}>Every bird deserves to be free</Text>
          </MotiView>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F4',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 60,
  },
  branding: {
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  title: {
    fontSize: 36,
    color: '#1a1a1a',
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
  },
  cageArea: {
    alignItems: 'center',
  },
  cageWrapper: {
    width: 220,
    height: 280,
    position: 'relative',
  },
  birdContainer: {
    position: 'absolute',
    left: 25,
    top: 60,
    width: 170,
    height: 150,
    zIndex: 5,
  },
  birdLottie: {
    width: 170,
    height: 150,
  },
  promptArea: {
    alignItems: 'center',
    gap: 6,
  },
  promptText: {
    fontSize: 18,
    color: '#F97316',
    fontFamily: 'PoppinsBold',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#A8A29E',
    textAlign: 'center',
    fontWeight: '500',
  },
});
