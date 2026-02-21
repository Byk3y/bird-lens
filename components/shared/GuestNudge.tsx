import { Colors, Spacing, Typography } from '@/constants/theme';
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
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.container}
        >
            <View style={styles.iconContainer}>
                <Cloud color="#3b82f6" size={24} />
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Sync Your Sightings</Text>
                    <Sparkles color="#fbbf24" size={16} />
                </View>
                <Text style={styles.subtitle}>
                    Link an account to sync your bird collection across all your devices.
                </Text>

                <Pressable style={styles.button} onPress={onPress}>
                    <Text style={styles.buttonText}>Sync Now</Text>
                </Pressable>
            </View>

            {onClose && (
                <Pressable style={styles.closeBtn} onPress={onClose}>
                    <X color={Colors.textTertiary} size={18} />
                </Pressable>
            )}
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: Spacing.md,
        flexDirection: 'row',
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    title: {
        ...Typography.h3,
        fontSize: 16,
        color: Colors.text,
    },
    subtitle: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        lineHeight: 18,
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    buttonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    closeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 4,
    },
});
