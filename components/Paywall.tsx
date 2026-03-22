import { useAlert } from '@/components/common/AlertProvider';
import { Links } from '@/constants/Links';
import { useAuth } from '@/lib/auth';
import { cancelTrialReminder, requestNotificationPermission, scheduleTrialReminder } from '@/lib/notifications';
import { subscriptionService } from '@/services/SubscriptionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
import { Check } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PaywallProps {
    onClose: () => void;
}

const FEATURES = [
    'Unlimited bird identifications',
    'Identify any species by photo or sound, instantly',
    'Build a life list that tells your story',
    '10,000+ species with calls, songs and habitat info'
];

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
    const [offerings, setOfferings] = useState<any>(null);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const { showAlert } = useAlert();
    const { refreshSubscription } = useAuth();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const isTablet = screenWidth >= 768 || (Platform.OS === 'ios' && Platform.isPad);
    const heroHeight = isTablet ? '40%' : '60%';
    useEffect(() => {
        loadOfferings();
    }, []);

    const loadOfferings = async () => {
        setLoading(true);
        try {
            const currentOffering = await subscriptionService.getOfferings();
            setOfferings(currentOffering);
        } catch (error) {
            console.error('Error loading offerings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (pkg: PurchasesPackage) => {
        setPurchasing(true);
        try {
            const { success, error } = await subscriptionService.purchasePackage(pkg);
            if (success) {
                if (reminderEnabled) {
                    await scheduleTrialReminder();
                }
                await refreshSubscription();
                // Flag for the home screen to show the welcome alert after navigation
                await AsyncStorage.setItem('@show_pro_welcome', 'true');
                onClose();
            } else if (error && !error.userCancelled) {
                showAlert({
                    title: 'Error',
                    message: 'Something went wrong during purchase.'
                });
            }
        } catch (error) {
            console.error('Purchase error:', error);
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const customerInfo = await subscriptionService.restorePurchases();
            if (customerInfo?.entitlements.active['Birdsnap Pro']) {
                await refreshSubscription();
                onClose();
                setTimeout(() => {
                    showAlert({
                        title: 'Welcome Back! 🎉',
                        message: 'Your subscription has been restored.',
                        actions: [{ text: 'Continue' }]
                    });
                }, 400);
            } else {
                // Close paywall first so the alert Modal isn't nested inside it
                onClose();
                setTimeout(() => {
                    showAlert({
                        title: 'Notice',
                        message: 'No active subscriptions found.'
                    });
                }, 400);
            }
        } catch (error: any) {
            console.error('Restore error:', error);
            onClose();
            setTimeout(() => {
                showAlert({
                    title: 'Restore Failed',
                    message: error?.message || 'Something went wrong while restoring purchases. Please try again.'
                });
            }, 400);
        } finally {
            setLoading(false);
        }
    };

    // Auto-select the Annual package if available
    const annualPackage = offerings?.availablePackages?.find(
        (p: PurchasesPackage) => p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('annual') || p.identifier.toLowerCase().includes('year')
    ) || offerings?.availablePackages?.[0];

    const monthlyPackage = offerings?.availablePackages?.find(
        (p: PurchasesPackage) => p.packageType === 'MONTHLY' || p.identifier.toLowerCase().includes('monthly') || p.identifier.toLowerCase().includes('month')
    );

    // State to track selected plan type ('annual' or 'monthly')
    // Default to annual
    const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

    // Determine the active package based on selection
    const activePackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

    return (
        <View style={styles.container}>
            {/* Background Hero Image - Standalone Layer at the top */}
            <View style={[styles.heroWrapper, { height: heroHeight }]}>
                <ImageBackground
                    source={require('@/assets/images/paywall/hero-cardinal.webp')}
                    style={styles.heroBackground}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(15, 10, 5, 0.2)', 'rgba(15, 10, 5, 0.8)', '#0F0A05']}
                        locations={[0, 0.6, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                </ImageBackground>
            </View>

            {/* Main UI Content Layer */}
            <View style={[StyleSheet.absoluteFill, { paddingTop: Math.max(insets.top, 10) }]}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <View />
                    <TouchableOpacity onPress={onClose} style={styles.topButton}>
                        <Text style={styles.topButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Content Area - ScrollView for iPad compatibility */}
                <ScrollView
                    style={styles.mainContent}
                    contentContainerStyle={{ flexGrow: 1 }}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Flexible spacer pushes everything down low */}
                    <View style={{ flex: 1 }} />

                    <View style={[styles.innerContent, isTablet && styles.innerContentTablet]}>
                        <MotiView
                            from={{ opacity: 0, translateY: 15 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 900, delay: 200 }}
                        >
                            <Text style={styles.title}>Design Your Trial</Text>
                        </MotiView>

                        <MotiView
                            from={{ opacity: 0, translateY: 15 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 900, delay: 500 }}
                            style={styles.featuresList}
                        >
                            {FEATURES.map((feature, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <Check color="#F97316" size={20} strokeWidth={3} style={styles.checkIcon} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </MotiView>

                        {loading ? (
                            <ActivityIndicator size="large" color="#D35400" style={{ marginVertical: 20 }} />
                        ) : (
                            <MotiView
                                from={{ opacity: 0, translateY: 15 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 900, delay: 800 }}
                                style={styles.pricingSection}
                            >
                                <View style={styles.planToggle}>
                                    {/* Annual card — left */}
                                    <TouchableOpacity
                                        style={[styles.toggleCard, selectedPlan === 'annual' ? styles.toggleCardSelected : styles.toggleCardUnselected]}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedPlan('annual')}
                                    >
                                        <View>
                                            <Text style={[styles.toggleCardTitle, selectedPlan === 'annual' && styles.toggleCardTitleSelected]}>Annual</Text>
                                            <Text style={[styles.toggleCardSub, selectedPlan === 'annual' && styles.toggleCardSubSelected]}>7 days free</Text>
                                        </View>
                                        <View style={[styles.toggleRadio, selectedPlan === 'annual' && styles.toggleRadioSelected]}>
                                            {selectedPlan === 'annual' && <Check color="#fff" size={14} strokeWidth={3} />}
                                        </View>
                                    </TouchableOpacity>

                                    {/* Monthly card — right */}
                                    <TouchableOpacity
                                        style={[styles.toggleCard, selectedPlan === 'monthly' ? styles.toggleCardSelected : styles.toggleCardUnselected]}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedPlan('monthly')}
                                    >
                                        <View>
                                            <Text style={[styles.toggleCardTitle, selectedPlan === 'monthly' && styles.toggleCardTitleSelected]}>Monthly</Text>
                                            <Text style={[styles.toggleCardSub, selectedPlan === 'monthly' && styles.toggleCardSubSelected]}>7 days free</Text>
                                        </View>
                                        <View style={[styles.toggleRadio, selectedPlan === 'monthly' && styles.toggleRadioSelected]}>
                                            {selectedPlan === 'monthly' && <Check color="#fff" size={14} strokeWidth={3} />}
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.priceAfterTrial}>
                                    {selectedPlan === 'annual'
                                        ? <>7 days free, then just <Text style={styles.priceAmount}>{annualPackage?.product.priceString ?? '$24.99'}</Text>/yr{'\n'}(~{annualPackage?.product.price
                                            ? new Intl.NumberFormat(undefined, { style: 'currency', currency: annualPackage.product.currencyCode }).format(annualPackage.product.price / 12)
                                            : '$2.08'}/mo)</>
                                        : <>7 days free, then just <Text style={styles.priceAmount}>{monthlyPackage?.product.priceString ?? '$4.99'}</Text>/mo</>}
                                </Text>
                            </MotiView>
                        )}

                        {/* Bottom Actions nested directly in flow */}
                        <MotiView
                            from={{ opacity: 0, translateY: 15 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 900, delay: 1100 }}
                            style={styles.bottomContainer}
                        >
                            <TouchableOpacity
                                style={[styles.ctaButton, (purchasing || !activePackage) && styles.ctaButtonDisabled]}
                                activeOpacity={0.9}
                                onPress={() => activePackage && handlePurchase(activePackage)}
                                disabled={purchasing || !activePackage}
                            >
                                <Text style={styles.ctaText}>
                                    {purchasing ? 'Processing...' : 'Continue'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.reminderToggleContainer}>
                                <Text style={styles.reminderText}>
                                    Remind me before the trial ends
                                </Text>
                                <Switch
                                    value={reminderEnabled}
                                    onValueChange={async (value) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        if (value) {
                                            const granted = await requestNotificationPermission();
                                            if (!granted) return;
                                        } else {
                                            await cancelTrialReminder();
                                        }
                                        setReminderEnabled(value);
                                    }}
                                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#D35400' }}
                                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (reminderEnabled ? '#FFFFFF' : '#f4f3f4')}
                                    ios_backgroundColor="rgba(255,255,255,0.2)"
                                />
                            </View>

                            <View style={styles.footerLinks}>
                                <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(Links.TERMS_OF_USE)}>
                                    <Text style={styles.footerLinkText}>Terms of Use</Text>
                                </TouchableOpacity>
                                <Text style={styles.footerSeparator}>|</Text>
                                <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(Links.PRIVACY_POLICY)}>
                                    <Text style={styles.footerLinkText}>Privacy Policy</Text>
                                </TouchableOpacity>
                                <Text style={styles.footerSeparator}>|</Text>
                                <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(Links.SUBSCRIPTION_TERMS)}>
                                    <Text style={styles.footerLinkText}>Subscription Terms</Text>
                                </TouchableOpacity>
                                <Text style={styles.footerSeparator}>|</Text>
                                <TouchableOpacity onPress={handleRestore}>
                                    <Text style={styles.footerLinkText}>Restore</Text>
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    </View>
                </ScrollView>
            </View>

            {/* Hovering Lottie animation indicating Double Click to Pay */}
            {purchasing && Platform.OS === 'ios' && (
                <View style={styles.doubleClickAnimationContainer}>
                    <LottieView
                        source={require('@/assets/animations/bird-loading.lottie')}
                        autoPlay
                        loop
                        style={styles.doubleClickLottie}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0A05',
    },
    heroWrapper: {
        width: '100%',
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
    },
    heroBackground: {
        width: '100%',
        height: '100%',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topButton: {
        paddingVertical: 10,
    },
    topButtonText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 16,
        fontWeight: '500',
    },
    mainContent: {
        flex: 1,
    },
    innerContent: {
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    innerContentTablet: {
        maxWidth: 500,
        alignSelf: 'center' as const,
        width: '100%' as const,
    },
    title: {
        fontSize: 34,
        fontFamily: 'PoppinsBold',
        fontWeight: '700', // Explicitly keep bold weight
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    featuresList: {
        gap: 10,
        marginBottom: 28,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkIcon: {
        marginRight: 10,
    },
    featureText: {
        color: '#E5E5E5',
        fontSize: 16, // Adjusted slightly to ensure single line fit across most devices
        fontWeight: '500',
        flex: 1,
    },
    doubleClickAnimationContainer: {
        position: 'absolute',
        top: '22%', // Align roughly with the physical side button on iOS devices (moved slightly higher)
        right: 10,
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none', // Don't block touches below it
    },
    doubleClickLottie: {
        width: 140,
        height: 140,
    },
    bottomContainer: {
        width: '100%',
        marginTop: 8,
    },
    pricingSection: {
        width: '100%',
        alignItems: 'center',
    },
    planToggle: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginBottom: 16,
    },
    toggleCard: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    toggleCardSelected: {
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
    },
    toggleCardUnselected: {
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    toggleCardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    toggleCardTitleSelected: {
        color: '#F97316',
    },
    toggleCardSub: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    toggleCardSubSelected: {
        color: '#F97316',
    },
    toggleRadio: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleRadioSelected: {
        backgroundColor: '#F97316',
        borderColor: '#F97316',
    },
    priceAfterTrial: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '300',
        textAlign: 'center',
        marginBottom: 8,
        minHeight: 50,
    },
    priceAmount: {
        fontWeight: '800',
        fontSize: 22,
    },
    reminderText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    reminderToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    ctaButton: {
        backgroundColor: '#D35400',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#D35400',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    ctaButtonDisabled: {
        opacity: 0.6,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    footerLinks: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        flexWrap: 'wrap' as const,
        gap: 6,
    },
    footerLinkText: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: 13,
        fontWeight: '500' as const,
    },
    footerSeparator: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 13,
    },
});

