import { AuthModal } from '@/components/auth/AuthModal';
import { Paywall } from '@/components/Paywall';
import { TellFriendsModal } from '@/components/shared/TellFriendsModal';
import { Links } from '@/constants/Links';
import { useAuth } from '@/lib/auth';
import { subscriptionService } from '@/services/SubscriptionService';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
    ChevronLeft,
    ChevronRight,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
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
    label: string;
    subtext?: string;
    value?: string;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    onPress?: () => void;
    isDestructive?: boolean;
}

const SettingRow = ({
    label,
    subtext,
    value,
    hasSwitch,
    switchValue,
    onSwitchChange,
    onPress,
    isDestructive
}: SettingRowProps) => (
    <Pressable
        style={({ pressed }) => [
            styles.row,
            pressed && !hasSwitch && styles.rowPressed,
            subtext ? { height: 72 } : undefined
        ]}
        onPress={hasSwitch ? undefined : onPress}
    >
        <View style={styles.rowContent}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.label, isDestructive && { color: '#FF3B30' }]}>{label}</Text>
                {subtext && <Text style={styles.subtext}>{subtext}</Text>}
            </View>
            <View style={styles.rightContent}>
                {value && <Text style={styles.value}>{value}</Text>}
                {hasSwitch ? (
                    <Switch
                        value={switchValue}
                        onValueChange={onSwitchChange}
                        trackColor={{ false: '#f1f5f9', true: '#34C759' }}
                        ios_backgroundColor="#E9E9EA"
                    />
                ) : (
                    <View pointerEvents="none">
                        <ChevronRight color="#C7C7CC" size={18} strokeWidth={2.5} />
                    </View>
                )}
            </View>
        </View>
    </Pressable>
);

const SectionSeparator = () => <View style={styles.separator} />;

export default function SettingsScreen() {
    const { user, signOut, deleteAccount, isPro, refreshSubscription } = useAuth();
    const isGuest = user?.is_anonymous;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [autosave, setAutosave] = useState(false);
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [isTellFriendsVisible, setIsTellFriendsVisible] = useState(false);
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: signOut
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This will permanently delete your account and all sightings. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await deleteAccount();
                        if (error) {
                            Alert.alert("Error", "Failed to delete account. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header}>
                <View style={[styles.headerContent, { marginTop: insets.top > 40 ? 0 : 10 }]}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <View pointerEvents="none">
                            <ChevronLeft color="#000000" size={26} strokeWidth={2.5} />
                        </View>
                    </Pressable>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Settings */}
                <View style={styles.group}>
                    <SettingRow
                        label="BirdMark Pro"
                        subtext={isPro ? "Status: Pro" : "Status: Free"}
                        onPress={() => isPro ? subscriptionService.showCustomerCenter() : setIsPaywallVisible(true)}
                    />

                    <SectionSeparator />

                    {isGuest ? (
                        <SettingRow
                            label="Sign Up or Log In"
                            onPress={() => setIsAuthModalVisible(true)}
                        />
                    ) : (
                        <SettingRow
                            label="Edit Profile"
                            onPress={() => router.push('/edit-profile')}
                        />
                    )}

                    {!isGuest && (
                        <SettingRow
                            label="Manage Account"
                            onPress={() => router.push('/manage-account')}
                        />
                    )}

                    <SettingRow
                        label="Autosave Photos to Album"
                        hasSwitch
                        switchValue={autosave}
                        onSwitchChange={setAutosave}
                    />
                </View>

                <SectionSeparator />

                {/* Support & Feedback */}
                <View style={styles.group}>
                    <SettingRow label="App Info" value={`v${Constants.expoConfig?.version || '1.0.0'}`} onPress={() => router.push('/app-info')} />
                    <SettingRow
                        label="Tell Friends"
                        onPress={() => setIsTellFriendsVisible(true)}
                    />
                </View>

                <SectionSeparator />

                {/* Legal Section */}
                <View style={styles.group}>
                    <SettingRow
                        label="Privacy Policy"
                        onPress={() => WebBrowser.openBrowserAsync(Links.PRIVACY_POLICY)}
                    />
                    <SettingRow
                        label="Terms of Use"
                        onPress={() => WebBrowser.openBrowserAsync(Links.TERMS_OF_USE)}
                    />
                </View>

                {/* Destructive Actions */}
                {!isGuest && (
                    <>
                        <SectionSeparator />
                        <View style={styles.group}>
                            <SettingRow
                                label="Sign Out"
                                isDestructive
                                onPress={handleSignOut}
                            />
                        </View>
                    </>
                )}
            </ScrollView>

            <AuthModal
                visible={isAuthModalVisible}
                onClose={() => setIsAuthModalVisible(false)}
                initialMode="signup"
            />

            <TellFriendsModal
                visible={isTellFriendsVisible}
                onClose={() => setIsTellFriendsVisible(false)}
            />

            <Modal visible={isPaywallVisible} animationType="slide" transparent={false}>
                <Paywall onClose={() => {
                    setIsPaywallVisible(false);
                    refreshSubscription();
                }} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        height: 50,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        color: '#000000',
        letterSpacing: -0.5,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    group: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
    },
    row: {
        height: 60,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    rowPressed: {
        backgroundColor: '#F2F2F7',
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 18,
        fontFamily: 'Outfit_300Light',
        color: '#1C1C1E',
        letterSpacing: -0.2,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    value: {
        fontSize: 17,
        fontFamily: 'Inter_300Light',
        color: '#8E8E93',
    },
    subtext: {
        fontSize: 14,
        fontFamily: 'Inter_300Light',
        color: '#8E8E93',
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: '#F2F2F7',
        width: '100%',
    },
});
