import { BirdProfileContent } from '@/components/shared/BirdProfileContent';
import { ImageViewer } from '@/components/shared/profile/ImageViewer';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { BirdResult } from '@/types/scanner';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Activity, Camera, Check, ChevronLeft, Image as ImageIcon, Save, Share2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { MiniAudioPlayer } from './MiniAudioPlayer';


interface IdentificationResultProps {
    result: BirdResult | null;
    candidates?: BirdResult[];
    enrichedCandidates: BirdResult[];
    heroImages: Record<string, string>;
    capturedImage: string | null;
    recordingUri?: string | null;
    isSaving: boolean;
    savedIndices: Set<number>;
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    enrichCandidate: (index: number, data: Partial<BirdResult>) => void;
    updateHeroImage: (scientificName: string, url: string) => void;
    onSave: (bird: BirdResult, capturedImage: string | null, recordingUri?: string | null) => void;
    onReset: () => void;
    isProcessing?: boolean;
}

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.48;
const SPACER_WIDTH = (width - ITEM_WIDTH) / 2;
const CIRCLE_SIZE = 150;
const SIDE_CIRCLE_SIZE = 100;
const ACTIVE_TAB_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='32' viewBox='0 0 40 32'%3E%3Cpath d='M 0 32 Q 8 32 8 24 L 8 12 A 12 12 0 0 1 32 12 L 32 24 Q 32 32 40 32 Z' fill='white' /%3E%3C/svg%3E`;

const SkeletonLoader = () => {
    return (
        <View style={styles.container}>
            <View style={styles.heroSection}>
                <Skeleton colorMode="light" width={240} height={240} radius="round" />
            </View>
            <View style={styles.contentSection}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Skeleton colorMode="light" width={250} height={32} />
                    <View style={{ height: 8 }} />
                    <Skeleton colorMode="light" width={180} height={20} />
                </View>
            </View>
        </View>
    );
};

const SavedOverlay = ({ visible }: { visible: boolean }) => {
    return (
        <View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                {
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 100,
                }
            ]}
        >
            <MotiView
                from={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: visible ? 1 : 0,
                    scale: visible ? 1 : 0.5
                }}
                transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 150,
                }}
                style={styles.savedBadge}
            >
                <BlurView intensity={40} tint="light" style={styles.savedBadgeBlur}>
                    <View style={styles.savedBadgeContent}>
                        <View style={styles.savedIconCircle}>
                            <Check color={Colors.white} size={28} strokeWidth={3} />
                        </View>
                        <Text style={styles.savedBadgeText}>Saved!</Text>
                    </View>
                </BlurView>
            </MotiView>
        </View>
    );
};

export const IdentificationResult: React.FC<IdentificationResultProps> = ({
    result,
    candidates = [],
    enrichedCandidates,
    heroImages,
    capturedImage,
    isSaving,
    savedIndices,
    activeIndex,
    setActiveIndex,
    enrichCandidate,
    updateHeroImage,
    onSave,
    onReset,
    isProcessing = false,
    recordingUri,
}) => {
    const router = useRouter();
    const sourceMode = recordingUri ? 'sound' : 'photo';

    const activeBirdFromProps = enrichedCandidates[activeIndex] || result;

    // With streaming, candidate data arrives fast (~4s) but media arrives later.
    // Only show skeleton if we have zero candidate data at all.
    const hasAnyCandidateData = enrichedCandidates.length > 0 || result !== null;
    const [isLoading, setIsLoading] = React.useState(!hasAnyCandidateData);

    // Stop loading once we have any candidate data
    useEffect(() => {
        if (hasAnyCandidateData && isLoading) {
            setIsLoading(false);
        }
    }, [hasAnyCandidateData]);

    // Unified list for carousel
    const carouselItems = React.useMemo(() => enrichedCandidates.slice(0, 3), [enrichedCandidates]);

    const isComparisonTab = activeIndex === carouselItems.length;

    // Stabilize the active bird reference so we don't re-render BirdProfileContent 
    // when media arrives for OTHER candidates.
    const activeBird = React.useMemo(() => {
        if (isComparisonTab) return null;
        return carouselItems[activeIndex] || null;
    }, [carouselItems[activeIndex], isComparisonTab]);

    const isSavedForActive = savedIndices.has(activeIndex);

    const scrollX = React.useRef(new Animated.Value(0)).current;

    const carouselItemsWithComparison = React.useMemo(() => [...carouselItems, { type: 'comparison' }], [carouselItems]);

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false, // Need to set for onScroll to trigger other things if not careful, but let's use it for animations
            listener: (event: any) => {
                const index = event.nativeEvent.contentOffset.x / ITEM_WIDTH;
                const roundIndex = Math.round(index);
                if (roundIndex >= 0 && roundIndex <= carouselItems.length && roundIndex !== activeIndex) {
                    setActiveIndex(roundIndex);
                }
            }
        }
    );

    const handleOpenTips = (bird: BirdResult, section?: string) => {
        router.push({
            pathname: '/birding-tips',
            params: {
                birdData: JSON.stringify(bird),
                initialSection: section
            }
        });
    };

    const [isImageViewerVisible, setIsImageViewerVisible] = React.useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

    const playScientificName = () => {
        if (activeBird?.scientific_name) {
            Speech.speak(activeBird.scientific_name, {
                language: 'la',
                pitch: 1.0,
                rate: 0.9,
            });
        }
    };

    if (isLoading) {
        return <SkeletonLoader />;
    }

    return (
        <View style={styles.container}>
            {/* Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={onReset} style={styles.navButton}>
                    <ChevronLeft color={Colors.white} size={28} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={onReset}>
                    <Camera color={Colors.white} size={24} />
                </TouchableOpacity>
            </View>

            {/* Main Content Scroll */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Image & Pagination Section */}
                <View style={[styles.heroSection, { height: width * 0.76 }]}>
                    {/* Blurred Background - Instant-feel: Use captured image as backdrop until hero image arrives */}
                    <View style={StyleSheet.absoluteFill}>
                        {activeBird && heroImages[activeBird.scientific_name] ? (
                            <Image
                                source={{ uri: heroImages[activeBird.scientific_name] }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                transition={500}
                                cachePolicy="memory-disk"
                            />
                        ) : sourceMode === 'photo' && capturedImage ? (
                            <Image
                                source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                transition={300}
                                cachePolicy="memory-disk"
                            />
                        ) : sourceMode === 'sound' ? (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]}>
                                {/* Spectrogram-like background for sound */}
                                <LinearGradient
                                    colors={['#1A1A1A', '#2D3436', '#1A1A1A']}
                                    style={StyleSheet.absoluteFill}
                                />
                            </View>
                        ) : isComparisonTab && capturedImage ? (
                            <Image
                                source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                transition={500}
                                cachePolicy="memory-disk"
                            />
                        ) : null}
                        <BlurView intensity={sourceMode === 'sound' ? 40 : 70} style={StyleSheet.absoluteFill} tint="dark" />
                    </View>

                    <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={ITEM_WIDTH}
                        decelerationRate="fast"
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={[
                            styles.carouselContent,
                            { paddingHorizontal: SPACER_WIDTH }
                        ]}
                    >
                        {/* Bird Candidates + Comparison Tab */}
                        {carouselItemsWithComparison.map((item: any, index) => {
                            const inputRange = [
                                (index - 1) * ITEM_WIDTH,
                                index * ITEM_WIDTH,
                                (index + 1) * ITEM_WIDTH,
                            ];

                            const scale = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.8, 1, 0.8],
                                extrapolate: 'clamp',
                            });

                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.8, 1, 0.8],
                                extrapolate: 'clamp',
                            });

                            const isBird = item.scientific_name !== undefined;

                            return (
                                <Animated.View key={index} style={[
                                    styles.birdSlide,
                                    { transform: [{ scale }], opacity, width: ITEM_WIDTH }
                                ]}>
                                    <View style={styles.mainCircle}>
                                        {isBird ? (
                                            heroImages[item.scientific_name] ? (
                                                <Image
                                                    source={{ uri: heroImages[item.scientific_name] }}
                                                    style={styles.circleImage}
                                                    cachePolicy="memory-disk"
                                                />
                                            ) : (
                                                <View style={[styles.circleImage, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <ImageIcon color="#666" size={40} />
                                                </View>
                                            )
                                        ) : (
                                            sourceMode === 'photo' && capturedImage ? (
                                                <Image
                                                    source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                                                    style={styles.circleImage}
                                                    cachePolicy="memory-disk"
                                                />
                                            ) : sourceMode === 'sound' && recordingUri ? (
                                                <View style={[styles.circleImage, { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Activity color={Colors.primary} size={48} />
                                                    <Text style={{ color: Colors.white, fontSize: 12, marginTop: 8, fontWeight: '600' }}>YOUR CAPTURE</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.circleImage, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Camera color="#666" size={48} />
                                                </View>
                                            )
                                        )}
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </Animated.ScrollView>

                    {/* User Captured Photo/Sound Thumbnail (Bottom Left) */}
                    {sourceMode === 'photo' && capturedImage && (
                        <View style={styles.thumbnailContainer}>
                            <Image
                                source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                                style={styles.thumbnailImage}
                            />
                        </View>
                    )}

                    {sourceMode === 'sound' && recordingUri && !isComparisonTab && activeBird && (
                        <View style={styles.listenBackContainer}>
                            <MiniAudioPlayer uri={recordingUri} />
                        </View>
                    )}

                    {/* Saved Success Overlay */}
                    <SavedOverlay visible={isSavedForActive} />

                    {/* Pagination Tabs */}
                    <View style={styles.pagination}>
                        {Array.from({ length: carouselItems.length + 1 }).map((_, index) => {
                            const isActive = index === activeIndex;
                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.tabIndicator,
                                        isActive && styles.activeTab
                                    ]}
                                >
                                    {isActive && (
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.white, borderRadius: 12 }]} />
                                    )}
                                    <Text style={[
                                        styles.tabText,
                                        isActive && styles.activeTabText
                                    ]}>
                                        {index === carouselItems.length ? '?' : index + 1}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
                <View style={styles.contentContainer}>
                    {!isComparisonTab && activeBird ? (
                        <BirdProfileContent
                            key={`profile-${activeIndex}-${activeBird.scientific_name}`}
                            bird={activeBird}
                            inatPhotos={activeBird.inat_photos}
                            sounds={activeBird.sounds}
                            isLoadingSounds={!activeBird.sounds?.length && !activeBird.inat_photos?.length && isProcessing}
                            onOpenTips={(section) => handleOpenTips(activeBird, section)}
                            onPlaySound={playScientificName}
                            onImagePress={(idx) => {
                                setSelectedImageIndex(idx);
                                setIsImageViewerVisible(true);
                            }}
                            isEnrichmentComplete={!isProcessing}
                            onOpenIdentification={() => {
                                router.push({
                                    pathname: '/identification-detail',
                                    params: { birdData: JSON.stringify(activeBird) }
                                });
                            }}
                            sourceMode={sourceMode}
                        />
                    ) : (
                        <View style={styles.correctionSection}>
                            <Text style={styles.correctionTitle}>Correct the result?</Text>
                            <Text style={styles.correctionText}>
                                Not the bird you're looking for? If the suggests above don't match your capture, you can view your collection or try again.
                            </Text>
                            <TouchableOpacity style={styles.correctBtn} onPress={() => router.push('/(tabs)/collection')}>
                                <Text style={styles.correctBtnText}>View Collection</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            {
                !isComparisonTab && activeBird && (
                    <View style={styles.bottomBar}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => onSave(activeBird, capturedImage, recordingUri)}
                            disabled={isSaving || isSavedForActive}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : isSavedForActive ? (
                                <Check color={Colors.primary} size={24} />
                            ) : (
                                <Save color={Colors.text} size={24} />
                            )}
                            <Text style={[styles.actionText, (isSaving || isSavedForActive) && { color: Colors.primary }]}>
                                {isSaving ? 'Saving...' : isSavedForActive ? 'Saved' : 'Save'}
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
                )
            }
            {/* Image Viewer Component */}
            <ImageViewer
                visible={isImageViewerVisible}
                images={activeBird?.inat_photos || []}
                initialIndex={selectedImageIndex}
                onClose={() => setIsImageViewerVisible(false)}
            />
        </View >
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
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: Spacing.sm,
        zIndex: 30,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    navButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...Typography.h3,
        color: Colors.white,
        fontWeight: '700',
    },
    contentContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginTop: -24,
        paddingTop: 24,
        paddingBottom: 40,
        minHeight: height * 0.6,
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroSection: {
        backgroundColor: Colors.surface,
        paddingTop: 30,
        paddingBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    carouselContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    birdSlide: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: Colors.white,
        borderWidth: 2,
        borderColor: Colors.white,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    circleImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailContainer: {
        position: 'absolute',
        bottom: 50,
        left: 16,
        width: 85,
        height: 54,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: Colors.white,
        overflow: 'hidden',
        zIndex: 20,
        backgroundColor: Colors.surface,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    tabIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activeTab: {
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    activeTabBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    tabText: {
        ...Typography.label,
        color: '#666',
        fontSize: 13,
        fontWeight: '700',
    },
    activeTabText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    correctionSection: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        margin: 20,
        borderRadius: 24,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: Colors.textSecondary + '33',
    },
    correctionTitle: {
        ...Typography.h2,
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    correctionText: {
        ...Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    correctBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
        alignSelf: 'center',
    },
    correctBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: Colors.white,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 25,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    actionItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
    },
    contentSection: {
        paddingTop: Spacing.lg,
    },
    savedBadge: {
        width: 140,
        height: 140,
        borderRadius: 70,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
    },
    savedBadgeBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    savedBadgeContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    savedIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    savedBadgeText: {
        ...Typography.h3,
        color: Colors.white,
        fontWeight: '800',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    listenBackContainer: {
        position: 'absolute',
        bottom: 32,
        left: 8,
        zIndex: 60,
    },
});
