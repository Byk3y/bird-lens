import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { analytics, Events } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { registerPushToken, requestNotificationPermission } from '@/lib/notifications';
import { onboardingState } from '@/lib/onboardingState';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationPermissionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const navigateToPaywall = useCallback(async () => {
        await onboardingState.markAsCompleted();
        router.push('/paywall');
    }, [router]);

    const handleEnable = useCallback(async () => {
        setIsLoading(true);
        try {
            const granted = await requestNotificationPermission();
            if (granted && user?.id) {
                await registerPushToken(user.id);
                analytics.capture(Events.ONBOARDING_COMPLETED, { notifications_enabled: true });
            } else {
                analytics.capture(Events.ONBOARDING_COMPLETED, { notifications_enabled: false });
            }
        } catch (e) {
            console.warn('[notification-permission] Error:', e);
        } finally {
            setIsLoading(false);
            await navigateToPaywall();
        }
    }, [user, navigateToPaywall]);

    const handleSkip = useCallback(async () => {
        analytics.capture(Events.ONBOARDING_COMPLETED, { notifications_enabled: false });
        await navigateToPaywall();
    }, [navigateToPaywall]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
            {/* Icon */}
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Ionicons name="notifications-outline" size={48} color="#F97316" />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.headline}>Never miss a{'\n'}rare sighting</Text>
                <Text style={styles.subtitle}>
                    Get weekly birding tips and reminders from Owlbert when birds are most active.
                </Text>
            </View>

            {/* Buttons */}
            <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
                <TouchableOpacity
                    onPress={handleEnable}
                    style={styles.enableButton}
                    activeOpacity={0.8}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.enableButtonText}>Enable Notifications</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSkip}
                    style={styles.skipButton}
                    activeOpacity={0.6}
                    disabled={isLoading}
                >
                    <Text style={styles.skipButtonText}>Not now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F4',
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 32,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FDBA74',
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
    },
    headline: {
        fontSize: 32,
        fontFamily: 'PoppinsBold',
        fontWeight: '700',
        color: '#1a1a1a',
        lineHeight: 40,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#78716C',
        lineHeight: 24,
        textAlign: 'center',
    },
    bottomArea: {
        paddingHorizontal: 28,
        gap: 12,
    },
    enableButton: {
        backgroundColor: '#1a1a1a',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    enableButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#A8A29E',
        fontSize: 15,
        fontWeight: '500',
    },
});
