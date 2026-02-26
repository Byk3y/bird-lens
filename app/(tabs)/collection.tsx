import { AuthModal } from '@/components/auth/AuthModal';
import { useAlert } from '@/components/common/AlertProvider';
import { CustomActionSheet } from '@/components/common/CustomActionSheet';
import { SkeletonScreen } from '@/components/common/SkeletonScreen';
import { Paywall } from '@/components/Paywall';
import { GuestNudge } from '@/components/shared/GuestNudge';
import { TellFriendsModal } from '@/components/shared/TellFriendsModal';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Diamond, Forward, Gem, Mic, MoreHorizontal, Plus, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CACHE_KEY = 'bird_lens_collection_cache';
const REFRESH_COOLDOWN_MS = 30 * 1000; // Don't refetch within 30 seconds

const SIGHTINGS_QUERY = 'id, species_name, created_at, image_url, audio_url, scientific_name, rarity, confidence, metadata';

export default function MeScreen() {
    const insets = useSafeAreaInsets();
    const router = useSafeNavigation();
    const { user, isPro } = useAuth();
    const [sightings, setSightings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
    const { showAlert } = useAlert();
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedSighting, setSelectedSighting] = useState<any>(null);
    const [sightingToDelete, setSightingToDelete] = useState<string | null>(null);
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [isTellFriendsVisible, setIsTellFriendsVisible] = useState(false);
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);
    const isGuest = user?.is_anonymous;
    const lastFetchRef = useRef<number>(0);

    // Load cached data instantly on mount, then fetch fresh data
    React.useEffect(() => {
        if (!user) return;

        let isMounted = true;

        async function loadCachedThenFetch() {
            // 1. Load from AsyncStorage cache instantly
            try {
                const cachedJson = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedJson && isMounted) {
                    const cached = JSON.parse(cachedJson);
                    if (cached?.data?.length > 0) {
                        setSightings(cached.data);
                        setLoading(false); // Show cached data immediately, no skeleton
                    }
                }
            } catch (e) {
                // Cache read failed, continue to network fetch
            }

            // 2. Fetch fresh data from Supabase
            try {
                const { data, error } = await supabase
                    .from('sightings')
                    .select(SIGHTINGS_QUERY)
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (data && isMounted) {
                    setSightings(data);
                    lastFetchRef.current = Date.now();
                    // Persist to cache
                    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })).catch(() => { });
                }
            } catch (err) {
                console.error('Error fetching sightings:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadCachedThenFetch();

        return () => { isMounted = false; };
    }, [user]);

    // Refresh data silently when screen comes into focus (with cooldown)
    useFocusEffect(
        useCallback(() => {
            if (!user) return;

            // Skip if we fetched recently (within cooldown)
            const timeSinceLastFetch = Date.now() - lastFetchRef.current;
            if (timeSinceLastFetch < REFRESH_COOLDOWN_MS) return;

            async function refreshCollections() {
                try {
                    const { data, error } = await supabase
                        .from('sightings')
                        .select(SIGHTINGS_QUERY)
                        .eq('user_id', user?.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        setSightings(data);
                        lastFetchRef.current = Date.now();
                        // Update cache
                        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })).catch(() => { });
                    }
                } catch (err) {
                    console.error('Silent refresh failed:', err);
                }
            }
            refreshCollections();
        }, [user])
    );


    const handleBirdPress = (sighting: any) => {
        const birdData: BirdResult = {
            name: sighting.species_name,
            scientific_name: sighting.scientific_name,
            rarity: sighting.rarity,
            confidence: sighting.confidence,
            audio_url: sighting.audio_url,
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

    const handleOptionsPress = (sighting: any) => {
        setSelectedSighting(sighting);
        setIsActionSheetVisible(true);
    };



    const handleDeleteConfirm = (id: string) => {
        setSightingToDelete(id);
        showAlert({
            title: 'Delete Sighting',
            message: 'Are you sure you want to remove this bird from your collection?',
            actions: [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: () => deleteSighting(id), style: 'destructive' }
            ],
            isDestructive: true
        });
    };

    const deleteSighting = async (id: string) => {
        if (!user || isDeleting) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('sightings')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            const updated = sightings.filter(s => s.id !== id);
            setSightings(updated);
            // Update cache to reflect deletion
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: updated, timestamp: Date.now() })).catch(() => { });
        } catch (err: any) {
            console.error('Error deleting sighting:', err);
            showAlert({
                title: 'Error',
                message: 'Could not delete this sighting. Please try again.'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#f97316', '#D4202C', '#D4202C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.topActions}>
                        <Pressable
                            style={styles.headerBtn}
                            onPress={() => setIsTellFriendsVisible(true)}
                        >
                            <View pointerEvents="none">
                                <Forward color={Colors.white} size={22} />
                            </View>
                        </Pressable>
                        <Pressable style={styles.headerBtn} onPress={() => router.push('/settings')}>
                            <View pointerEvents="none">
                                <Settings color={Colors.white} size={22} />
                            </View>
                        </Pressable>
                    </View>


                    {!isPro ? (
                        <Pressable onPress={() => setIsPaywallVisible(true)}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                transition={{ duration: 800 }}
                                style={styles.subscribeBanner}
                            >
                                <View pointerEvents="none">
                                    <Gem color="#fbbf24" size={20} />
                                </View>
                                <Text style={styles.subscribeText}>Subscribe Now</Text>
                            </MotiView>
                        </Pressable>
                    ) : (
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 600 }}
                            style={styles.proBadge}
                        >
                            <View pointerEvents="none">
                                <Diamond color="#fcd34d" size={14} fill="#fcd34d" />
                            </View>
                            <Text style={styles.proText}>Pro Member • {sightings.length} Birds Found</Text>
                        </MotiView>
                    )}
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Collections ({sightings.length})</Text>
                </View>

                {loading ? (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.grid}
                        bounces={false}
                    >
                        {isGuest && (
                            <View style={{ width: '100%', paddingHorizontal: 4 }}>
                                <GuestNudge onPress={() => setIsAuthModalVisible(true)} />
                            </View>
                        )}
                        <SkeletonScreen items={4} />
                    </ScrollView>
                ) : (
                    <FlatList
                        data={[...sightings, { id: 'plus-card', isPlus: true }]}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.flatListContent}
                        columnWrapperStyle={styles.columnWrapper}
                        ListHeaderComponent={isGuest ? (
                            <View style={{ width: '100%', paddingHorizontal: 4, marginBottom: 8 }}>
                                <GuestNudge onPress={() => setIsAuthModalVisible(true)} />
                            </View>
                        ) : null}
                        renderItem={({ item, index }) => {
                            if (item.isPlus) {
                                return (
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={styles.cardWrapper}
                                    >
                                        <Pressable style={styles.plusCard} onPress={() => router.push('/scanner')}>
                                            <View pointerEvents="none">
                                                <Plus color="#94a3b8" size={40} strokeWidth={1.5} />
                                            </View>
                                        </Pressable>
                                    </MotiView>
                                );
                            }

                            const sighting = item;
                            return (
                                <MotiView
                                    key={sighting.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: Math.min(index * 50, 400) }}
                                    style={styles.cardWrapper}
                                >
                                    <Pressable
                                        style={styles.collectionCard}
                                        onPress={() => handleBirdPress(sighting)}
                                    >
                                        <View style={styles.cardImageContainer}>
                                            <Image
                                                source={sighting.image_url || sighting.metadata?.inat_photos?.[0]?.url}
                                                style={styles.cardImage}
                                                contentFit="cover"
                                                transition={500}
                                            />
                                            {sighting.audio_url && (
                                                <View style={styles.audioTag}>
                                                    <View pointerEvents="none">
                                                        <Mic color={Colors.white} size={14} />
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.cardContent}>
                                            <Text style={styles.cardName} numberOfLines={1}>
                                                {sighting.species_name}
                                            </Text>

                                            <View style={styles.cardFooter}>
                                                <Text style={styles.cardDate}>
                                                    {format(new Date(sighting.created_at), 'yy-MM-dd')}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.moreBtn}
                                                    onPress={() => handleOptionsPress(sighting)}
                                                >
                                                    <View pointerEvents="none">
                                                        <MoreHorizontal color="#64748b" size={18} strokeWidth={2} />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Pressable>
                                </MotiView>
                            );
                        }}
                    />
                )}
            </View>

            <CustomActionSheet
                visible={isActionSheetVisible}
                onClose={() => setIsActionSheetVisible(false)}
                options={[

                    {
                        label: 'Correct the result',
                        onPress: () => selectedSighting && handleBirdPress(selectedSighting),
                    },
                    {
                        label: 'Delete',
                        onPress: () => selectedSighting && handleDeleteConfirm(selectedSighting.id),
                        isDestructive: true,
                    },
                ]}
            />

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
                <Paywall
                    onClose={() => setIsPaywallVisible(false)}
                />
            </Modal>
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
        height: 220,
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
    proBadge: {
        backgroundColor: 'rgba(0,0,0,0.25)',
        marginTop: Spacing.md,
        marginHorizontal: Spacing.xl,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    proText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    content: {
        flex: 1,
        marginTop: -40,
        backgroundColor: Colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 8,
        paddingTop: Spacing.xl,
    },
    sectionHeader: {
        marginBottom: Spacing.lg,
        paddingHorizontal: 4,
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
    flatListContent: {
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardWrapper: {
        width: (width - 32) / 2, // Accounting for paddings and gap
        marginBottom: 12,
    },
    collectionCard: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
    },
    cardImageContainer: {
        width: '100%',
        aspectRatio: 0.9,
        backgroundColor: '#f1f5f9',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    audioTag: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6,
        borderRadius: 20,
    },
    cardContent: {
        padding: 12,
        paddingTop: 10,
    },
    cardName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        width: '100%',
        aspectRatio: 0.75,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
});
