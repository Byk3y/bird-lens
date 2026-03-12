import { Paywall } from '@/components/Paywall';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, MailCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const TRIAL_BANNER_DISMISSED_KEY = '@trial_banner_dismissed';

export const TrialBanner: React.FC = () => {
    const { isPro, refreshSubscription } = useAuth();
    const [dismissed, setDismissed] = useState(true); // Start hidden until loaded
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);

    useEffect(() => {
        checkDismissed();
    }, []);

    const checkDismissed = async () => {
        try {
            const value = await AsyncStorage.getItem(TRIAL_BANNER_DISMISSED_KEY);
            setDismissed(value === 'true');
        } catch {
            setDismissed(false);
        }
    };

    const handleDismiss = async () => {
        setDismissed(true);
        await AsyncStorage.setItem(TRIAL_BANNER_DISMISSED_KEY, 'true');
    };

    const handlePress = () => {
        setIsPaywallVisible(true);
    };

    const handlePaywallClose = () => {
        setIsPaywallVisible(false);
        refreshSubscription();
    };

    // Don't show if user is Pro or has dismissed
    if (isPro || dismissed) return null;

    return (
        <>
            <View style={styles.container}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handlePress}
                    onLongPress={handleDismiss}
                >
                    <LinearGradient
                        colors={['#2c3e50', '#1a252f']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.banner}
                    >
                        <View style={styles.iconContainer}>
                            <MailCheck color="#fbbf24" size={24} />
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>1</Text>
                            </View>
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.title}>Your free 7-day Premium hasn't</Text>
                            <Text style={styles.title}>been claimed yet. Tap to claim.</Text>
                        </View>

                        <ChevronRight color="#c4a882" size={22} strokeWidth={2.5} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <Modal visible={isPaywallVisible} animationType="slide" transparent={false}>
                <Paywall onClose={handlePaywallClose} />
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 26,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    iconContainer: {
        position: 'relative',
        marginRight: 14,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.error,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#e8d5b5',
        fontSize: 15.5,
        fontWeight: '600',
        lineHeight: 22,
    },
});
