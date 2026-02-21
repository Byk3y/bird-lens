import { LoadingScreen } from '@/components/common/LoadingScreen';
import { MiniAudioPlayer } from '@/components/scanner/MiniAudioPlayer';
import { BirdProfileContent } from '@/components/shared/BirdProfileContent';
import { ImageViewer } from '@/components/shared/profile/ImageViewer';
import { Colors } from '@/constants/theme';
import { BirdMedia, MediaService } from '@/services/MediaService';
import { BirdResult, BirdSound, INaturalistPhoto } from '@/types/scanner';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
    Camera,
    ChevronLeft,
    Image as ImageIcon,
    Share2
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
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

    const bird = React.useMemo(() => JSON.parse(params.birdData as string) as BirdResult, [params.birdData]);
    const sightingDate = params.sightingDate ? new Date(params.sightingDate) : new Date();
    const [birdDetails, setBirdDetails] = useState<BirdResult>(bird);

    // Initialize state from saved metadata immediately — no loading screen needed
    const savedInatPhotos = React.useMemo(() => {
        if (birdDetails.inat_photos && birdDetails.inat_photos.length > 0) return birdDetails.inat_photos;

        // Fallback: Construct photo objects from simple image URLs
        const simpleImages = birdDetails.images || [];
        if (simpleImages.length > 0) {
            return simpleImages.map(url => ({
                url,
                attribution: 'iNaturalist', // Default attribution
                license: 'cc-by'
            }));
        }

        // Deep Fallback: Use the single image passed via params (e.g. from capture)
        if (params.imageUrl) {
            return [{
                url: params.imageUrl,
                attribution: 'User Capture',
                license: 'cc-by'
            }];
        }

        return [];
    }, [birdDetails.inat_photos, birdDetails.images, params.imageUrl]);

    const savedSounds = React.useMemo(() => birdDetails.sounds || [], [birdDetails.sounds]);
    const hasSavedData = savedInatPhotos.length > 0 || savedSounds.length > 0;

    const [media, setMedia] = useState<BirdMedia | null>(
        // Pre-populate from in-memory cache if available
        MediaService.getCached(birdDetails.scientific_name)
    );
    const [inatPhotos, setInatPhotos] = useState<INaturalistPhoto[]>(savedInatPhotos);
    const [sounds, setSounds] = useState<BirdSound[]>(savedSounds);

    // Separate Search vs Sighting logic
    const isSighting = !!params.sightingDate;
    const isSearchSkeleton = savedInatPhotos.length <= 1;

    // Separate loading states:
    // 1. initialLoading: Show full screen spinner if we have NO data OR if we're coming from search 
    //    and waiting for the first batch of enrichment (media/metadata).
    // 2. isEnriching: Show pulse animations/skeletons in gallery while fetching even more media.
    const initialLoading = (!hasSavedData || (isSearchSkeleton && !isSighting)) && !media;
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isEnriching, setIsEnriching] = useState((!hasSavedData || isSearchSkeleton) && !media);

    // Stabilized Hero Image logic
    const heroImageSource = React.useMemo(() => {
        // 1. If it's a sighting, ALWAYS prioritize the user's captured photo as the first image
        if (isSighting && params.imageUrl && selectedImageIndex === 0) {
            return params.imageUrl;
        }

        // 2. Otherwise, use high quality photos from iNaturalist (provided by media enrichment)
        if (inatPhotos.length > 0) {
            return inatPhotos[selectedImageIndex]?.url || inatPhotos[0].url;
        }

        // 3. Fallback to the search thumbnail or passed image
        return params.imageUrl || birdDetails.male_image_url || null;
    }, [inatPhotos, selectedImageIndex, params.imageUrl, birdDetails.male_image_url, isSighting]);
    const scrollRef = useRef<ScrollView>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / width);
        if (index !== selectedImageIndex) {
            setSelectedImageIndex(index);
        }
    };

    useEffect(() => {
        // If we already have cached media data, skip the fetch entirely
        if (media) {
            setIsEnriching(false);
            return;
        }

        let isMounted = true;

        async function loadData() {
            try {
                const mediaData = await MediaService.fetchBirdMedia(bird.scientific_name);
                if (!isMounted) return;

                setMedia(mediaData);

                // Update photos if fetched data is richer than initial data (e.g. single search thumbnail)
                if (mediaData.inat_photos?.length) {
                    const initialUrl = params.imageUrl;
                    const isLowResThumbnail = initialUrl && (initialUrl.includes('square') || initialUrl.includes('small'));

                    if (isSighting && initialUrl) {
                        // For sightings, NEVER replace the main photo. 
                        // Just append new reference photos while keeping the capture at index 0.
                        const filteredPhotos = mediaData.inat_photos.filter(p => p.url !== initialUrl);
                        setInatPhotos([
                            { url: initialUrl, attribution: 'User Capture', license: 'cc-by' },
                            ...filteredPhotos
                        ]);
                    } else if (isLowResThumbnail) {
                        // For search results with a low-res thumbnail, replace with high-quality reference photos
                        setInatPhotos(mediaData.inat_photos);
                    } else {
                        // Standard append and deduplicate logic
                        const filteredPhotos = mediaData.inat_photos.filter(p => p.url !== initialUrl);
                        if (filteredPhotos.length > 0) {
                            setInatPhotos([
                                ...(savedInatPhotos.length > 0 ? savedInatPhotos : []),
                                ...filteredPhotos
                            ]);
                        }
                    }
                }
                if (savedSounds.length === 0 && mediaData.sounds?.length) {
                    setSounds(mediaData.sounds);
                }

                // Merge AI metadata and gendered images if available
                if (mediaData.metadata || mediaData.male_image_url) {
                    setBirdDetails(prev => ({
                        ...prev,
                        ...(mediaData.metadata || {}),
                        male_image_url: mediaData.male_image_url || prev.male_image_url,
                        female_image_url: mediaData.female_image_url || prev.female_image_url,
                        juvenile_image_url: mediaData.juvenile_image_url || prev.juvenile_image_url,
                        // Preserve identification keys
                        scientific_name: prev.scientific_name,
                        name: prev.name
                    }));
                }
            } catch (error) {
                console.warn('Background media fetch failed (non-blocking):', error);
            } finally {
                if (isMounted) setIsEnriching(false);
            }
        }

        loadData();

        return () => { isMounted = false; };
    }, [bird.scientific_name]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this ${birdDetails.name} I spotted! It's scientific name is ${birdDetails.scientific_name}.`,
                url: params.imageUrl as string || media?.image?.url || birdDetails.images?.[0] || '',
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
            if (isSpeaking) {
                await Speech.stop();
            }
            Speech.speak(birdDetails.scientific_name, {
                language: 'en',
                pitch: 1.0,
                rate: 0.8,
            });
        } catch (error) {
            console.error('Error pronouncing:', error);
        }
    };

    const handleOpenTips = (section?: string) => {
        router.push({
            pathname: '/birding-tips',
            params: {
                birdData: JSON.stringify(birdDetails),
                initialSection: section
            }
        });
    };

    const handleOpenIdentification = () => {
        router.push({
            pathname: '/identification-detail',
            params: { birdData: JSON.stringify(birdDetails) }
        });
    };

    if (initialLoading) {
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
                    {heroImageSource && (
                        <Image
                            source={{ uri: heroImageSource }}
                            style={styles.heroBlur}
                            blurRadius={100}
                        />
                    )}
                    <View style={styles.imageCardContainer}>
                        {heroImageSource ? (
                            <Image
                                source={{ uri: heroImageSource }}
                                style={styles.heroImage}
                                contentFit="cover"
                                transition={400}
                            />
                        ) : (
                            <View style={[styles.heroImage, { backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }]}>
                                <ImageIcon color="#333" size={48} />
                            </View>
                        )}
                    </View>
                    {params.sightingDate && (
                        <View style={styles.timestampContainer}>
                            <Text style={styles.timestampLabel}>posted on</Text>
                            <Text style={styles.timestampValue}>{format(sightingDate, 'do MMM')}</Text>
                        </View>
                    )}

                    {birdDetails.audio_url && (
                        <View style={styles.listenBackContainer}>
                            <MiniAudioPlayer uri={birdDetails.audio_url} />
                        </View>
                    )}
                </View>

                {/* Main Content */}
                <View style={styles.mainInfoSection}>
                    <BirdProfileContent
                        bird={birdDetails}
                        inatPhotos={inatPhotos}
                        sounds={sounds}
                        isLoadingSounds={sounds.length === 0 && !media}
                        isLoadingImages={isEnriching} // Pass isEnriching state for gallery pulse
                        isEnrichmentComplete={!isEnriching} // New prop for tips and metadata
                        onPlaySound={handlePronounce}
                        onImagePress={(idx) => {
                            setSelectedImageIndex(idx);
                            setIsImageViewerVisible(true);
                            Haptics.selectionAsync();
                        }}
                        onOpenTips={handleOpenTips}
                        onOpenIdentification={handleOpenIdentification}
                    />
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

            {/* Image Viewer Component */}
            <ImageViewer
                visible={isImageViewerVisible}
                images={inatPhotos}
                initialIndex={selectedImageIndex}
                onClose={() => setIsImageViewerVisible(false)}
            />
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
        borderRadius: 8,
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
    listenBackContainer: {
        position: 'absolute',
        bottom: 32,
        left: 8,
        zIndex: 60,
    },
    mainInfoSection: {
        paddingTop: 16,
        paddingBottom: 40,
        backgroundColor: '#fff',
        borderTopLeftRadius: 13,
        borderTopRightRadius: 13,
        marginTop: -16,
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
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
    },
});
