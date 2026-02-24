import { useAlert } from '@/components/common/AlertProvider';
import { useAuth } from '@/lib/auth';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeleteAccountConfirmScreen() {
    const { deleteAccount } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [agreed, setAgreed] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!agreed) return;

        setIsDeleting(true);
        try {
            const { error } = await deleteAccount();
            if (error) {
                showAlert({
                    title: "Error",
                    message: "Failed to delete account. Please try again."
                });
            } else {
                // Auth guard in layout will redirect to login/welcome automatically
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <SafeAreaView style={styles.header}>
                <View style={[styles.headerContent, { marginTop: insets.top > 40 ? 0 : 10 }]}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color="#000000" size={26} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Delete Account</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <View style={styles.content}>
                <View style={styles.card}>
                    {/* Visual Warning Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.avatarCircle}>
                            <View style={styles.iconDoc}>
                                <View style={styles.iconLine} />
                                <View style={styles.iconLineSmall} />
                            </View>
                            <View style={styles.deleteCircle}>
                                <Text style={styles.xText}>×</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.warningText}>
                        If you choose to delete your account, all of your data will be deleted and cannot be recovered. Are you sure that you want to delete your account?
                    </Text>

                    <Pressable
                        style={styles.checkboxContainer}
                        onPress={() => setAgreed(!agreed)}
                    >
                        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                            {agreed && <View style={styles.checkboxInner} />}
                        </View>
                        <Text style={styles.checkboxLabel}>Yes, I know.</Text>
                    </Pressable>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.deleteBtn,
                                !agreed && styles.deleteBtnDisabled,
                                agreed && styles.deleteBtnActive
                            ]}
                            onPress={handleDelete}
                            disabled={!agreed || isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color={agreed ? "#FFFFFF" : "#8E8E93"} />
                            ) : (
                                <Text style={[
                                    styles.deleteBtnText,
                                    !agreed && styles.deleteBtnTextDisabled,
                                    agreed && styles.deleteBtnTextActive
                                ]}>
                                    Delete
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
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
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    iconContainer: {
        marginBottom: 32,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EBF5FF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconDoc: {
        width: 40,
        height: 40,
        borderWidth: 2,
        borderColor: '#93C5FD',
        borderRadius: 4,
        padding: 6,
        justifyContent: 'center',
        gap: 6,
    },
    iconLine: {
        height: 2,
        backgroundColor: '#93C5FD',
        width: '100%',
    },
    iconLineSmall: {
        height: 2,
        backgroundColor: '#93C5FD',
        width: '60%',
    },
    deleteCircle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF6B6B',
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    xText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: -2,
    },
    warningText: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#1C1C1E',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        alignSelf: 'flex-start',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#C7C7CC',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        borderColor: '#FF3B30',
        backgroundColor: '#FF3B30',
    },
    checkboxInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
    },
    checkboxLabel: {
        fontSize: 15,
        fontFamily: 'Inter_300Light',
        color: '#1C1C1E',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        color: '#FF3B30',
        fontFamily: 'Outfit_600SemiBold',
    },
    deleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtnDisabled: {
        backgroundColor: '#F2F2F7',
        borderColor: '#F2F2F7',
    },
    deleteBtnActive: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    deleteBtnText: {
        fontSize: 16,
        color: '#8E8E93',
        fontFamily: 'Outfit_600SemiBold',
    },
    deleteBtnTextDisabled: {
        color: '#C7C7CC',
    },
    deleteBtnTextActive: {
        color: '#FFFFFF',
    },
});
