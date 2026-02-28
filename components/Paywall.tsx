import { useAlert } from '@/components/common/AlertProvider';
import { Links } from '@/constants/Links';
import { useAuth } from '@/lib/auth';
import { subscriptionService } from '@/services/SubscriptionService';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
import { Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PaywallProps {
    onClose: () => void;
}

const FEATURES = [
    'Identify any bird by photo or sound, instantly',
    'Access detailed profiles for 10,000+ species',
    'Build and track your personal bird collection',
    'Discover calls, songs, and habitat information',
    'Unlimited identifications, no daily limits',
    'Ad-free, distraction-free birding experience'
];

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
    const [offerings, setOfferings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const { showAlert } = useAlert();
    const { refreshSubscription } = useAuth();
    const insets = useSafeAreaInsets();

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
                await refreshSubscription();
                showAlert({
                    title: 'Welcome to BirdMark Pro!',
                    message: 'Your purchase was successful.',
                    actions: [{ text: 'Start Discovering', onPress: onClose }]
                });
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
                showAlert({
                    title: 'Success',
                    message: 'Purchases restored!',
                    actions: [{ text: 'OK', onPress: onClose }]
                });
            } else {
                showAlert({
                    title: 'Notice',
                    message: 'No active subscriptions found.'
                });
            }
        } catch (error) {
            console.error('Restore error:', error);
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
            <View style={styles.heroWrapper}>
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
                    <TouchableOpacity onPress={handleRestore} style={styles.topButton}>
                        <Text style={styles.topButtonText}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.topButton}>
                        <Text style={[styles.topButtonText, { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' }]}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>

                {/* Content Area - Changed to View for non-scrollable layout */}
                <View style={styles.mainContent}>
                    {/* Flexible spacer pushes everything down low */}
                    <View style={{ flex: 1 }} />

                    <View style={styles.innerContent}>
                        <Text style={styles.title}>BirdMark</Text>

                        <View style={styles.featuresList}>
                            {FEATURES.map((feature, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <View style={styles.checkBadge}>
                                        <Check color="#fff" size={12} strokeWidth={3} />
                                    </View>
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#D35400" style={{ marginVertical: 20 }} />
                        ) : (
                            <View style={styles.pricingSection}>
                                <Text style={styles.pricingMainTitle}>
                                    Try 7 days free
                                </Text>

                                <View style={styles.planSelector}>
                                    {/* Annual Plan Card */}
                                    <TouchableOpacity
                                        style={[
                                            styles.planCard,
                                            selectedPlan === 'annual' ? styles.planCardSelected : styles.planCardUnselected
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedPlan('annual')}
                                    >
                                        <View style={styles.planCardHeaderRow}>
                                            <Text style={styles.planCardTitle}>Annual</Text>
                                            <View style={styles.badgeContainer}>
                                                <Text style={styles.badgeText}>BEST VALUE</Text>
                                            </View>
                                        </View>
                                        <View style={styles.priceLineContainer}>
                                            <Text style={styles.heroPriceText}>
                                                {annualPackage ? `${annualPackage.product.priceString.replace(/[\d.,]+/, (match: string) => (parseFloat(match.replace(/,/g, '')) / 12).toFixed(2))} / month` : '$2.08 / month'}
                                            </Text>
                                            <Text style={styles.clarificationPriceText}>
                                                {annualPackage ? `${annualPackage.product.priceString} billed annually` : '$24.99 billed annually'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Monthly Plan Card */}
                                    <TouchableOpacity
                                        style={[
                                            styles.planCard,
                                            styles.planCardMonthly,
                                            selectedPlan === 'monthly' ? styles.planCardSelected : styles.planCardUnselected
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={() => setSelectedPlan('monthly')}
                                    >
                                        <View style={styles.planCardHeaderMonthly}>
                                            <Text style={styles.planCardTitle}>Monthly</Text>
                                        </View>
                                        <Text style={styles.planCardPrice}>{monthlyPackage ? `${monthlyPackage.product.priceString} billed monthly` : '$4.99 billed monthly'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Bottom Actions nested directly in flow */}
                        <View style={styles.bottomContainer}>
                            <Text style={styles.pricingSubText}>
                                We'll remind you 3 days before your trial ends.
                            </Text>

                            <TouchableOpacity
                                style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
                                activeOpacity={0.9}
                                onPress={() => activePackage && handlePurchase(activePackage)}
                                disabled={purchasing}
                            >
                                <Text style={styles.ctaText}>
                                    {purchasing ? 'Processing...' : 'Continue'}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.legalText}>
                                Renewals are automatic unless cancelled 24 hours before the trial ends. By subscribing, you agree to our{' '}
                                <Text
                                    style={styles.legalLink}
                                    onPress={() => WebBrowser.openBrowserAsync(Links.TERMS_OF_USE)}
                                >
                                    Terms of Use
                                </Text> and{' '}
                                <Text
                                    style={styles.legalLink}
                                    onPress={() => WebBrowser.openBrowserAsync(Links.PRIVACY_POLICY)}
                                >
                                    Privacy Policy
                                </Text>.
                            </Text>
                        </View>
                    </View>
                </View>
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
        height: '60%', // Image takes up top 60%
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
        paddingHorizontal: 25,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    },
    title: {
        fontSize: 34,
        fontFamily: 'PoppinsBold',
        fontWeight: '700', // Explicitly keep bold weight
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    featuresList: {
        gap: 8,
        marginBottom: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#D35400',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    featureText: {
        color: '#E5E5E5',
        fontSize: 16,
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
        marginTop: 4, // Reduced gap between cards and text
    },
    pricingSection: {
        width: '100%',
        alignItems: 'center',
    },
    planSelector: {
        width: '100%',
        gap: 8,
        marginBottom: 4, // Reduced gap below cards
        marginTop: 6,
    },
    planCard: {
        width: '100%',
        borderRadius: 12,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
    },
    planCardMonthly: {
        paddingVertical: 10,
    },
    planCardSelected: {
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.05)',
    },
    planCardUnselected: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    planCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    planCardHeaderMonthly: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    planCardTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    badgeContainer: {
        backgroundColor: '#F97316',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    planCardSubtext: {
        color: '#F97316',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    planCardPrice: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
    },
    pricingMainTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    planCardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    planCardRightSide: {
        alignItems: 'flex-end',
    },
    priceLineContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        width: '100%',
        marginTop: 4,
    },
    heroPriceText: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '700',
    },
    clarificationPriceText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    pricingMainText: {
        color: '#FFFFFF',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 2,
    },
    boldText: {
        fontWeight: '700',
    },
    pricingSubText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8, // Pulled tighter to button
        paddingHorizontal: 10,
        lineHeight: 16,
        fontWeight: '500',
    },
    ctaButton: {
        backgroundColor: '#D35400',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 25,
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
        letterSpacing: 0.5,
    },
    legalText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 14,
        marginTop: 12,
        paddingHorizontal: 15,
    },
    legalLink: {
        color: '#F97316',
        fontWeight: '600',
    },
    termsText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 14,
        marginTop: 5,
    },
    errorText: {
        color: '#FF453A',
        textAlign: 'center',
        padding: 20,
    }
});

