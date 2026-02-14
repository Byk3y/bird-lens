import { Colors, Spacing, Typography } from '@/constants/theme';
import { ChevronLeft, Search } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Easing } from 'react-native-reanimated';

interface LoadingScreenProps {
    message?: string;
    onBack?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Identifying...',
    onBack
}) => {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {onBack && (
                    <Pressable onPress={onBack} style={styles.backBtn}>
                        <ChevronLeft color={Colors.textSecondary} size={28} />
                    </Pressable>
                )}

                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        {/* Radar Pulses */}
                        <MotiView
                            from={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{
                                type: 'timing',
                                duration: 2000,
                                loop: true,
                                repeatReverse: false,
                            }}
                            style={styles.pulse}
                        />
                        <MotiView
                            from={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{
                                type: 'timing',
                                duration: 2000,
                                delay: 500,
                                loop: true,
                                repeatReverse: false,
                            }}
                            style={styles.pulse}
                        />

                        {/* Main Logo */}
                        <MotiView
                            from={{ scale: 0.9 }}
                            animate={{ scale: 1.1 }}
                            transition={{
                                type: 'timing',
                                duration: 1000,
                                loop: true,
                                repeatReverse: true,
                            }}
                            style={styles.logoWrapper}
                        >
                            <View style={styles.logoCircle}>
                                <View style={styles.birdIconWrapper}>
                                    {/* Using a stylized combination of Bird and Search */}
                                    <View style={styles.iconStack}>
                                        <MotiView
                                            animate={{ rotate: '360deg' }}
                                            transition={{
                                                type: 'timing',
                                                duration: 4000,
                                                loop: true,
                                                repeatReverse: false,
                                                easing: Easing.linear,
                                            }}
                                            style={styles.searchRadar}
                                        >
                                            <Search color={Colors.primary} size={64} strokeWidth={1} />
                                        </MotiView>
                                        <View style={styles.innerIcon}>
                                            <Text style={styles.logoEmoji}>🦅</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </MotiView>
                    </View>

                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                        style={styles.textContainer}
                    >
                        <Text style={styles.label}>{message}</Text>
                        <View style={styles.dotRow}>
                            {[0, 1, 2].map((i) => (
                                <MotiView
                                    key={i}
                                    from={{ opacity: 0.3 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                        type: 'timing',
                                        duration: 600,
                                        delay: i * 200,
                                        loop: true,
                                    }}
                                    style={styles.dot}
                                />
                            ))}
                        </View>
                    </MotiView>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    safeArea: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.lg,
        marginTop: Spacing.md,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulse: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: 'rgba(234, 88, 12, 0.05)',
    },
    logoWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff7ed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    birdIconWrapper: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconStack: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchRadar: {
        position: 'absolute',
        opacity: 0.4,
    },
    innerIcon: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoEmoji: {
        fontSize: 40,
    },
    textContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    label: {
        ...Typography.body,
        color: Colors.textSecondary,
        fontSize: 18,
        fontWeight: '600',
    },
    dotRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
});
