import { Colors } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorials';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Markdown, { ASTNode } from 'react-native-markdown-display';

const { width } = Dimensions.get('window');

// Local image map for inline images as well
const LOCAL_IMAGE_MAP: Record<string, any> = {
    'mastering_lens_hero': require('@/assets/images/birding-tips/mastering_lens_hero.webp'),
    'lighting_comparison': require('@/assets/images/birding-tips/lighting_comparison.webp'),
    'ai_enhancer_hero': require('@/assets/images/birding-tips/ai_enhancer_hero.webp'),
    'detail_zoom': require('@/assets/images/birding-tips/detail_zoom.webp'),
    'backyard_sanctuary_hero': require('@/assets/images/birding-tips/backyard_sanctuary_hero.jpg'),
    'backyard_wild_vs_sterile': require('@/assets/images/birding-tips/backyard_wild_vs_sterile.jpg'),
    'backyard_birdbath': require('@/assets/images/birding-tips/backyard_birdbath.jpg'),
    'feeding_buffet_hero': require('@/assets/images/birding-tips/feeding_buffet_hero.jpg'),
    'feeding_seeds_comparison': require('@/assets/images/birding-tips/feeding_seeds_comparison.jpg'),
    'sounds_hero_sparrow': require('@/assets/images/birding-tips/sounds_hero_sparrow.jpg'),
    'sounds_vocal_chart': require('@/assets/images/birding-tips/sounds_vocal_chart.jpg'),
    'seasonal_hero_goldfinch': require('@/assets/images/birding-tips/seasonal_hero_goldfinch.jpg'),
    'seasonal_migration_map': require('@/assets/images/birding-tips/seasonal_migration_map.jpg'),
};

const resolveAsset = (url: string | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('local:')) {
        const key = url.replace('local:', '');
        return LOCAL_IMAGE_MAP[key];
    }
    return { uri: url };
};

// Placeholder data to show hero immediately while full content loads
const SLUG_META: Record<string, { title: string; cover_image_url: string }> = {
    'mastering-the-lens': {
        title: 'How to identify birds accurately',
        cover_image_url: 'local:mastering_lens_hero'
    },
    'from-blurry-to-brilliant': {
        title: 'How to enhance blurry photos',
        cover_image_url: 'local:ai_enhancer_hero'
    }
};

export default function TutorialDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();

    // Using TanStack Query for robust caching and loading states
    const { data: tutorial, isLoading: loading } = useTutorial(slug!);

    const onShare = async () => {
        if (!tutorial) return;
        try {
            await Share.share({
                message: `Check out this birding guide: ${tutorial.title}`,
                url: `https://birdidentifier.app/tutorial/${tutorial.slug}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Show 'Not Found' only when loading is finished and data is actually missing
    if (!loading && !tutorial) {
        return (
            <View style={styles.centerContainer}>
                <Text>Tutorial not found</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    // Priority: Real tutorial data -> SLUG_META placeholder -> Fallback defaults
    const currentTitle = tutorial?.title || SLUG_META[slug || '']?.title || 'Loading...';
    const currentImage = resolveAsset(tutorial?.cover_image_url || SLUG_META[slug || '']?.cover_image_url || '');

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <ExpoImage
                        source={currentImage}
                        style={styles.heroImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.overlay}
                    />

                    <View style={styles.heroContent}>
                        <Text style={styles.title}>{currentTitle}</Text>
                    </View>
                </View>

                {/* Tiny Loading Bar */}
                {loading && (
                    <View style={styles.loadingBarContainer}>
                        <View style={styles.loadingBar} />
                    </View>
                )}

                {/* Content Section */}
                <View style={styles.contentContainer}>
                    {!tutorial && loading ? (
                        <View style={styles.skeletonContainer}>
                            <View style={[styles.skeletonLine, { width: '90%' }]} />
                            <View style={[styles.skeletonLine, { width: '100%' }]} />
                            <View style={[styles.skeletonLine, { width: '80%' }]} />
                            <View style={[styles.skeletonLine, { width: '95%' }]} />
                        </View>
                    ) : tutorial && (
                        <Markdown
                            style={markdownStyles}
                            rules={{
                                image: (node: ASTNode) => {
                                    const { src, alt } = node.attributes;
                                    const resolved = resolveAsset(src);
                                    return (
                                        <View key={node.key} style={styles.imageBlock}>
                                            <View style={styles.markdownImageContainer}>
                                                <ExpoImage
                                                    source={resolved}
                                                    style={styles.markdownImage}
                                                    contentFit="cover"
                                                    transition={300}
                                                />
                                            </View>
                                            {alt && <Text style={styles.imageCaption}>{alt}</Text>}
                                        </View>
                                    );
                                },
                            }}
                        >
                            {tutorial.markdown_content}
                        </Markdown>
                    )}
                </View>
                <View style={styles.footer} />
            </ScrollView>

            {/* Action Bar (Identify Button) */}
            {tutorial?.cta_label && (
                <View style={styles.actionBar}>
                    <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/scanner')}>
                        <Text style={styles.ctaText}>{tutorial?.cta_label}</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    heroContainer: {
        height: 280,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        position: 'absolute',
        bottom: 24,
        left: 13,
        right: 13,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.white,
        lineHeight: 28,
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    contentContainer: {
        paddingHorizontal: 14,
        paddingVertical: 24,
        backgroundColor: Colors.white,
    },
    markdownImageContainer: {
        width: width - 28,
        height: 240,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    markdownImage: {
        width: '100%',
        height: '100%',
    },
    imageBlock: {
        marginVertical: 20,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    imageCaption: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 8,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    backButton: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.primary,
        borderRadius: 10,
    },
    backButtonText: {
        color: Colors.white,
        fontWeight: '600',
    },
    footer: {
        height: 120,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 40,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    ctaButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    ctaText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
    loadingBarContainer: {
        height: 2,
        width: '100%',
        backgroundColor: '#f1f5f9',
    },
    loadingBar: {
        height: '100%',
        width: '40%',
        backgroundColor: Colors.primary,
        borderRadius: 1,
    },
    skeletonContainer: {
        gap: 12,
    },
    skeletonLine: {
        height: 14,
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
    },
});

const markdownStyles = {
    body: {
        fontSize: 18,
        color: '#334155',
        lineHeight: 28,
        fontFamily: 'Inter_400Regular',
    },
    heading1: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 26,
        fontWeight: '800' as const,
        color: '#1e293b',
        marginTop: 20,
        marginBottom: 10,
    },
    heading2: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 22,
        fontWeight: '700' as const,
        color: '#1e293b',
        marginTop: 18,
        marginBottom: 8,
    },
    heading3: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 22,
        fontWeight: '800' as const,
        color: '#0f172a',
        marginTop: 24,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    paragraph: {
        fontFamily: 'Inter_400Regular',
        marginBottom: 16,
    },
    blockquote: {
        backgroundColor: '#f1f5f9',
        borderLeftColor: Colors.primary,
        borderLeftWidth: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginVertical: 16,
        borderRadius: 8,
    },
    strong: {
        fontFamily: 'Inter_600SemiBold',
        fontWeight: '700' as const,
        color: '#0f172a',
    },
};
