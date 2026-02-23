import { AuthModal } from '@/components/auth/AuthModal';
import { Paywall } from '@/components/Paywall';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { subscriptionService } from '@/services/SubscriptionService';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    ChevronRight,
    Crown,
    LogOut,
    User
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingRowProps {
    icon?: React.ReactNode;
    label: string;
    subtitle?: string;
    value?: string;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    onPress?: () => void;
    isLast?: boolean;
    tintColor?: string;
}

const SettingRow = ({
    icon,
    label,
    subtitle,
    value,
    hasSwitch,
    switchValue,
    onSwitchChange,
    onPress,
    isLast,
    tintColor = Colors.primary
}: SettingRowProps) => (
    <Pressable
        style={({ pressed }) => [
            styles.row,
            pressed && !hasSwitch && styles.rowPressed
        ]}
        onPress={hasSwitch ? undefined : onPress}
    >
        {icon && (
            <View style={[styles.iconContainer, { backgroundColor: tintColor + '10' }]}>
                {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { color: tintColor, size: 20 })}
            </View>
        )}
        <View style={[styles.rowContent, isLast && styles.noBorder]}>
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{label}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <View style={styles.rightContent}>
                {value && <Text style={styles.value}>{value}</Text>}
                {hasSwitch ? (
                    <Switch
                        value={switchValue}
                        onValueChange={onSwitchChange}
                        trackColor={{ false: '#e2e8f0', true: Colors.primary }}
                        ios_backgroundColor="#e2e8f0"
                    />
                ) : (
                    <ChevronRight color={Colors.textTertiary} size={20} />
                )}
            </View>
        </View>
    </Pressable>
);


export default function SettingsScreen() {
    const { user, session, signOut } = useAuth();
    const isGuest = user?.is_anonymous;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [autosave, setAutosave] = useState(false);
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);
    const [isPro, setIsPro] = useState(false);

    React.useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        const subscribed = await subscriptionService.isSubscribed();
        setIsPro(subscribed);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color={Colors.text} size={28} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Premium Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.premiumCard}
                >
                    <View style={styles.premiumInfo}>
                        <View style={styles.premiumTextContainer}>
                            <Text style={styles.premiumTitle}>Premium Plan</Text>
                            <Text style={styles.premiumSubtitle}>Status: {isPro ? 'Cardinal Pro' : (isGuest ? 'Free Member' : 'Free Account')}</Text>
                        </View>
                        <View style={styles.crownContainer}>
                            <Crown color="#fbbf24" size={24} />
                        </View>
                    </View>
                    {!isPro && (
                        <Pressable style={styles.upgradeBtn} onPress={() => setIsPaywallVisible(true)}>
                            <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                        </Pressable>
                    )}
                </MotiView>

                {/* Account Section */}
                <Text style={styles.sectionLabel}>{isGuest ? 'Guest Mode' : 'Account'}</Text>
                <View style={styles.section}>
                    {isGuest ? (
                        <SettingRow
                            icon={<User />}
                            label="Sign Up or Log In"
                            subtitle="Save your collection to the cloud"
                            tintColor={Colors.accent}
                            onPress={() => setIsAuthModalVisible(true)}
                        />
                    ) : (
                        <>
                            <SettingRow
                                icon={<User />}
                                label="Edit Profile"
                                onPress={() => router.push('/edit-profile')}
                            />
                            {isPro && (
                                <SettingRow
                                    icon={<Crown />}
                                    label="Manage Subscription"
                                    onPress={() => subscriptionService.showCustomerCenter()}
                                    tintColor="#fbbf24"
                                />
                            )}
                            <SettingRow
                                icon={<LogOut />}
                                label="Sign Out"
                                tintColor={Colors.error}
                                onPress={signOut}
                                isLast
                            />
                        </>
                    )}
                </View>

                {/* Preferences Section */}
                <Text style={styles.sectionLabel}>Preferences</Text>
                <View style={styles.section}>
                    <SettingRow
                        label="Autosave Photos"
                        hasSwitch
                        switchValue={autosave}
                        onSwitchChange={setAutosave}
                        isLast
                    />
                </View>

                {/* Support Section */}
                <Text style={styles.sectionLabel}>Support & Feedback</Text>
                <View style={styles.section}>
                    <SettingRow
                        label="Encourage Us"
                    />
                    <SettingRow
                        label="FAQ & Help"
                    />
                    <SettingRow
                        label="Suggestion"
                        isLast
                    />
                </View>

                {/* About Section */}
                <Text style={styles.sectionLabel}>About</Text>
                <View style={styles.section}>
                    <SettingRow
                        label="App Info"
                        value="v1.0.4"
                    />
                    <SettingRow
                        label="Tell Friends"
                    />
                    <SettingRow
                        label="Privacy Policy"
                    />
                    <SettingRow
                        label="Terms of Use"
                        isLast
                    />
                </View>

                <Text style={styles.footerText}>Made with ❤️ for bird lovers</Text>
            </ScrollView>

            <AuthModal
                visible={isAuthModalVisible}
                onClose={() => setIsAuthModalVisible(false)}
                initialMode="signup"
            />

            {isPaywallVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
                    <Paywall onClose={() => {
                        setIsPaywallVisible(false);
                        checkSubscription();
                    }} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 16,
    },
    premiumCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    premiumInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    premiumTextContainer: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        marginBottom: 4,
    },
    premiumSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    crownContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    upgradeBtn: {
        backgroundColor: '#fbbf24',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upgradeBtnText: {
        color: '#1e293b',
        fontSize: 16,
        fontWeight: '700',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 8,
        marginBottom: 8,
    },
    section: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowPressed: {
        backgroundColor: '#f8fafc',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    labelContainer: {
        flex: 1,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textTertiary,
        marginTop: 2,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    value: {
        fontSize: 15,
        color: Colors.textTertiary,
        fontWeight: '500',
    },
    footerText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
        fontWeight: '500',
    },
});
