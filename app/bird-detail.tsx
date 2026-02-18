import { LoadingScreen } from '@/components/common/LoadingScreen';
import { BirdProfileContent } from '@/components/shared/BirdProfileContent';
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
    ChevronRight,
    Share2,
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

    const bird = React.useMemo(() => JSON.parse(params.birdData as string) as BirdResult, [params.birdData]);
    const sightingDate = params.sightingDate ? new Date(params.sightingDate) : new Date();

    // Initialize state from saved metadata immediately — no loading screen needed
    const savedInatPhotos = React.useMemo(() => bird.inat_photos || [], [bird.inat_photos]);
    const savedSounds = React.useMemo(() => bird.sounds || [], [bird.sounds]);
    const hasSavedData = savedInatPhotos.length > 0 || savedSounds.length > 0;

    const [media, setMedia] = useState<BirdMedia | null>(
        // Pre-populate from in-memory cache if available
        MediaService.getCached(bird.scientific_name)
    );
    const [inatPhotos, setInatPhotos] = useState<INaturalistPhoto[]>(savedInatPhotos);
    const [sounds, setSounds] = useState<BirdSound[]>(savedSounds);
    const [loading, setLoading] = useState(!hasSavedData && !media);
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
        // If we already have cached media data, skip the fetch entirely
        if (media) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function loadData() {
            try {
                const mediaData = await MediaService.fetchBirdMedia(bird.scientific_name);
                if (!isMounted) return;

                setMedia(mediaData);

                // Only update photos/sounds if we didn't already have saved data
                if (savedInatPhotos.length === 0 && mediaData.inat_photos?.length) {
                    setInatPhotos(mediaData.inat_photos);
                }
                if (savedSounds.length === 0 && mediaData.sounds?.length) {
                    setSounds(mediaData.sounds);
                }
            } catch (error) {
                console.warn('Background media fetch failed (non-blocking):', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();

        return () => { isMounted = false; };
    }, [bird.scientific_name]);

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

    const handleOpenIdentification = () => {
        router.push({
            pathname: '/identification-detail',
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
                    <BirdProfileContent
                        bird={bird}
                        inatPhotos={inatPhotos}
                        sounds={sounds}
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
        color: '#666666',
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
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
