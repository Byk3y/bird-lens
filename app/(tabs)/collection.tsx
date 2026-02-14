import { SkeletonScreen } from '@/components/common/SkeletonScreen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Forward, Gem, MoreHorizontal, Plus, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
            params: {
                birdData: JSON.stringify(birdData),
                sightingDate: sighting.created_at,
                imageUrl: sighting.image_url
            }
        });
    };

    return (
        <View style={styles.container}>
            {/* Header with Cardinal Gradient (Now Fixed) */}
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

            {/* Main Content Area (Now Scrollable) */}
            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Collections ({sightings.length})</Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.grid}
                    bounces={true}
                >
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
                                        <View style={styles.cardImageContainer}>
                                            {sighting.image_url ? (
                                                <Image
                                                    source={{ uri: sighting.image_url }}
                                                    style={styles.cardImage}
                                                />
                                            ) : (
                                                <View style={styles.imagePlaceholder}>
                                                    <Gem color="#e2e8f0" size={32} />
                                                </View>
                                            )}
                                        </View>

                                        <Text style={styles.cardName} numberOfLines={1}>
                                            {sighting.species_name}
                                        </Text>

                                        <View style={styles.cardFooter}>
                                            <Text style={styles.cardDate}>
                                                {format(new Date(sighting.created_at), 'yy-MM-dd')}
                                            </Text>
                                            <Pressable style={styles.moreBtn}>
                                                <MoreHorizontal color="#94a3b8" size={18} />
                                            </Pressable>
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
                                    <Plus color="#94a3b8" size={40} strokeWidth={1.5} />
                                </Pressable>
                            </MotiView>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
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
        marginTop: -60,
        backgroundColor: Colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: Spacing.md,
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
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    collectionCard: {
        width: (width - Spacing.md * 3) / 2,
        borderRadius: 16,
        backgroundColor: Colors.white, // Pure white cards
        padding: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardImageContainer: {
        width: '100%',
        aspectRatio: 0.82, // Taller aspect ratio
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        overflow: 'hidden',
        marginBottom: 12,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
    },
    cardName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    cardDate: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    moreBtn: {
        padding: 2,
    },
    plusCard: {
        width: (width - Spacing.md * 3) / 2,
        height: ((width - Spacing.md * 3) / 2) * 1.4,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginVertical: 4,
    },
});
