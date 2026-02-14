import { SkeletonScreen } from '@/components/common/SkeletonScreen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Forward, Gem, Plus, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [sightings, setSightings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCollections() {
            if (!user) return;
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('sightings')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setSightings(data || []);
            } catch (err) {
                console.error('Error fetching sightings:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchCollections();
    }, [user]);

    const handleBirdPress = (sighting: any) => {
        // Map database record to BirdResult structure
        const birdData: BirdResult = {
            name: sighting.species_name,
            scientific_name: sighting.scientific_name,
            rarity: sighting.rarity,
            fact: sighting.fact,
            confidence: sighting.confidence,
            ...sighting.metadata
        };

        router.push({
            pathname: '/bird-detail',
            params: { birdData: JSON.stringify(birdData) }
        });
    };

    return (
        <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
            {/* Header with Cardinal Gradient */}
            <LinearGradient
                colors={['#f97316', '#D4202C', '#D4202C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.topActions}>
                        <Pressable style={styles.headerBtn}>
                            <Forward color={Colors.white} size={22} />
                        </Pressable>
                        <Pressable style={styles.headerBtn} onPress={() => router.push('/settings')}>
                            <Settings color={Colors.white} size={22} />
                        </Pressable>
                    </View>

                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800 }}
                        style={styles.subscribeBanner}
                    >
                        <Gem color="#fbbf24" size={20} />
                        <Text style={styles.subscribeText}>Subscribe Now</Text>
                    </MotiView>
                </View>
            </LinearGradient>

            {/* Main Content Area */}
            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Collections ({sightings.length})</Text>
                </View>

                <View style={styles.grid}>
                    {loading ? (
                        <SkeletonScreen items={4} />
                    ) : (
                        <>
                            {sightings.map((sighting, index) => (
                                <MotiView
                                    key={sighting.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: index * 100 }}
                                >
                                    <Pressable
                                        style={styles.collectionCard}
                                        onPress={() => handleBirdPress(sighting)}
                                    >
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardName}>{sighting.species_name}</Text>
                                            <Text style={styles.cardSciName}>{sighting.scientific_name}</Text>
                                        </View>
                                        <View style={styles.rarityBadge}>
                                            <Text style={styles.rarityText}>{sighting.rarity}</Text>
                                        </View>
                                    </Pressable>
                                </MotiView>
                            ))}

                            <MotiView
                                from={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <Pressable style={styles.plusCard} onPress={() => router.push('/scanner')}>
                                    <Plus color="#94a3b8" size={48} strokeWidth={1.5} />
                                </Pressable>
                            </MotiView>
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingBottom: Spacing.xxl,
        height: 280,
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    topActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscribeBanner: {
        backgroundColor: '#1e293b',
        marginTop: Spacing.md,
        marginHorizontal: Spacing.xl,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    subscribeText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginTop: -80,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: 600,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
    },
    sectionHeader: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        fontSize: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    collectionCard: {
        width: (Platform.OS === 'web' ? 180 : 165),
        aspectRatio: 0.85,
        borderRadius: 24,
        backgroundColor: '#f8fafc',
        padding: 16,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardInfo: {
        gap: 4,
    },
    cardName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    cardSciName: {
        fontSize: 12,
        fontStyle: 'italic',
        color: Colors.textSecondary,
    },
    rarityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: Colors.primary + '15',
    },
    rarityText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.primary,
        textTransform: 'uppercase',
    },
    plusCard: {
        width: (Platform.OS === 'web' ? 180 : 165),
        aspectRatio: 0.85,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
});
