import { LoadingScreen } from '@/components/common/LoadingScreen';
import { OverlapAvatars } from '@/components/common/OverlapAvatars';
import { HABITAT_ASSETS, NESTING_ASSETS } from '@/constants/bird-assets';
import { Colors } from '@/constants/theme';
import { INaturalistService } from '@/services/INaturalistService';
import { BirdMedia, MediaService } from '@/services/MediaService';
import { BirdSound, SoundService } from '@/services/SoundService';
import { BirdResult, INaturalistPhoto } from '@/types/scanner';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Image as ImageIcon,
    Info,
    LayoutGrid,
    Lightbulb,
    MoreHorizontal,
    Notebook,
    Share2,
    Volume2,
    X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function BirdDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        birdData: string;
        sightingDate?: string;
        imageUrl?: string;
    }>();
    const bird = JSON.parse(params.birdData as string) as BirdResult;
    const sightingDate = params.sightingDate ? new Date(params.sightingDate) : new Date();

    const [media, setMedia] = useState<BirdMedia | null>(null);
    const [inatPhotos, setInatPhotos] = useState<INaturalistPhoto[]>([]);
    const [sounds, setSounds] = useState<BirdSound[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / width);
        if (index !== selectedImageIndex) {
            setSelectedImageIndex(index);
        }
    };

    useEffect(() => {
        async function loadData() {
            try {
                // Determine if we should fetch iNaturalist photos or use saved ones
                const savedInatPhotos = bird.inat_photos || [];

                const fetchPromises: Promise<any>[] = [
                    MediaService.fetchBirdMedia(bird.scientific_name),
                    SoundService.fetchSounds(bird.scientific_name)
                ];

                // Only fetch live if we don't have saved photos
                if (savedInatPhotos.length === 0) {
                    fetchPromises.push(INaturalistService.fetchPhotos(bird.scientific_name));
                }

                const results = await Promise.all(fetchPromises);

                setMedia(results[0]);
                setSounds(results[1]);

                if (savedInatPhotos.length > 0) {
                    setInatPhotos(savedInatPhotos);
                } else {
                    setInatPhotos(results[2] || []);
                }
            } catch (error) {
                console.error('Failed to load detail data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [bird.scientific_name, bird.inat_photos]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this ${bird.name} I spotted! It's scientific name is ${bird.scientific_name}.`,
                url: params.imageUrl as string || media?.image?.url || bird.images?.[0] || '',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handlePronounce = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isSpeaking = await Speech.isSpeakingAsync();
            if (isSpeaking) {
                await Speech.stop();
            }
            Speech.speak(bird.scientific_name, {
                language: 'en',
                pitch: 1.0,
                rate: 0.8,
            });
        } catch (error) {
            console.error('Error pronouncing:', error);
        }
    };

    const handleOpenTips = () => {
        router.push({
            pathname: '/birding-tips',
            params: { birdData: JSON.stringify(bird) }
        });
    };

    if (loading) {
        return <LoadingScreen onBack={() => router.back()} message="Opening Profile..." />;
    }

    return (
        <View style={styles.container}>
            {/* Header / Navigation */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft color={Colors.white} size={28} strokeWidth={2.5} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image Section */}
                <View style={styles.heroWrapper}>
                    <Image
                        source={{ uri: params.imageUrl || inatPhotos[0]?.url || bird.images?.[0] }}
                        style={styles.heroBlur}
                        blurRadius={100}
                    />
                    <View style={styles.imageCardContainer}>
                        <Image
                            source={{ uri: params.imageUrl || inatPhotos[0]?.url || bird.images?.[0] }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.timestampContainer}>
                        <Text style={styles.timestampLabel}>posted on</Text>
                        <Text style={styles.timestampValue}>{format(sightingDate, 'do MMM')}</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.mainInfoSection}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mainTitle}>
                                {bird.name}
                                <Text style={styles.speciesOfText}>, a species of</Text>
                            </Text>
                            <Text style={styles.familyText}>
                                {bird.taxonomy?.family || 'N/A'}
                                {bird.taxonomy?.family_scientific && (
                                    <Text style={styles.scientificFamilyText}>({bird.taxonomy.family_scientific})</Text>
                                )}
                            </Text>
                        </View>
                        <Pressable style={styles.editBtn}>
                            <Edit2 size={18} color="#999" />
                        </Pressable>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Also known as: </Text>
                        <Text style={styles.metaValue}>{bird.also_known_as?.join(', ') || 'N/A'}</Text>
                    </View>

                    <View style={styles.scientificNameRow}>
                        <Text style={styles.scientificNameLabel}>Scientific name: </Text>
                        <Text style={styles.scientificNameValue}>{bird.scientific_name}</Text>
                        <Pressable style={styles.speakerBtn} onPress={handlePronounce}>
                            <Volume2 size={12} color="#FFF" />
                        </Pressable>
                    </View>

                    <View style={styles.gutter} />

                    {/* Gallery Section */}
                    {inatPhotos.length > 0 && (
                        <View style={styles.gallerySection}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleLeft}>
                                    <ImageIcon size={22} color="#1A1A1A" />
                                    <Text style={styles.galleryTitle}>Images of {bird.name}</Text>
                                </View>
                                <MoreHorizontal size={20} color="#999" />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                                {inatPhotos.map((photo, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.galleryItem}
                                        onPress={() => {
                                            setSelectedImageIndex(idx);
                                            setIsImageViewerVisible(true);
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <Image source={{ uri: photo.url }} style={styles.galleryImage} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Birding Tips Section */}
                    <View style={styles.gutter} />
                    <View style={styles.tipsSection}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleLeft}>
                                <Notebook size={22} color="#1A1A1A" />
                                <Text style={styles.sectionTitle}>Birding Tips</Text>
                            </View>
                            <MoreHorizontal size={20} color="#999" />
                        </View>

                        <View style={styles.gridContainer}>
                            {/* Full Width Tip: Diet */}
                            <TouchableOpacity style={styles.wideCard} onPress={handleOpenTips}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardLabel}>Diet</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <OverlapAvatars
                                        tags={[...(bird.diet_tags || []), bird.diet].filter(Boolean)}
                                        type="diet"
                                    />
                                    <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>

                            {/* Full Width Tip: Feeder */}
                            <TouchableOpacity style={styles.wideCard} onPress={handleOpenTips}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardLabel}>Feeder</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <OverlapAvatars
                                        tags={bird.feeder_info?.feeder_types || []}
                                        type="feeder"
                                    />
                                    <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>

                            {/* Two Column Row: Habitat & Nesting */}
                            <View style={styles.row}>
                                <TouchableOpacity style={styles.halfCard} onPress={handleOpenTips}>
                                    <View style={styles.halfCardTop}>
                                        <Text style={styles.cardLabel}>Habitat</Text>
                                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.halfCardMain}>
                                        {(() => {
                                            const h = (bird.habitat_tags?.[0] || bird.habitat || '').toLowerCase();
                                            let asset = HABITAT_ASSETS.forest; // Default

                                            if (h.includes('forest') || h.includes('wood')) asset = HABITAT_ASSETS.forest;
                                            else if (h.includes('wetland') || h.includes('river') || h.includes('lake') || h.includes('water') || h.includes('marsh')) asset = HABITAT_ASSETS.wetland;
                                            else if (h.includes('grass') || h.includes('field') || h.includes('meadow') || h.includes('prairie')) asset = HABITAT_ASSETS.grassland;
                                            else if (h.includes('mountain') || h.includes('rock') || h.includes('cliff')) asset = HABITAT_ASSETS.mountain;
                                            else if (h.includes('shrub') || h.includes('scrub') || h.includes('thicket')) asset = HABITAT_ASSETS.shrub;
                                            else if (h.includes('backyard') || h.includes('urban') || h.includes('park') || h.includes('garden')) asset = HABITAT_ASSETS.backyard;

                                            return <Image source={asset} style={styles.habitatIcon} />;
                                        })()}
                                        <Text style={styles.halfCardValue}>{bird.habitat_tags?.[0] || bird.habitat || 'N/A'}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.halfCard} onPress={handleOpenTips}>
                                    <View style={styles.halfCardTop}>
                                        <Text style={styles.cardLabel}>Nesting</Text>
                                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.halfCardMain}>
                                        {(() => {
                                            const loc = (bird.nesting_info?.location || '').toLowerCase();
                                            let asset = NESTING_ASSETS.cup;
                                            let name = 'Cup';

                                            if (loc.includes('cavity') || loc.includes('hole')) {
                                                asset = NESTING_ASSETS.cavity;
                                                name = 'Cavity';
                                            } else if (loc.includes('burrow') || loc.includes('tunnel')) {
                                                asset = NESTING_ASSETS.burrow;
                                                name = 'Burrow';
                                            } else if (loc.includes('dome') || loc.includes('spherical') || loc.includes('enclosed')) {
                                                asset = NESTING_ASSETS.dome;
                                                name = 'Dome';
                                            } else if (loc.includes('ground') || loc.includes('shrub')) {
                                                asset = NESTING_ASSETS.ground;
                                                name = 'Ground';
                                            } else if (loc.includes('platform') || loc.includes('ledge') || loc.includes('building')) {
                                                asset = NESTING_ASSETS.platform;
                                                name = 'Platform';
                                            } else if (loc.includes('scrape') || loc.includes('sand') || loc.includes('pebbles')) {
                                                asset = NESTING_ASSETS.scrape;
                                                name = 'Scrape';
                                            } else if (loc.includes('hanging') || loc.includes('pouch') || loc.includes('pendant')) {
                                                asset = NESTING_ASSETS.hanging;
                                                name = 'Hanging';
                                            } else if (loc.includes('none') || loc.includes('parasitic') || loc.includes('no nest')) {
                                                asset = NESTING_ASSETS.none;
                                                name = 'No Nest';
                                            } else if (loc.includes('tree') || loc.includes('branch') || loc.includes('cup')) {
                                                asset = NESTING_ASSETS.cup;
                                                name = 'Cup';
                                            }

                                            return (
                                                <>
                                                    <Image source={asset} style={styles.habitatIcon} />
                                                    <Text style={styles.halfCardValue}>{name}</Text>
                                                </>
                                            );
                                        })()}
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Differences Row */}
                            <TouchableOpacity style={styles.listItem} onPress={handleOpenTips}>
                                <View style={styles.listItemLeft}>
                                    <LayoutGrid size={20} color="#FF6B35" />
                                    <Text style={styles.listItemText}>Male-female differences</Text>
                                </View>
                                <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {/* Insight Tip */}
                            <TouchableOpacity style={styles.insightCard} onPress={handleOpenTips}>
                                <View style={styles.insightIconWrapper}>
                                    <Lightbulb size={20} color="#FFD166" />
                                </View>
                                <Text style={styles.insightText} numberOfLines={2}>
                                    {bird.fact || bird.description}
                                </Text>
                                <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Extra Info */}
                    <View style={styles.gutter} />
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleLeft}>
                                <Info size={22} color="#1A1A1A" />
                                <Text style={styles.sectionTitle}>Facts</Text>
                            </View>
                        </View>
                        <Text style={styles.descriptionText}>{bird.description}</Text>
                    </View>

                    <View style={styles.factCard}>
                        <Info color={Colors.primary} size={24} />
                        <View style={styles.factContent}>
                            <Text style={styles.factTitle}>Did you know?</Text>
                            <Text style={styles.factText}>{bird.fact}</Text>
                        </View>
                    </View>
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.bottomBarBtn}
                    onPress={() => router.replace('/(tabs)/scanner')}
                >
                    <Camera size={24} color={Colors.textSecondary} />
                    <Text style={styles.bottomBarText}>New</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.bottomBarBtn} onPress={handleShare}>
                    <Share2 size={24} color={Colors.textSecondary} />
                    <Text style={styles.bottomBarText}>Share</Text>
                </TouchableOpacity>
            </View>

            {/* Image Viewer Modal */}
            <Modal
                visible={isImageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsImageViewerVisible(false)}
            >
                <View style={styles.modalBg}>
                    {/* Close Area */}
                    <Pressable style={styles.modalCloseArea} onPress={() => setIsImageViewerVisible(false)} />

                    {/* Image Viewer Header */}
                    <View style={styles.modalHeader}>
                        <Pressable
                            onPress={() => setIsImageViewerVisible(false)}
                            style={styles.modalCloseBtn}
                        >
                            <X color="#FFF" size={28} />
                        </Pressable>
                    </View>

                    <View style={styles.modalContent}>
                        <ScrollView
                            ref={scrollRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScroll}
                            contentOffset={{ x: selectedImageIndex * width, y: 0 }}
                            scrollEventThrottle={16}
                        >
                            {inatPhotos.map((photo, index) => (
                                <View key={index} style={styles.fullImageContainer}>
                                    <Image
                                        source={{ uri: photo.url }}
                                        style={styles.fullImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Image Viewer Footer */}
                    <View style={styles.modalFooter}>
                        <View style={styles.footerInfoRow}>
                            <TouchableOpacity
                                style={styles.copyrightContainer}
                                onPress={() => {
                                    // Could open license URL
                                }}
                            >
                                <Text style={styles.copyrightText}>copyright</Text>
                            </TouchableOpacity>

                            <View style={styles.paginationContainer}>
                                <Text style={styles.paginationText}>
                                    {selectedImageIndex + 1} / {inatPhotos.length}
                                </Text>
                            </View>

                            {/* Empty view for spacing to keep pagination centered */}
                            <View style={{ width: 60 }} />
                        </View>

                        <View style={styles.modalControls}>
                            <Pressable
                                style={[styles.navArrow, selectedImageIndex === 0 && { opacity: 0.3 }]}
                                disabled={selectedImageIndex === 0}
                                onPress={() => {
                                    const nextIndex = Math.max(0, selectedImageIndex - 1);
                                    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
                                    setSelectedImageIndex(nextIndex);
                                }}
                            >
                                <ChevronLeft color="#FFF" size={32} />
                            </Pressable>
                            <Pressable
                                style={[styles.navArrow, selectedImageIndex === inatPhotos.length - 1 && { opacity: 0.3 }]}
                                disabled={selectedImageIndex === inatPhotos.length - 1}
                                onPress={() => {
                                    const nextIndex = Math.min(inatPhotos.length - 1, selectedImageIndex + 1);
                                    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
                                    setSelectedImageIndex(nextIndex);
                                }}
                            >
                                <ChevronRight color="#FFF" size={32} />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroWrapper: {
        width: '100%',
        height: 360,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    heroBlur: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    imageCardContainer: {
        width: width * 0.48,
        height: width * 0.65,
        borderRadius: 13,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 15,
        elevation: 12,
        alignSelf: 'center',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    timestampContainer: {
        position: 'absolute',
        right: 20,
        top: '50%',
        marginTop: -20,
        backgroundColor: 'transparent',
    },
    timestampLabel: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
        textAlign: 'right',
        marginBottom: 2,
    },
    timestampValue: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'right',
    },
    mainInfoSection: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 40,
        backgroundColor: '#fff',
        borderTopLeftRadius: 13,
        borderTopRightRadius: 13,
        marginTop: -16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.5,
    },
    speciesOfText: {
        fontSize: 16,
        fontWeight: '300',
        color: '#999',
    },
    familyText: {
        fontSize: 20,
        color: '#1A1A1A',
        marginTop: 2,
    },
    scientificFamilyText: {
        fontSize: 20,
        color: '#1A1A1A',
        fontStyle: 'italic',
    },
    bold: {
        fontWeight: '700',
    },
    italic: {
        fontStyle: 'italic',
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    metaLabel: {
        fontSize: 15,
        color: '#999',
    },
    metaValue: {
        fontSize: 15,
        fontWeight: '400',
        color: '#1A1A1A',
    },
    scientificNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 4,
        borderRadius: 0,
        marginBottom: 12,
    },
    scientificNameLabel: {
        fontSize: 15,
        color: '#999',
    },
    scientificNameValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1A1A1A',
        fontStyle: 'italic',
    },
    gutter: {
        height: 12,
        backgroundColor: '#F2F2F2',
        marginHorizontal: -12,
        marginBottom: 16,
    },
    speakerBtn: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#D4A373',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    gallerySection: {
        marginBottom: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    galleryTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    sectionTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    galleryScroll: {
        marginHorizontal: -12,
        paddingHorizontal: 12,
    },
    galleryItem: {
        width: 128,
        aspectRatio: 0.8,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#f1f5f9',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    tipsSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    tipsContainer: {
        gap: 12,
    },
    gridContainer: {
        gap: 12,
        marginTop: 8,
    },
    wideCard: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 94,
    },
    cardContent: {
        gap: 4,
    },
    cardLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    cardValue: {
        fontSize: 16,
        color: '#666',
        fontWeight: '400',
    },
    cardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfCard: {
        flex: 1,
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        minHeight: 150,
    },
    halfCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    halfCardMain: {
        alignItems: 'center',
        gap: 12,
    },
    halfCardValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    listItemText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    insightCard: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        gap: 12,
    },
    insightIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF1E6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightText: {
        flex: 1,
        fontSize: 15,
        color: '#444',
        lineHeight: 20,
    },
    tipCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 13,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tipCardLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    tipCardText: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    section: {
        marginBottom: 32,
    },
    descriptionText: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    factCard: {
        backgroundColor: '#fefae0',
        borderRadius: 13,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9edc9',
    },
    factContent: {
        flex: 1,
    },
    factTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    factText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333333',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 25,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 20,
    },
    bottomBarBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    bottomBarText: {
        color: '#666666',
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
    },
    habitatIcon: {
        width: 64,
        height: 64,
        resizeMode: 'contain',
        marginVertical: 4,
    },
    // Modal Styles
    modalBg: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalCloseArea: {
        ...StyleSheet.absoluteFillObject,
    },
    modalHeader: {
        height: 100,
        paddingTop: 50,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        zIndex: 20,
    },
    modalCloseBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
    },
    fullImageContainer: {
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: width * 1.25,
        backgroundColor: '#FFF',
    },
    modalFooter: {
        paddingBottom: 50,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    footerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    copyrightContainer: {
        width: 60,
    },
    copyrightText: {
        color: '#FFF',
        fontSize: 14,
        textDecorationLine: 'underline',
        opacity: 0.8,
    },
    paginationContainer: {
        flex: 1,
        alignItems: 'center',
    },
    paginationText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalControls: {
        flexDirection: 'row',
        gap: 60,
        alignItems: 'center',
    },
    navArrow: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
