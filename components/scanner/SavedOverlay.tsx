import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { Check } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { styles } from './IdentificationResult.styles';

interface SavedOverlayProps {
    visible: boolean;
}

export const SavedOverlay = React.memo(({ visible }: SavedOverlayProps) => {
    return (
        <View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                {
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100,
                }
            ]}
        >
            <MotiView
                from={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: visible ? 1 : 0,
                    scale: visible ? 1 : 0.5
                }}
                transition={{
                    type: 'spring',
                    // MANDATORY PRESERVATION: Spring Physics Constants
                    damping: 15,
                    stiffness: 150,
                }}
                style={styles.savedBadge}
            >
                <BlurView intensity={40} tint="light" style={styles.savedBadgeBlur}>
                    <View style={styles.savedBadgeContent}>
                        <View style={styles.savedIconCircle}>
                            <Check color={Colors.white} size={28} strokeWidth={3} />
                        </View>
                        <Text style={styles.savedBadgeText}>Saved!</Text>
                    </View>
                </BlurView>
            </MotiView>
        </View>
    );
});
