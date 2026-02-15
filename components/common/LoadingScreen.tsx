import { Colors, Spacing, Typography } from '@/constants/theme';
import LottieView from 'lottie-react-native';
import { ChevronLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

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
                                duration: 2500,
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
                                duration: 2500,
                                delay: 800,
                                loop: true,
                                repeatReverse: false,
                            }}
                            style={styles.pulse}
                        />

                        {/* Main Lottie Animation */}
                        <View style={styles.logoWrapper}>
                            <View style={styles.logoCircle}>
                                <LottieView
                                    source={require('@/assets/animations/bird-loading.lottie')}
                                    autoPlay
                                    loop
                                    style={styles.lottie}
                                />
                            </View>
                        </View>
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
        backgroundColor: Colors.background,
    },
    safeArea: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.lg,
        marginTop: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulse: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        backgroundColor: 'rgba(212, 32, 44, 0.05)',
    },
    logoWrapper: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    logoCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#fffcfc',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    lottie: {
        width: 200,
        height: 200,
    },
    textContainer: {
        marginTop: 80,
        alignItems: 'center',
    },
    label: {
        ...Typography.body,
        color: Colors.textSecondary,
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    dotRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: Colors.primary,
    },
});
