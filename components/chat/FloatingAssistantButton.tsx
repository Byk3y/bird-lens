import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwlAvatar } from './OwlAvatar';

export function FloatingAssistantButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Position above the tab bar (60px tab + bottom inset on iOS)
  const bottomOffset = Platform.OS === 'ios' ? 70 + insets.bottom : 80;

  return (
    <MotiView
      from={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 500 }}
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/bird-assistant')}
        activeOpacity={0.85}
      >
        <OwlAvatar size={34} />
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS Shadow
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    // Android
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
});
