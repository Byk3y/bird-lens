import { DIET_ASSETS, FEEDER_ASSETS } from '@/constants/bird-assets';
import { BirdResult } from '@/types/scanner';
import { getHabitatIcon, getNestingIcon } from '@/utils/bird-profile-helpers';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Lightbulb } from 'lucide-react-native';
import React from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function BirdingTipsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ birdData: string; initialSection?: string }>();
    const scrollViewRef = React.useRef<ScrollView>(null);
    const sectionLayouts = React.useRef<Record<string, number>>({});
    const [layoutsReady, setLayoutsReady] = React.useState(false);

    const bird = React.useMemo(() => {
        try {
            return params.birdData ? JSON.parse(params.birdData as string) as BirdResult : null;
        } catch (e) {
            console.error('Failed to parse bird data', e);
            return null;
        }
    }, [params.birdData]);

    if (!bird) {
        return (
            <View style={[styles.screenWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>Bird data not found</Text>
            </View>
        );
    }

    const translateY = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            const isHeaderTouch = evt.nativeEvent.pageY < 150;
            return isHeaderTouch && gestureState.dy > 5;
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                translateY.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                Animated.timing(translateY, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }).start(() => router.back());
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 4,
                }).start();
            }
        },
    }), [height, router, translateY]);

    const renderAssetGrid = (title: string, tags: string[], assetMap: Record<string, any>, onLayout?: (event: any) => void) => {
        if (!tags || tags.length === 0) return null;

        const filteredTags = tags.filter(t => {
            const low = t?.toLowerCase();
            return low && !['none', 'n/a', 'nil', 'unknown', 'none.'].includes(low);
        });

        if (filteredTags.length === 0) return null;

        const resolvedItems = filteredTags.reduce((acc: { tag: string; asset: any }[], tag) => {
            const normalizedTag = tag.toLowerCase().trim();
            let asset = assetMap[normalizedTag];

            if (!asset) {
                const sortedKeys = Object.keys(assetMap).sort((a, b) => b.length - a.length);
                const key = sortedKeys.find(k => normalizedTag.includes(k) || k.includes(normalizedTag));
                if (key) asset = assetMap[key];
            }

            if (!asset || !acc.some(item => item.asset === asset)) {
                acc.push({ tag, asset });
            }
            return acc;
        }, []);

        return (
            <View style={styles.section} onLayout={onLayout}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                    {resolvedItems.map((item, index) => (
                        <View key={index} style={styles.gridItem}>
                            <View style={styles.assetWrapper}>
                                {item.asset ? (
                                    <Image source={item.asset} style={styles.assetImage} />
                                ) : (
                                    <View style={[styles.assetImage, styles.placeholderAsset]}>
                                        <Text style={styles.placeholderText}>{item.tag.substring(0, 1).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.assetLabel} numberOfLines={2}>{item.tag}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    React.useEffect(() => {
        if (params.initialSection && layoutsReady) {
            const section = params.initialSection.toLowerCase();
            const yOffset = sectionLayouts.current[section];

            if (yOffset !== undefined) {
                // Small delay to ensure modal is fully rendered
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
                }, 300);
            }
        }
    }, [params.initialSection, layoutsReady]);

    const handleLayout = (section: string, y: number) => {
        sectionLayouts.current[section.toLowerCase()] = y;

        // We consider layouts ready if we have the target one, or just wait a bit
        if (Object.keys(sectionLayouts.current).length >= 4 || (params.initialSection && sectionLayouts.current[params.initialSection.toLowerCase()] !== undefined)) {
            setLayoutsReady(true);
        }
    };

    return (
        <View style={styles.screenWrapper}>
            <BlurView
                intensity={30}
                tint="dark"
                style={StyleSheet.absoluteFill}
            />
            <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
            <Animated.View
                style={[
                    styles.container,
                    { transform: [{ translateY }] }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft color="#333" size={24} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Birding Tips</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Diet Section */}
                    {(() => {
                        let tags = [...(bird.diet_tags || [])];
                        if (tags.length === 0 && bird.diet) {
                            tags = [bird.diet];
                        }

                        if (tags.length > 1) {
                            const hasSpecifics = tags.some(t => !['omnivore', 'generalist', 'mixed'].includes(t.toLowerCase()));
                            if (hasSpecifics) {
                                tags = tags.filter(t => !['omnivore', 'generalist', 'mixed'].includes(t.toLowerCase()));
                            }
                        }

                        return renderAssetGrid('Diet', tags, DIET_ASSETS, (e) => handleLayout('diet', e.nativeEvent.layout.y));
                    })()}

                    {/* Feeder Section */}
                    {renderAssetGrid('Feeder', bird.feeder_info?.feeder_types || [], FEEDER_ASSETS, (e) => handleLayout('feeder', e.nativeEvent.layout.y))}

                    {/* Backyard Birding Tips Card */}
                    <View style={styles.tipCard}>
                        <Text style={styles.tipCardTitle}>Backyard Birding Tips</Text>
                        <Text style={styles.tipCardText}>
                            {bird.behavior || `Offer preferred foods in appropriate feeders to entice ${bird.name}. Provide a water source for drinking and bathing to create a conducive habitat.`}
                        </Text>
                    </View>

                    {/* Habitat Section */}
                    <View style={styles.section} onLayout={(e) => handleLayout('habitat', e.nativeEvent.layout.y)}>
                        <Text style={styles.sectionTitle}>Habitat</Text>
                        <View style={styles.habitatIconContainer}>
                            <Image source={getHabitatIcon(bird)} style={styles.habitatLargeIcon} />
                            <Text style={styles.habitatName}>{bird.habitat_tags?.[0] || bird.habitat || 'N/A'}</Text>
                        </View>
                        <Text style={styles.habitatDescription}>
                            {bird.taxonomy?.genus_description || bird.description}
                        </Text>
                    </View>

                    {/* Finding Tips Card */}
                    <View style={styles.tipCard}>
                        <Text style={styles.tipCardTitle}>Finding Tips</Text>
                        <Text style={styles.tipCardText}>
                            {`Spot ${bird.name} in their preferred habitats. Listen for distinct calls and look for movement in the foliage. They are best observed during early morning or late afternoon when they are most active. Recognize their flight by the flash of colors.`}
                        </Text>
                    </View>

                    {/* Nesting Section */}
                    <View style={styles.section} onLayout={(e) => handleLayout('nesting', e.nativeEvent.layout.y)}>
                        <Text style={styles.sectionTitle}>Nesting</Text>
                        <View style={styles.habitatIconContainer}>
                            <Image source={getNestingIcon(bird)} style={styles.habitatLargeIcon} />
                            <Text style={styles.habitatName}>{bird.nesting_info?.location || bird.habitat || 'N/A'}</Text>
                        </View>
                        <Text style={styles.habitatDescription}>
                            {bird.nesting_info?.description || `${bird.name}'s nests are often located in protected locations, surrounded by dense foliage. Common trees and shrubs are used to provide shelter and security.`}
                        </Text>
                    </View>


                    {/* Fun Facts Section */}
                    <View style={[styles.section, { marginBottom: 60 }]}>
                        <Text style={styles.sectionTitle}>Fun Facts</Text>
                        <View style={styles.funFactCard}>
                            <View style={styles.funFactIconWrapper}>
                                <Lightbulb size={24} color="#FF6B35" fill="#FF6B35" strokeWidth={3} />
                            </View>
                            <Text style={styles.funFactTitleText}>{bird.behavior}</Text>
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 100,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 25,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.4,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 0,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 16,
        paddingHorizontal: 16,
        letterSpacing: -0.5,
    },
    horizontalGrid: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    gridItem: {
        width: (width - 48) / 3,
        marginRight: 8,
        alignItems: 'center',
    },
    assetWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F7F9FC',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    assetImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderAsset: {
        backgroundColor: '#edf2f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 24,
        color: '#a0aec0',
        fontWeight: '700',
    },
    assetLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        lineHeight: 18,
        textAlign: 'center',
        width: '100%',
        marginTop: 8,
        letterSpacing: -0.2,
    },
    tipCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginHorizontal: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#F1F3F5',
    },
    tipCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    tipCardText: {
        fontSize: 16,
        color: '#4A4A4A',
        lineHeight: 24,
    },
    habitatIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    habitatLargeIcon: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 8,
    },
    habitatName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    habitatDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4A4A4A',
        marginTop: 8,
        paddingHorizontal: 16,
        textAlign: 'center',
    },
    funFactCard: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        marginHorizontal: 16,
    },
    funFactIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF2EE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    funFactTitleText: {
        flex: 1,
        fontSize: 17.5,
        color: '#333',
        lineHeight: 25,
    },
    funFactFullText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#4A4A4A',
        paddingHorizontal: 16,
    },
});
