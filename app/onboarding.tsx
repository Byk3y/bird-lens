import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { onboardingState } from '@/lib/onboardingState';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDES = [
    {
        id: '1',
        headline: 'See a bird?\nSnap a photo.',
        image: require('@/assets/images/onboarding/carousel-slide-1-photo-id.jpg'),
    },
    {
        id: '2',
        headline: 'Hear a bird?\nHit record.',
        image: require('@/assets/images/onboarding/carousel-slide-2-sound-id.jpg'),
    },
    {
        id: '3',
        headline: 'Build your personal\nbird collection.',
        image: require('@/assets/images/onboarding/carousel-slide-3-collection.jpg'),
    },
];

const AUTO_ADVANCE_MS = 2500;
const RESUME_DELAY_MS = 2500;

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Auto-advance timer ref
    const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUserSwiping = useRef(false);
    const currentIndex = useRef(0);

    // Track viewable items
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                const newIndex = viewableItems[0].index;
                setActiveIndex(newIndex);
                currentIndex.current = newIndex;
            }
        }
    ).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const goToPaywall = useCallback(async () => {
        await onboardingState.markAsCompleted();
        router.push('/paywall');
    }, [router]);

    // Clear all timers
    const clearTimers = useCallback(() => {
        if (autoAdvanceTimer.current) {
            clearTimeout(autoAdvanceTimer.current);
            autoAdvanceTimer.current = null;
        }
        if (resumeTimer.current) {
            clearTimeout(resumeTimer.current);
            resumeTimer.current = null;
        }
    }, []);

    // Auto-advance logic — only slides 1 and 2; slide 3 stops
    const scheduleAutoAdvance = useCallback(() => {
        clearTimers();
        // Don't auto-advance from the last slide
        if (currentIndex.current >= SLIDES.length - 1) return;

        autoAdvanceTimer.current = setTimeout(() => {
            if (isUserSwiping.current) return;

            const nextIndex = currentIndex.current + 1;
            if (nextIndex < SLIDES.length) {
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            }
        }, AUTO_ADVANCE_MS);
    }, [clearTimers]);

    // Start auto-advance on mount and when index changes
    useEffect(() => {
        scheduleAutoAdvance();
        return clearTimers;
    }, [activeIndex, scheduleAutoAdvance, clearTimers]);

    // Handle manual scroll start
    const onScrollBeginDrag = useCallback(() => {
        isUserSwiping.current = true;
        clearTimers();
    }, [clearTimers]);

    // Handle manual scroll end
    const onScrollEndDrag = useCallback(() => {
        isUserSwiping.current = false;
        resumeTimer.current = setTimeout(() => {
            scheduleAutoAdvance();
        }, RESUME_DELAY_MS);
    }, [scheduleAutoAdvance]);

    // "Get Started" button on slide 3
    const handleGetStarted = useCallback(() => {
        clearTimers();
        goToPaywall();
    }, [clearTimers, goToPaywall]);

    // Render a single slide
    const renderSlide = useCallback(
        ({ item }: { item: (typeof SLIDES)[number] }) => (
            <View style={[styles.slide, { width: screenWidth }]}>
                <View style={styles.headlineContainer}>
                    <Text style={styles.headline}>{item.headline}</Text>
                </View>
                <View style={styles.imageContainer}>
                    <Image
                        source={item.image}
                        style={[styles.slideImage, { width: screenWidth * 0.75 }]}
                        contentFit="contain"
                        transition={200}
                    />
                </View>
            </View>
        ),
        [screenWidth]
    );

    return (
        <View style={styles.container}>
            {/* Carousel */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScrollBeginDrag={onScrollBeginDrag}
                onScrollEndDrag={onScrollEndDrag}
                getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
                style={styles.carousel}
            />

            {/* Bottom area: dots + Get Started button on last slide */}
            <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
                <View style={styles.dotsContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === activeIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                {activeIndex === SLIDES.length - 1 && (
                    <TouchableOpacity
                        onPress={handleGetStarted}
                        style={styles.getStartedButton}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.getStartedButtonText}>Get Started</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F4',
    },
    bottomArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 28,
        gap: 20,
    },
    getStartedButton: {
        backgroundColor: '#1a1a1a',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
    },
    getStartedButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    carousel: {
        flex: 1,
    },
    slide: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    headlineContainer: {
        paddingTop: '18%',
        paddingHorizontal: 28,
        paddingBottom: 24,
    },
    headline: {
        fontSize: 32,
        fontFamily: 'PoppinsBold',
        fontWeight: '700',
        color: '#1a1a1a',
        lineHeight: 40,
        letterSpacing: -0.5,
    },
    imageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 80,
    },
    slideImage: {
        height: '100%',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#F97316',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: '#1a1a1a',
        width: 24,
    },
    dotInactive: {
        backgroundColor: '#D6D3D1',
    },
});
