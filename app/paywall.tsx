import { Paywall } from '@/components/Paywall';
import { onboardingState } from '@/lib/onboardingState';
import { useRouter } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

export default function PaywallScreen() {
    const router = useRouter();

    const handleFinishOnboarding = async () => {
        await onboardingState.markAsCompleted();
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Paywall onClose={handleFinishOnboarding} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0A05',
    },
});
