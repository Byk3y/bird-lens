import { useAlert } from '@/components/common/AlertProvider';
import { subscriptionService } from '@/services/SubscriptionService';
import { BlurView } from 'expo-blur';
import { Check, Crown, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

interface PaywallProps {
    onClose: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
    const [offerings, setOfferings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const { showAlert } = useAlert();

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
                showAlert({
                    title: 'Success',
                    message: 'Welcome to BirdSnap Pro!',
                    actions: [{ text: 'Great!', onPress: onClose }]
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

    return (
        <View style={styles.container}>
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

            <View style={styles.content}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <X color="#fff" size={24} />
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={styles.header}
                    >
                        <View style={styles.iconContainer}>
                            <Crown color="#EFB11D" size={40} fill="#EFB11D" />
                        </View>
                        <Text style={styles.title}>BirdSnap Pro</Text>
                        <Text style={styles.subtitle}>Unlock detailed identification, offline maps, and unlimited song recordings.</Text>
                    </MotiView>

                    <View style={styles.features}>
                        {[
                            'Unlimited Bird Identification',
                            'Advanced Bird Detail Insights',
                            'Save Unlimited Sightings',
                            'Custom Collections',
                            'Ad-Free Experience'
                        ].map((feature, index) => (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                transition={{ delay: index * 100 }}
                                style={styles.featureItem}
                            >
                                <Check color="#4ADE80" size={20} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </MotiView>
                        ))}
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#EFB11D" style={{ marginTop: 40 }} />
                    ) : offerings?.availablePackages ? (
                        <View style={styles.packagesContainer}>
                            {offerings.availablePackages.map((pkg: PurchasesPackage, index: number) => (
                                <TouchableOpacity
                                    key={pkg.identifier}
                                    style={[styles.packageCard, index === 0 && styles.featuredPackage]}
                                    onPress={() => handlePurchase(pkg)}
                                    disabled={purchasing}
                                >
                                    <View>
                                        <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                                        <Text style={styles.packageDescription}>{pkg.product.description}</Text>
                                    </View>
                                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.errorText}>Unable to load subscription plans. Please check your internet connection or try again later.</Text>
                    )}

                    <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
                        <Text style={styles.restoreText}>Restore Purchases</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        Payment will be charged to your Apple ID account at the confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period.
                    </Text>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        marginTop: 60,
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 8,
    },
    scrollContent: {
        paddingTop: 40,
        paddingBottom: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(239, 177, 29, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#A0A0A5',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    features: {
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        color: '#E5E5E7',
        fontSize: 16,
        marginLeft: 12,
    },
    packagesContainer: {
        gap: 15,
    },
    packageCard: {
        backgroundColor: '#2C2C2E',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    featuredPackage: {
        borderColor: '#EFB11D',
        backgroundColor: '#3A3A3C',
    },
    packageTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    packageDescription: {
        color: '#A0A0A5',
        fontSize: 14,
        marginTop: 2,
    },
    packagePrice: {
        color: '#EFB11D',
        fontSize: 20,
        fontWeight: '800',
    },
    restoreButton: {
        marginTop: 30,
        alignItems: 'center',
    },
    restoreText: {
        color: '#A0A0A5',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    footerNote: {
        marginTop: 30,
        fontSize: 12,
        color: '#636366',
        textAlign: 'center',
        lineHeight: 16,
    },
    errorText: {
        color: '#FF453A',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    }
});
