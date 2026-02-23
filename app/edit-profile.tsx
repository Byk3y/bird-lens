import { useAlert } from '@/components/common/AlertProvider';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, User as UserIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function EditProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { showAlert } = useAlert();
    const [nickname, setNickname] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', user?.id)
                .single();

            if (error) throw error;
            if (data) {
                setNickname(data.nickname || '');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        const trimmedNickname = nickname.trim();
        const MAX_LN = 30;

        if (trimmedNickname.length > MAX_LN) {
            showAlert({
                title: 'Error',
                message: `Nickname must be ${MAX_LN} characters or less.`
            });
            return;
        }

        if (trimmedNickname.length < 2) {
            showAlert({
                title: 'Error',
                message: 'Nickname must be at least 2 characters.'
            });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    nickname: trimmedNickname,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            showAlert({
                title: 'Success',
                message: 'Profile updated successfully!',
                actions: [{ text: 'OK', onPress: () => router.back() }]
            });
        } catch (error: any) {
            showAlert({
                title: 'Error',
                message: error.message || 'Failed to update profile'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color={Colors.text} size={28} />
                </Pressable>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <Pressable onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable onPress={Keyboard.dismiss}>
                        {/* Profile Photo Row */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Profile Photo</Text>
                            <View style={styles.avatarPlaceholder}>
                                <UserIcon color="#94a3b8" size={32} />
                            </View>
                        </View>

                        {/* Nickname Row */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Nickname</Text>
                            <TextInput
                                style={styles.input}
                                value={nickname}
                                onChangeText={setNickname}
                                placeholder="Add nickname"
                                placeholderTextColor="#94a3b8"
                                autoCorrect={false}
                                maxLength={30}
                            />
                        </View>

                        {/* Email Row */}
                        <View style={[styles.row, styles.noBorder]}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.emailValue}>{user?.email}</Text>
                        </View>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    backBtn: {
        padding: 4,
    },
    saveBtn: {
        padding: 4,
    },
    saveText: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.accent,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        minHeight: 64,
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
        flex: 1,
    },
    input: {
        fontSize: 16,
        color: Colors.textTertiary,
        textAlign: 'right',
        flex: 2,
        paddingVertical: 0,
    },
    emailValue: {
        fontSize: 16,
        color: Colors.textTertiary,
        textAlign: 'right',
        flex: 2,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
