import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface FeatherParticlesProps {
  phase: string;
  containerHeight: number;
}

interface Particle {
  id: number;
  startX: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  driftX: number;
  rotation: number;
}

const COLORS = ['#F97316', '#FBBF24', '#D4D4D4', '#A3A3A3', '#FB923C'];

function Feather({ particle, phase, containerHeight }: { particle: Particle; phase: string; containerHeight: number }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(particle.startX);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(particle.rotation);

  useEffect(() => {
    // Idle: gentle drift downward
    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: particle.duration * 0.3 }),
          withTiming(0, { duration: particle.duration * 0.7 })
        ),
        -1,
        false
      )
    );

    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(containerHeight * 0.6, { duration: particle.duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-20, { duration: 0 })
        ),
        -1,
        false
      )
    );

    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(particle.startX + particle.driftX, { duration: particle.duration * 0.5 }),
          withTiming(particle.startX - particle.driftX * 0.5, { duration: particle.duration * 0.5 })
        ),
        -1,
        true
      )
    );

    rotate.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(particle.rotation + 45, { duration: particle.duration * 0.5 }),
          withTiming(particle.rotation - 30, { duration: particle.duration * 0.5 })
        ),
        -1,
        true
      )
    );
  }, []);

  // Burst on bird flying
  useEffect(() => {
    if (phase === 'bird_flying') {
      const burstDir = Math.random() > 0.5 ? 1 : -1;
      opacity.value = withSequence(
        withTiming(0.9, { duration: 200 }),
        withTiming(0, { duration: 800 })
      );
      translateY.value = withTiming(containerHeight * 0.8, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
      translateX.value = withTiming(
        particle.startX + burstDir * (40 + Math.random() * 30),
        { duration: 1000, easing: Easing.out(Easing.cubic) }
      );
    }
  }, [phase]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.feather,
        {
          width: particle.size,
          height: particle.size * 0.4,
          backgroundColor: particle.color,
          borderRadius: particle.size * 0.2,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function FeatherParticles({ phase, containerHeight }: FeatherParticlesProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      startX: -30 + Math.random() * 60,
      size: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      delay: i * 800 + Math.random() * 500,
      duration: 3000 + Math.random() * 2000,
      driftX: 10 + Math.random() * 20,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <Feather key={p.id} particle={p} phase={phase} containerHeight={containerHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  feather: {
    position: 'absolute',
  },
});
