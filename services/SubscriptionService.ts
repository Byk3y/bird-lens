import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

const API_KEY = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
    // Add Android key here if needed
    android: '',
}) || '';

const ENTITLEMENT_ID = 'Birdsnap Pro';

export class SubscriptionService {
    private static instance: SubscriptionService;
    private isConfigured = false;

    private constructor() { }

    public static getInstance(): SubscriptionService {
        if (!SubscriptionService.instance) {
            SubscriptionService.instance = new SubscriptionService();
        }
        return SubscriptionService.instance;
    }

    /**
     * Initialize the RevenueCat SDK
     */
    public async initialize(): Promise<void> {
        if (this.isConfigured) {
            console.log('RevenueCat is already configured, skipping.');
            return;
        }

        if (!API_KEY) {
            console.warn('RevenueCat API Key is missing. Subscription service will not work.');
            return;
        }

        try {
            Purchases.setLogLevel(LOG_LEVEL.INFO);
            Purchases.configure({ apiKey: API_KEY });
            this.isConfigured = true;
            console.log('RevenueCat initialized successfully');
        } catch (error) {
            console.error('Failed to initialize RevenueCat:', error);
        }
    }

    /**
     * Fetch current offerings
     */
    public async getOfferings() {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null) {
                return offerings.current;
            }
            return null;
        } catch (error) {
            console.error('Error fetching offerings:', error);
            return null;
        }
    }

    /**
     * Check if user is subscribed
     */
    public async isSubscribed(): Promise<boolean> {
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
        } catch (error) {
            console.error('Error checking subscription status:', error);
            return false;
        }
    }

    /**
     * Purchase a package
     */
    public async purchasePackage(packageToPurchase: any) {
        try {
            const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
            if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined') {
                return { success: true, customerInfo };
            }
            return { success: false, customerInfo };
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Purchase failed:', error);
            }
            return { success: false, error };
        }
    }

    /**
     * Restore purchases
     */
    public async restorePurchases() {
        try {
            const customerInfo = await Purchases.restorePurchases();
            return customerInfo;
        } catch (error) {
            console.error('Restore failed:', error);
            return null;
        }
    }

    /**
     * Launch RevenueCat Customer Center
     */
    public async showCustomerCenter() {
        try {
            await RevenueCatUI.presentCustomerCenter();
        } catch (error) {
            console.error('Error presenting customer center:', error);
        }
    }

    /**
     * Present RevenueCat Paywall (Pre-built UI)
     */
    public async showPaywall() {
        try {
            const result = await RevenueCatUI.presentPaywall();
            // result is a string in newer versions or an object depending on the SDK version
            return result;
        } catch (error) {
            console.error('Error presenting paywall:', error);
            return null;
        }
    }
    /**
     * Link RevenueCat identity to Supabase user ID
     */
    public async logIn(userId: string) {
        try {
            const { customerInfo, created } = await Purchases.logIn(userId);
            console.log('RevenueCat identity logged in:', userId, 'Created:', created);
            return customerInfo;
        } catch (error) {
            console.error('RevenueCat login failed:', error);
            return null;
        }
    }

    /**
     * Clear RevenueCat identity on logout
     */
    public async logOut() {
        try {
            await Purchases.logOut();
            console.log('RevenueCat identity logged out');
        } catch (error) {
            console.error('RevenueCat logout failed:', error);
        }
    }
}

export const subscriptionService = SubscriptionService.getInstance();
