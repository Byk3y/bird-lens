import { BirdProfileContent } from '@/components/shared/BirdProfileContent';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { BirdResult } from '@/types/scanner';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Camera, Check, ChevronLeft, Image as ImageIcon, Save, Share2 } from 'lucide-react-native';
import { Skeleton } from 'moti/skeleton';
import React, { useEffect } from 'react';
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
    enrichedCandidates: BirdResult[];
    heroImages: Record<string, string>;
    capturedImage: string | null;
    isSaving: boolean;
    isSaved?: boolean;
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    enrichCandidate: (index: number, data: Partial<BirdResult>) => void;
    updateHeroImage: (scientificName: string, url: string) => void;
    onSave: (bird: BirdResult, capturedImage: string | null) => void;
    onReset: () => void;
}

const { width } = Dimensions.get('window');

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
    isSaved,
    activeIndex,
    setActiveIndex,
    enrichCandidate,
    updateHeroImage,
    onSave,
    onReset,
}) => {
    const router = useRouter();

    const activeBirdFromProps = enrichedCandidates[activeIndex] || result;
    const [isLoading, setIsLoading] = React.useState(!heroImages[activeBirdFromProps?.scientific_name || '']);

    // Simplified effect: Stop loading once data is available
    useEffect(() => {
        if (activeBirdFromProps && heroImages[activeBirdFromProps.scientific_name]) {
            setIsLoading(false);
        }
    }, [activeIndex, heroImages, activeBirdFromProps]);

    // Unified list for carousel
    const carouselItems = enrichedCandidates.slice(0, 3);
    const isComparisonTab = activeIndex === carouselItems.length;
    const activeBird = !isComparisonTab ? carouselItems[activeIndex] : null;

    // Simulate short initial loading ONLY if we have no data at all
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const onScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);

        if (roundIndex >= 0 && roundIndex <= carouselItems.length && roundIndex !== activeIndex) {
            setActiveIndex(roundIndex);
        }
    };

    const handleOpenTips = (bird: BirdResult) => {
        router.push({
            pathname: '/birding-tips',
            params: { birdData: JSON.stringify(bird) }
        });
    };

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
                    <ChevronLeft color={Colors.text} size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Identification</Text>
                <TouchableOpacity style={styles.navButton} onPress={onReset}>
                    <Camera color={Colors.text} size={24} />
                </TouchableOpacity>
            </View>

            {/* Main Content Scroll */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Image & Pagination Section */}
                <View style={styles.heroSection}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.carouselContent}
                    >
                        {/* Bird Candidates */}
                        {carouselItems.map((bird, index) => (
                            <View key={index} style={styles.birdSlide}>
                                <View style={styles.mainCircle}>
                                    {heroImages[bird.scientific_name] ? (
                                        <Image
                                            source={{ uri: heroImages[bird.scientific_name] }}
                                            style={styles.circleImage}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.circleImage, { backgroundColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }]}>
                                            <ImageIcon color="#999" size={40} />
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Comparison Tab */}
                        <View style={styles.birdSlide}>
                            <View style={[styles.mainCircle, { borderColor: Colors.primary }]}>
                                {capturedImage ? (
                                    <Image
                                        source={{ uri: `data:image/jpeg;base64,${capturedImage}` } as any}
                                        style={styles.circleImage}
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View style={[styles.circleImage, { backgroundColor: '#F8F7F4', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Camera color={Colors.primary} size={48} />
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Pagination Tabs */}
                    <View style={styles.pagination}>
                        {Array.from({ length: carouselItems.length + 1 }).map((_, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.tabIndicator,
                                    index === activeIndex && styles.activeTab
                                ]}
                                onPress={() => { }} // Could implement tapping to scroll
                            >
                                <Text style={[
                                    styles.tabText,
                                    index === activeIndex && styles.activeTabText
                                ]}>
                                    {index === carouselItems.length ? '?' : index + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                {!isComparisonTab && activeBird ? (
                    <BirdProfileContent
                        bird={activeBird}
                        inatPhotos={activeBird.inat_photos}
                        sounds={activeBird.sounds}
                        onOpenTips={() => handleOpenTips(activeBird)}
                        onPlaySound={playScientificName}
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

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            {
                !isComparisonTab && activeBird && (
                    <View style={styles.bottomBar}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => onSave(activeBird, capturedImage)}
                            disabled={isSaving || isSaved}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
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
                )
            }
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
    headerTitle: {
        ...Typography.h3,
        color: Colors.text,
        fontWeight: '700',
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroSection: {
        backgroundColor: Colors.surface,
        paddingVertical: 24,
        alignItems: 'center',
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
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: Colors.white,
        borderWidth: 8,
        borderColor: Colors.surfaceLight,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    circleImage: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
        backgroundColor: Colors.surfaceLight,
        padding: 6,
        borderRadius: 25,
    },
    tabIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    tabText: {
        ...Typography.label,
        color: Colors.textTertiary,
        fontSize: 14,
    },
    activeTabText: {
        color: Colors.white,
        fontWeight: '900',
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
});
