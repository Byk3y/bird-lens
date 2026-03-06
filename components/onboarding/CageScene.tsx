import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

const CAGE_WIDTH = 220;
const CAGE_HEIGHT = 280;
const BAR_COUNT = 8;
const BAR_COLOR = '#78716C';
const BAR_WIDTH = 2.5;
const DOME_HEIGHT = 65;
const BASE_HEIGHT = 12;
const DOOR_WIDTH = 50;
const DOOR_HEIGHT = 70;
const LOCK_RADIUS = 12;

// Cage body boundaries
const BODY_LEFT = (CAGE_WIDTH - CAGE_WIDTH * 0.75) / 2;
const BODY_RIGHT = CAGE_WIDTH - BODY_LEFT;
const BODY_TOP = DOME_HEIGHT;
const BODY_BOTTOM = CAGE_HEIGHT - BASE_HEIGHT;
const BODY_WIDTH = BODY_RIGHT - BODY_LEFT;

interface CageSceneProps {
  doorRotation: SharedValue<number>;
  onTap: () => void;
  phase: string;
}

export default function CageScene({ doorRotation, onTap, phase }: CageSceneProps) {
  // Pulsing glow for the lock
  const lockGlow = useSharedValue(0.3);

  useEffect(() => {
    lockGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const lockGlowStyle = useAnimatedStyle(() => ({
    opacity: lockGlow.value,
  }));

  const doorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { translateX: -DOOR_WIDTH / 2 },
      { rotateY: `${doorRotation.value}deg` },
      { translateX: DOOR_WIDTH / 2 },
    ],
  }));

  // Bar positions
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    return BODY_LEFT + (BODY_WIDTH / (BAR_COUNT - 1)) * i;
  });

  // Door position: centered in cage
  const doorLeft = BODY_LEFT + (BODY_WIDTH - DOOR_WIDTH) / 2;
  const doorTop = BODY_TOP + (BODY_BOTTOM - BODY_TOP - DOOR_HEIGHT) * 0.45;

  return (
    <View style={styles.container}>
      <Svg width={CAGE_WIDTH} height={CAGE_HEIGHT} viewBox={`0 0 ${CAGE_WIDTH} ${CAGE_HEIGHT}`}>
        {/* Dome top - full arc */}
        <Path
          d={`M ${BODY_LEFT} ${BODY_TOP} Q ${CAGE_WIDTH / 2} ${BODY_TOP - DOME_HEIGHT * 0.95} ${BODY_RIGHT} ${BODY_TOP}`}
          stroke={BAR_COLOR}
          strokeWidth={BAR_WIDTH}
          fill="none"
        />
        {/* Top horizontal bar - closes the cage top */}
        <Line
          x1={BODY_LEFT}
          y1={BODY_TOP}
          x2={BODY_RIGHT}
          y2={BODY_TOP}
          stroke={BAR_COLOR}
          strokeWidth={BAR_WIDTH}
        />
        {/* Top ring */}
        <Ellipse
          cx={CAGE_WIDTH / 2}
          cy={BODY_TOP - DOME_HEIGHT * 0.45}
          rx={6}
          ry={4}
          stroke={BAR_COLOR}
          strokeWidth={2}
          fill="none"
        />
        {/* Hook */}
        <Path
          d={`M ${CAGE_WIDTH / 2} ${BODY_TOP - DOME_HEIGHT * 0.49} Q ${CAGE_WIDTH / 2 + 6} ${BODY_TOP - DOME_HEIGHT * 0.65} ${CAGE_WIDTH / 2} ${BODY_TOP - DOME_HEIGHT * 0.75}`}
          stroke={BAR_COLOR}
          strokeWidth={2}
          fill="none"
        />
        {/* Dome bars (curved from top center down to body top) */}
        {[-0.3, -0.15, 0.15, 0.3].map((offset, i) => {
          const topX = CAGE_WIDTH / 2 + offset * BODY_WIDTH * 0.3;
          const topY = BODY_TOP - DOME_HEIGHT * 0.6;
          const bottomX = CAGE_WIDTH / 2 + offset * BODY_WIDTH;
          return (
            <Path
              key={`dome-bar-${i}`}
              d={`M ${topX} ${topY} Q ${(topX + bottomX) / 2} ${BODY_TOP - 10} ${bottomX} ${BODY_TOP}`}
              stroke={BAR_COLOR}
              strokeWidth={1.5}
              fill="none"
              opacity={0.5}
            />
          );
        })}
        {/* Horizontal rings */}
        {[0.25, 0.5, 0.75].map((pct, i) => {
          const y = BODY_TOP + (BODY_BOTTOM - BODY_TOP) * pct;
          return (
            <Line
              key={`ring-${i}`}
              x1={BODY_LEFT}
              y1={y}
              x2={BODY_RIGHT}
              y2={y}
              stroke={BAR_COLOR}
              strokeWidth={1.5}
              opacity={0.5}
            />
          );
        })}
        {/* Vertical bars */}
        {bars.map((x, i) => (
          <Line
            key={`bar-${i}`}
            x1={x}
            y1={BODY_TOP}
            x2={x}
            y2={BODY_BOTTOM}
            stroke={BAR_COLOR}
            strokeWidth={BAR_WIDTH}
            strokeLinecap="round"
          />
        ))}
        {/* Base platform */}
        <Rect
          x={BODY_LEFT - 10}
          y={BODY_BOTTOM}
          width={BODY_WIDTH + 20}
          height={BASE_HEIGHT}
          rx={4}
          fill={BAR_COLOR}
          opacity={0.7}
        />
        {/* Perch bar */}
        <Line
          x1={BODY_LEFT + 20}
          y1={BODY_BOTTOM - 45}
          x2={BODY_RIGHT - 20}
          y2={BODY_BOTTOM - 45}
          stroke={BAR_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.6}
        />
      </Svg>

      {/* Tap target — the whole cage is tappable */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (phase === 'idle') onTap();
        }}
        style={styles.fullTapTarget}
        accessibilityRole="button"
        accessibilityLabel="Release the bird to continue"
        accessibilityHint="Double tap to open the cage and proceed"
      >
        {/* Animated door */}
        <Animated.View
          style={[
            styles.doorVisual,
            { left: doorLeft, top: doorTop },
            doorAnimatedStyle,
          ]}
        >
          <Svg width={DOOR_WIDTH} height={DOOR_HEIGHT} viewBox={`0 0 ${DOOR_WIDTH} ${DOOR_HEIGHT}`}>
            <Rect
              x={1}
              y={1}
              width={DOOR_WIDTH - 2}
              height={DOOR_HEIGHT - 2}
              rx={3}
              stroke={BAR_COLOR}
              strokeWidth={2.5}
              fill="rgba(245, 245, 244, 0.6)"
            />
            {[0.33, 0.66].map((pct, i) => (
              <Line
                key={`dbar-${i}`}
                x1={DOOR_WIDTH * pct}
                y1={1}
                x2={DOOR_WIDTH * pct}
                y2={DOOR_HEIGHT - 1}
                stroke={BAR_COLOR}
                strokeWidth={BAR_WIDTH}
              />
            ))}
            {/* Door horizontal bar */}
            <Line
              x1={1}
              y1={DOOR_HEIGHT * 0.5}
              x2={DOOR_WIDTH - 1}
              y2={DOOR_HEIGHT * 0.5}
              stroke={BAR_COLOR}
              strokeWidth={1.5}
              opacity={0.5}
            />
          </Svg>
        </Animated.View>

        {/* Lock with animated glow */}
        <View style={[styles.lockContainer, { left: doorLeft + DOOR_WIDTH - 4, top: doorTop + DOOR_HEIGHT / 2 - LOCK_RADIUS - 6 }]}>
          {/* Outer glow ring - animated */}
          <Animated.View style={[styles.lockGlowOuter, lockGlowStyle]} />
          <Svg width={LOCK_RADIUS * 2 + 12} height={LOCK_RADIUS * 2 + 12}>
            <Circle
              cx={LOCK_RADIUS + 6}
              cy={LOCK_RADIUS + 6}
              r={LOCK_RADIUS + 3}
              fill="rgba(249, 115, 22, 0.2)"
            />
            <Circle
              cx={LOCK_RADIUS + 6}
              cy={LOCK_RADIUS + 6}
              r={LOCK_RADIUS}
              stroke="#F97316"
              strokeWidth={2.5}
              fill="rgba(249, 115, 22, 0.4)"
            />
            <Circle
              cx={LOCK_RADIUS + 6}
              cy={LOCK_RADIUS + 6}
              r={4}
              fill="#F97316"
            />
          </Svg>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CAGE_WIDTH,
    height: CAGE_HEIGHT,
    position: 'relative',
  },
  fullTapTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  doorVisual: {
    position: 'absolute',
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
  },
  lockContainer: {
    position: 'absolute',
    zIndex: 11,
  },
  lockGlowOuter: {
    position: 'absolute',
    width: LOCK_RADIUS * 2 + 24,
    height: LOCK_RADIUS * 2 + 24,
    borderRadius: LOCK_RADIUS + 12,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    left: -6,
    top: -6,
  },
});
