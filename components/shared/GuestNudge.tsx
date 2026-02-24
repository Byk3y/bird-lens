import { Colors, Typography } from '@/constants/theme';
import { Cloud, Sparkles, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GuestNudgeProps {
    onPress: () => void;
    onClose?: () => void;
}

export const GuestNudge = ({ onPress, onClose }: GuestNudgeProps) => {
    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.mainInfo}>
                    <Cloud color="#3b82f6" size={20} />
                    <Text style={styles.title}>Sign up to sync your sightings</Text>
                    <Sparkles color="#fbbf24" size={14} />
                </View>

                <Pressable style={styles.button} onPress={onPress}>
                    <Text style={styles.buttonText}>Sign Up</Text>
                </Pressable>
            </View>

            {onClose && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                    <X color={Colors.textTertiary} size={16} />
                </Pressable>
            )}
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    title: {
        ...Typography.body,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    closeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.white,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
});
