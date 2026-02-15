import { Colors, Spacing } from '@/constants/theme';
import { INaturalistService } from '@/services/INaturalistService';
import { BirdResult, INaturalistPhoto } from '@/types/scanner';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera, Check, ChevronLeft, Image as ImageIcon, Save, Share2, Volume2 } from 'lucide-react-native';
import { Skeleton } from 'moti/skeleton';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface IdentificationResultProps {
    result: BirdResult | null;
    candidates?: BirdResult[];
    capturedImage: string | null;
    isSaving: boolean;
    isSaved?: boolean;
    onSave: (bird: BirdResult, capturedImage: string | null, inatPhotos: INaturalistPhoto[]) => void;
    onReset: () => void;
}

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;
const THUMBNAIL_SIZE = 60;

const SkeletonLoader = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.headerSection}>
                <Skeleton colorMode="light" width={CIRCLE_SIZE} height={CIRCLE_SIZE} radius="round" />
            </View>

            {/* Content Skeleton */}
            <View style={styles.contentSection}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Skeleton colorMode="light" width={250} height={32} />
                    <View style={{ height: 8 }} />
                    <Skeleton colorMode="light" width={180} height={20} />
                </View>

                {/* Images Skeleton */}
                <View style={{ marginBottom: 32 }}>
                    <Skeleton colorMode="light" width={100} height={24} />
                    <View style={{ height: 12 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton colorMode="light" width={120} height={120} radius={16} />
                        <Skeleton colorMode="light" width={120} height={120} radius={16} />
                        <Skeleton colorMode="light" width={120} height={120} radius={16} />
                    </View>
                </View>
            </View>
        </View>
    );
};

export const IdentificationResult: React.FC<IdentificationResultProps> = ({
    result,
    candidates = [],
    capturedImage,
    isSaving,
    isSaved,
    onSave,
    onReset,
}) => {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [inatPhotos, setInatPhotos] = useState<INaturalistPhoto[]>([]);
    const [heroImages, setHeroImages] = useState<Record<string, string>>({});

    // Simulate loading for the skeleton effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    const displayCandidates = candidates.length > 0 ? candidates : (result ? [result] : []);
    const activeBird = displayCandidates[activeIndex] || result;

    // Fetch iNaturalist photos for the active bird
    useEffect(() => {
        if (activeBird) {
            const fetchPhotos = async () => {
                const photos = await INaturalistService.fetchPhotos(activeBird.scientific_name);
                setInatPhotos(photos);

                // If we don't have a hero image for this bird yet, use the first photo
                if (photos.length > 0 && !heroImages[activeBird.scientific_name]) {
                    setHeroImages(prev => ({
                        ...prev,
                        [activeBird.scientific_name]: photos[0].url
                    }));
                }
            };
            fetchPhotos();
        }
    }, [activeBird]);

    // Pre-fetch hero images for all candidates
    useEffect(() => {
        displayCandidates.forEach(async (bird) => {
            if (!heroImages[bird.scientific_name]) {
                const photos = await INaturalistService.fetchPhotos(bird.scientific_name);
                if (photos.length > 0) {
                    setHeroImages(prev => ({
                        ...prev,
                        [bird.scientific_name]: photos[0].url
                    }));
                }
            }
        });
    }, [displayCandidates]);

    const onScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);

        if (roundIndex >= 0 && roundIndex < displayCandidates.length && roundIndex !== activeIndex) {
            setActiveIndex(roundIndex);
        }
    };

    if (isLoading || !activeBird) {
        return <SkeletonLoader />;
    }

    return (
        <View style={styles.container}>
            {/* Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={onReset} style={styles.navButton}>
                    <ChevronLeft color={Colors.text} size={28} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton}>
                    <Camera color={Colors.text} size={24} />
                </TouchableOpacity>
            </View>

            {/* Main Content Scroll */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Image Carousel Section */}
                <View style={styles.imageSection}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.carouselContent}
                    >
                        {displayCandidates.map((bird, index) => (
                            <View key={index} style={styles.birdSlide}>
                                <View style={styles.mainCircle}>
                                    {heroImages[bird.scientific_name] ? (
                                        <Image
                                            source={{ uri: heroImages[bird.scientific_name] }}
                                            style={styles.circleImage}
                                        />
                                    ) : (
                                        <View style={[styles.circleImage, { backgroundColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }]}>
                                            <ImageIcon color="#999" size={40} />
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Captured Thumbnail */}
                    {capturedImage && (
                        <View style={styles.thumbnailContainer}>
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${capturedImage}` }}
                                style={styles.thumbnailImage}
                            />
                        </View>
                    )}
                </View>

                {/* Pagination Tabs */}
                {displayCandidates.length > 1 && (
                    <View style={styles.pagination}>
                        {displayCandidates.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.tabIndicator,
                                    index === activeIndex && styles.activeTab
                                ]}
                            >
                                <Text style={[
                                    styles.tabText,
                                    index === activeIndex && styles.activeTabText
                                ]}>
                                    {index + 1}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bird Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.birdName}>{activeBird.name}</Text>

                    <Text style={styles.taxonomyText}>
                        a species of <Text style={styles.taxonomyHighlight}>{activeBird.taxonomy?.family || 'Unknown Family'}</Text>
                    </Text>

                    {activeBird.also_known_as && activeBird.also_known_as.length > 0 && (
                        <Text style={styles.akaText}>
                            <Text style={styles.akaLabel}>Also known as: </Text>
                            {activeBird.also_known_as.join(', ')}
                        </Text>
                    )}

                    <View style={styles.scientificRow}>
                        <Text style={styles.scientificLabel}>Scientific name: </Text>
                        <Text style={styles.scientificName}>{activeBird.scientific_name}</Text>
                        <TouchableOpacity style={styles.soundBtn}>
                            <Volume2 size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Images Section */}
                <View style={styles.imagesSection}>
                    <View style={styles.sectionHeader}>
                        <ImageIcon size={20} color={Colors.text} />
                        <Text style={styles.sectionTitle}>Images of {activeBird.name}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                        {inatPhotos.length > 0 ? (
                            inatPhotos.map((photo, idx) => (
                                <View key={idx} style={styles.galleryItem}>
                                    <Image source={{ uri: photo.url }} style={styles.galleryImage} />
                                </View>
                            ))
                        ) : (
                            [1, 2, 3, 4].map((_, idx) => (
                                <View key={idx} style={styles.galleryItem}>
                                    <View style={styles.galleryPlaceholder}>
                                        <ImageIcon color="#999" size={24} />
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => onSave(activeBird, capturedImage, inatPhotos)}
                    disabled={isSaving || isSaved}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ height: 24, width: 24 }} />
                    ) : isSaved ? (
                        <Check color={Colors.primary} size={24} />
                    ) : (
                        <Save color={Colors.text} size={24} />
                    )}
                    <Text style={[styles.actionText, (isSaving || isSaved) && { color: Colors.primary }]}>
                        {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionItem}
                    onPress={onReset}
                >
                    <Camera color={Colors.text} size={24} />
                    <Text style={styles.actionText}>New</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <Share2 color={Colors.text} size={24} />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: Spacing.sm,
        zIndex: 10,
    },
    navButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
    },
    imageSection: {
        height: CIRCLE_SIZE + 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    carouselContent: {
        alignItems: 'center',
    },
    birdSlide: {
        width: width,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    circleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbnailContainer: {
        position: 'absolute',
        left: 30,
        bottom: 20,
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE * 0.75,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.white,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    tabIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTab: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.white,
    },
    infoSection: {
        paddingHorizontal: 16,
        marginBottom: Spacing.xl,
    },
    birdName: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        letterSpacing: -0.5,
        marginBottom: Spacing.xs,
    },
    taxonomyText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    taxonomyHighlight: {
        color: Colors.text,
        fontWeight: '600',
    },
    akaText: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    akaLabel: {
        color: Colors.textSecondary,
    },
    scientificRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    scientificLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    scientificName: {
        fontSize: 14,
        fontStyle: 'italic',
        color: Colors.text,
        fontWeight: '500',
    },
    soundBtn: {
        marginLeft: Spacing.xs,
        padding: 4,
    },
    imagesSection: {
        paddingHorizontal: 16,
        marginBottom: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    galleryScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    galleryItem: {
        width: 120,
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#F5F5F5',
    },
    galleryPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    actionItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.text,
    },
    // Skeleton Styles
    headerSection: {
        height: CIRCLE_SIZE + 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    contentSection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
});
