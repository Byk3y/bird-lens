import { useAlert } from '@/components/common/AlertProvider';
import { ShareCardBottomSheet } from '@/components/share/ShareCardBottomSheet';
import { BirdingTipsBottomSheet } from '@/components/shared/BirdingTipsBottomSheet';
import { BirdProfileContent } from '@/components/shared/BirdProfileContent';
import { IdentificationDetailBottomSheet } from '@/components/shared/IdentificationDetailBottomSheet';
import { ImageViewer } from '@/components/shared/profile/ImageViewer';
import { Colors } from '@/constants/theme';
import { useSubscriptionGating } from '@/hooks/useSubscriptionGating';
import { useAuth } from '@/lib/auth';
import { BirdResult } from '@/types/scanner';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Camera, Check, ChevronLeft, LayoutGrid, Lightbulb, Save, Share2 } from 'lucide-react-native';
import { Skeleton } from 'moti/skeleton';
import React, { useEffect } from 'react';
import { ActivityIndicator, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroBackdrop } from './HeroBackdrop';
import { ITEM_WIDTH, styles } from './IdentificationResult.styles';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import { PaginationTabs } from './PaginationTabs';
import { ResultCarousel } from './ResultCarousel';
import { SavedOverlay } from './SavedOverlay';

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
    locationName?: string | null;
}

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
    locationName,
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isPro } = useAuth();
    const { identificationsUsed } = useSubscriptionGating();
    const { showToast } = useAlert();
    const sourceMode = recordingUri ? 'sound' : 'photo';

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

    // Stabilize the active bird reference
    const activeBird = React.useMemo(() => {
        if (isComparisonTab) return null;
        return carouselItems[activeIndex] || null;
    }, [carouselItems, activeIndex, isComparisonTab]);

    const isSavedForActive = savedIndices.has(activeIndex);
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const carouselItemsWithComparison = React.useMemo(() => [...carouselItems, { type: 'comparison' }], [carouselItems]);

    // MANDATORY PRESERVATION: Animation logic and scale mapping
    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: true,
            listener: (event: any) => {
                const index = event.nativeEvent.contentOffset.x / ITEM_WIDTH;
                const roundIndex = Math.round(index);
                if (roundIndex >= 0 && roundIndex <= carouselItems.length && roundIndex !== activeIndex) {
                    setActiveIndex(roundIndex);
                }
            }
        }
    );

    const [tipsVisible, setTipsVisible] = React.useState(false);
    const [tipsSection, setTipsSection] = React.useState<string | undefined>(undefined);
    const [identificationVisible, setIdentificationVisible] = React.useState(false);

    const handleOpenTips = (bird: BirdResult, section?: string) => {
        setTipsSection(section);
        setTipsVisible(true);
    };

    const [isImageViewerVisible, setIsImageViewerVisible] = React.useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
    const [shareSheetVisible, setShareSheetVisible] = React.useState(false);
    const [seenNudges, setSeenNudges] = React.useState<Set<number>>(new Set());

    const playScientificName = () => {
        if (activeBird?.scientific_name) {
            Speech.speak(activeBird.scientific_name, {
                language: 'la',
                pitch: 1.0,
                rate: 0.9,
            });
        }
    };

    // Discovery Nudge Toast
    useEffect(() => {
        if (isSavedForActive && !seenNudges.has(activeIndex)) {
            // Short delay to let the generic "Saved!" center alert finish/dismiss
            const timer = setTimeout(() => {
                showToast('✨ Beautiful capture! Share your sighting card with friends.', 'success');
                setSeenNudges(prev => {
                    const next = new Set(prev);
                    next.add(activeIndex);
                    return next;
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isSavedForActive, activeIndex, seenNudges, showToast]);

    if (isLoading) {
        return <SkeletonLoader />;
    }

    return (
        <View style={styles.container}>
            {/* Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} onPress={onReset} style={styles.navButton}>
                    <View pointerEvents="none">
                        <ChevronLeft color={Colors.white} size={28} />
                    </View>
                </TouchableOpacity>

                {/* Credits Badge — only for free users */}
                {!isPro && (
                    <View style={{
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                    }}>
                        <Text style={{
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: '700',
                            letterSpacing: 0.3,
                        }}>
                            ID {identificationsUsed} of 7
                        </Text>
                    </View>
                )}

                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    style={[styles.navButton, styles.doneButton, { width: undefined }]}
                    onPress={onReset}
                >
                    <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Camera color={Colors.white} size={20} />
                        <Text style={styles.doneButtonText}>New</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Main Content Scroll */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
            >
                {/* Image & Pagination Section */}
                <View style={styles.heroSection}>
                    <HeroBackdrop
                        activeBird={activeBird}
                        heroImages={heroImages}
                        sourceMode={sourceMode}
                        capturedImage={capturedImage}
                        isComparisonTab={isComparisonTab}
                    />

                    <ResultCarousel
                        scrollX={scrollX}
                        onScroll={onScroll}
                        carouselItemsWithComparison={carouselItemsWithComparison}
                        heroImages={heroImages}
                        sourceMode={sourceMode}
                        capturedImage={capturedImage}
                        recordingUri={recordingUri}
                    />

                    {/* User Captured Photo/Sound Thumbnail (Bottom Left) */}
                    {sourceMode === 'photo' && capturedImage && (
                        <View style={styles.thumbnailContainer}>
                            <Image
                                source={{ uri: capturedImage }}
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
                    <PaginationTabs
                        length={carouselItems.length + 1}
                        activeIndex={activeIndex}
                    />
                </View>

                <View style={styles.contentContainer}>
                    {!isComparisonTab && activeBird ? (
                        <BirdProfileContent
                            key={`profile-${activeIndex}-${activeBird.scientific_name}`}
                            bird={activeBird}
                            inatPhotos={activeBird.inat_photos}
                            sounds={activeBird.sounds}
                            isLoadingSounds={!activeBird.sounds?.length && !activeBird.inat_photos?.length && isProcessing}
                            isLoadingImages={!activeBird.inat_photos?.length && isProcessing}
                            onOpenTips={(section) => handleOpenTips(activeBird, section)}
                            onPlaySound={playScientificName}
                            onImagePress={(idx) => {
                                setSelectedImageIndex(idx);
                                setIsImageViewerVisible(true);
                            }}
                            isEnrichmentComplete={!isProcessing}
                            onOpenIdentification={() => {
                                setIdentificationVisible(true);
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
            {!isComparisonTab && activeBird && (
                <View style={[styles.bottomBar, { height: 75 + Math.max(insets.bottom, 16), paddingBottom: Math.max(insets.bottom, 16), backgroundColor: Colors.white, paddingHorizontal: 12 }]}>
                    {/* Left Slot: Tips or Done */}
                    {isSavedForActive ? (
                        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            style={styles.actionItem}
                            onPress={() => router.replace('/(tabs)/collection')}
                        >
                            <View style={styles.iconContainer} pointerEvents="none">
                                <LayoutGrid color={Colors.text} size={24} />
                            </View>
                            <Text style={styles.actionText}>Collection</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            style={styles.actionItem}
                            onPress={() => setTipsVisible(true)}
                        >
                            <View style={styles.iconContainer} pointerEvents="none">
                                <Lightbulb color={Colors.text} size={24} />
                            </View>
                            <Text style={styles.actionText}>Tips</Text>
                        </TouchableOpacity>
                    )}

                    {/* Center Slot: Save Action */}
                    <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        style={styles.actionItem}
                        onPress={() => onSave(activeBird, capturedImage, recordingUri)}
                        disabled={isSaving || isSavedForActive}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <View style={isSavedForActive ? styles.savedIconContainer : styles.saveIconContainer} pointerEvents="none">
                                {isSavedForActive ? (
                                    <Check color={Colors.primary} size={24} />
                                ) : (
                                    <Save color={Colors.white} size={24} />
                                )}
                            </View>
                        )}
                        <Text style={[styles.actionText, isSavedForActive && { color: Colors.primary }]}>
                            {isSaving ? 'Saving...' : isSavedForActive ? 'Saved' : 'Save'}
                        </Text>
                    </TouchableOpacity>

                    {/* Right Slot: Share Action */}
                    <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        style={isSavedForActive ? styles.shareActionHighlight : styles.actionItem}
                        onPress={() => setShareSheetVisible(true)}
                    >
                        <View style={isSavedForActive ? styles.shareIconContainerActive : undefined} pointerEvents="none">
                            <Share2 color={isSavedForActive ? Colors.white : Colors.text} size={22} />
                        </View>
                        <Text style={[styles.actionText, isSavedForActive && styles.shareTextActive]}>
                            {isSavedForActive ? "Share Card" : "Share"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Image Viewer Component */}
            <ImageViewer
                visible={isImageViewerVisible}
                images={activeBird?.inat_photos || []}
                initialIndex={selectedImageIndex}
                onClose={() => setIsImageViewerVisible(false)}
            />

            {/* Share Card Bottom Sheet */}
            {activeBird && (
                <ShareCardBottomSheet
                    visible={shareSheetVisible}
                    onClose={() => setShareSheetVisible(false)}
                    bird={activeBird}
                    imageUrl={capturedImage || heroImages[activeBird.scientific_name]}
                    locationName={locationName || undefined}
                    onSuccess={() => {
                        // Auto-save if not already saved
                        if (!isSavedForActive) {
                            onSave(activeBird, capturedImage, recordingUri);
                        }
                        // Navigate to collection after successful share
                        router.replace('/(tabs)/collection');
                    }}
                />
            )}

            {/* Birding Tips Bottom Sheet */}
            {activeBird && (
                <BirdingTipsBottomSheet
                    visible={tipsVisible}
                    onClose={() => setTipsVisible(false)}
                    bird={activeBird}
                    initialSection={tipsSection}
                />
            )}

            {/* Identification Detail Bottom Sheet */}
            {activeBird && (
                <IdentificationDetailBottomSheet
                    visible={identificationVisible}
                    onClose={() => setIdentificationVisible(false)}
                    bird={activeBird}
                />
            )}
        </View>
    );
};
