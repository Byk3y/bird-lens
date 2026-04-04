import { Colors, Spacing, Typography } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwlAvatar } from './OwlAvatar';

const BUBBLE_MESSAGES = [
  'Spotted a bird? Ask me!',
  'Need help identifying a bird?',
  'Tap me for birding tips!',
  'What bird did you see today?',
  'I can help with any bird question!',
  "Let's talk birds!",
];

// Module-level flag — ensures the bubble only shows once per app session, across all tab instances
let bubbleShownThisSession = false;

export function FloatingAssistantButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showBubble, setShowBubble] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  // Position above the tab bar (60px tab + bottom inset on iOS)
  const bottomOffset = Platform.OS === 'ios' ? 70 + insets.bottom : 80;

  useEffect(() => {
    if (bubbleShownThisSession) return;

    let dismissed = false;
    let showTimer: ReturnType<typeof setTimeout>;
    let autoHideTimer: ReturnType<typeof setTimeout>;

    (async () => {
      const raw = await AsyncStorage.getItem('@home_visit_count');
      const visitCount = parseInt(raw ?? '0', 10);

      const shouldShow = visitCount <= 3 || visitCount % 5 === 0;
      if (!shouldShow || dismissed) return;

      bubbleShownThisSession = true;
      setMessageIndex(Math.floor(Math.random() * BUBBLE_MESSAGES.length));

      showTimer = setTimeout(() => {
        if (!dismissed) setShowBubble(true);
      }, 1200);

      autoHideTimer = setTimeout(() => {
        if (!dismissed) setShowBubble(false);
      }, 1200 + 4500);
    })();

    return () => {
      dismissed = true;
      clearTimeout(showTimer);
      clearTimeout(autoHideTimer);
    };
  }, []);

  const handleBubbleTap = useCallback(() => {
    setShowBubble(false);
    router.push('/bird-assistant');
  }, [router]);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      {/* Speech bubble to the left of the FAB */}
      <AnimatePresence>
        {showBubble && (
          <MotiView
            key="speech-bubble"
            from={{ opacity: 0, scale: 0.85, translateX: 20 }}
            animate={{ opacity: 1, scale: 1, translateX: 0 }}
            exit={{ opacity: 0, scale: 0.85, translateX: 20 }}
            transition={{ type: 'spring', damping: 14, stiffness: 150 }}
            style={styles.bubbleRow}
          >
            <Pressable
              onPress={handleBubbleTap}
              style={styles.bubble}
              accessibilityRole="button"
              accessibilityLabel={`Bird assistant: ${BUBBLE_MESSAGES[messageIndex]}. Tap to chat.`}
            >
              <Text style={styles.bubbleText} numberOfLines={1}>
                {BUBBLE_MESSAGES[messageIndex]}
              </Text>
            </Pressable>
            {/* Arrow pointing toward Owlbert */}
            <View style={styles.bubbleArrow} />
          </MotiView>
        )}
      </AnimatePresence>

      {/* Existing FAB */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'timing', duration: 300, delay: 500 }}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/bird-assistant')}
          activeOpacity={0.85}
        >
          <OwlAvatar size={42} />
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
  },
  bubbleText: {
    fontSize: (Typography.caption as any).fontSize,
    fontWeight: '600',
    color: Colors.text,
  },
  bubbleArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.white,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FED7AA',
  },
});
