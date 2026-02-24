import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Camera, ChevronLeft, ChevronRight, GraduationCap, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManageAccountScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [snapCount, setSnapCount] = useState<number | null>(null);
    const [knowledgeLevel, setKnowledgeLevel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;

        try {
            // Fetch Sighting Count
            const { count, error: countError } = await supabase
                .from('sightings')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user?.id);

            if (!countError) {
                setSnapCount(count || 0);
            }

            // Fetch Profile info for knowledge level
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('knowledge_level')
                .eq('id', user.id)
                .single();

            if (!profileError && profile) {
                setKnowledgeLevel(profile.knowledge_level);
            }
        } catch (error) {
            console.error('Error fetching manage account data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.header}>
                <View style={[styles.headerContent, { marginTop: insets.top > 40 ? 0 : 10 }]}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color="#000000" size={26} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Manage Account</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 40 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Banner */}
                <LinearGradient
                    colors={['#FF3B30', '#FF9500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.banner}
                >
                    <Text style={styles.bannerText}>Thank you for joining BirdSnap!</Text>
                </LinearGradient>

                {/* Statistics Section */}
                <Text style={styles.sectionLabel}>Statistics</Text>
                <View style={styles.card}>
                    <View style={styles.statRow}>
                        <View style={styles.iconCircle}>
                            <Camera color="#FFFFFF" size={24} fill="#FFFFFF" />
                        </View>
                        <View style={styles.statInfo}>
                            {loading ? (
                                <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
                            ) : (
                                <Text style={styles.statNumber}>{snapCount}</Text>
                            )}
                            <Text style={styles.statLabel}>Snap History</Text>
                        </View>
                    </View>
                </View>

                {/* Knowledge Level Section */}
                <Text style={styles.sectionLabel}>Knowledge Level</Text>
                <Pressable
                    style={styles.card}
                    onPress={() => router.push('/knowledge-level')}
                >
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <GraduationCap color="#1C1C1E" size={24} />
                            <Text style={styles.rowLabel}>{knowledgeLevel || 'Knowledge Level'}</Text>
                        </View>
                        <ChevronRight color="#C7C7CC" size={20} strokeWidth={2} />
                    </View>
                </Pressable>

                {/* Delete Section */}
                <Text style={styles.sectionLabel}>Delete Account</Text>
                <Pressable
                    style={styles.card}
                    onPress={() => router.push('/delete-account-confirm')}
                >
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Trash2 color="#1C1C1E" size={24} />
                            <Text style={styles.rowLabel}>Delete Account and All Data</Text>
                        </View>
                        <ChevronRight color="#C7C7CC" size={20} strokeWidth={2} />
                    </View>
                </Pressable>
            </ScrollView>
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
    },
    scrollContent: {
        padding: 16,
    },
    banner: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    bannerText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        textAlign: 'left',
    },
    sectionLabel: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: '#8E8E93',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statInfo: {
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        color: '#1C1C1E',
    },
    statLabel: {
        fontSize: 14,
        fontFamily: 'Inter_300Light',
        color: '#8E8E93',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowLabel: {
        fontSize: 17,
        fontFamily: 'Inter_300Light',
        color: '#1C1C1E',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowValue: {
        fontSize: 16,
        fontFamily: 'Inter_300Light',
        color: '#8E8E93',
    },
});
