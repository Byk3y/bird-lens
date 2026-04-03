import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

interface OwlAvatarProps {
  size?: number;
}

export function OwlAvatar({ size = 40 }: OwlAvatarProps) {
  // Scale everything relative to a 100x100 viewBox
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ear tufts */}
      <Path
        d="M25 30 L18 10 L35 25 Z"
        fill="#E8650A"
      />
      <Path
        d="M75 30 L82 10 L65 25 Z"
        fill="#E8650A"
      />

      {/* Body / head circle */}
      <Circle cx={50} cy={52} r={38} fill="#F97316" />

      {/* Belly patch */}
      <Ellipse cx={50} cy={65} rx={24} ry={20} fill="#FED7AA" />

      {/* Left eye white */}
      <Circle cx={36} cy={44} r={14} fill="#FFFFFF" />
      {/* Right eye white */}
      <Circle cx={64} cy={44} r={14} fill="#FFFFFF" />

      {/* Left eye ring */}
      <Circle cx={36} cy={44} r={14} fill="none" stroke="#E8650A" strokeWidth={2} />
      {/* Right eye ring */}
      <Circle cx={64} cy={44} r={14} fill="none" stroke="#E8650A" strokeWidth={2} />

      {/* Left pupil */}
      <Circle cx={38} cy={43} r={7} fill="#1E293B" />
      {/* Right pupil */}
      <Circle cx={66} cy={43} r={7} fill="#1E293B" />

      {/* Left eye shine */}
      <Circle cx={41} cy={40} r={2.5} fill="#FFFFFF" />
      {/* Right eye shine */}
      <Circle cx={69} cy={40} r={2.5} fill="#FFFFFF" />

      {/* Beak */}
      <Path
        d="M46 53 L50 60 L54 53 Z"
        fill="#FF3B30"
      />

      {/* Feet */}
      <G>
        <Path
          d="M38 88 L32 96 M38 88 L38 96 M38 88 L44 96"
          stroke="#F97316"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d="M62 88 L56 96 M62 88 L62 96 M62 88 L68 96"
          stroke="#F97316"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </G>

      {/* Wing left */}
      <Path
        d="M16 55 Q12 65 20 75 Q28 70 26 58 Z"
        fill="#E8650A"
      />
      {/* Wing right */}
      <Path
        d="M84 55 Q88 65 80 75 Q72 70 74 58 Z"
        fill="#E8650A"
      />
    </Svg>
  );
}
