import { ResultActionBottomSheet } from '@/components/shared/ResultActionBottomSheet';
import { DIET_ASSETS, FEEDER_ASSETS } from '@/constants/bird-assets';
import { BirdResult } from '@/types/scanner';
import { getHabitatIcon, getNestingIcon } from '@/utils/bird-profile-helpers';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Lightbulb, MoreHorizontal } from 'lucide-react-native';
import React from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CARD_TOP = Math.max(height * 0.12, 80);

export default function BirdingTipsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ birdData: string; initialSection?: string }>();
    const scrollViewRef = React.useRef<ScrollView>(null);
    const sectionLayouts = React.useRef<Record<string, number>>({});
    const [layoutsReady, setLayoutsReady] = React.useState(false);
    const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState<string | null>(null);

    const bird = React.useMemo(() => {
        try {
            return params.birdData ? JSON.parse(params.birdData as string) as BirdResult : null;
        } catch (e) {
            console.error('Failed to parse bird data', e);
            return null;
        }
    }, [params.birdData]);

    const dismissScreen = React.useCallback(() => {
        router.back();
    }, []);

    // Animated drag-to-dismiss
    const dragY = React.useRef(new Animated.Value(0)).current;
    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) dragY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 120) {
                    Animated.timing(dragY, { toValue: height, duration: 200, useNativeDriver: true }).start(() => {
                        router.back();
                    });
                } else {
                    Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
                }
            },
        })
    ).current;

    if (!bird) {
        return (
            <View style={styles.screenWrapper}>
                <Text>Bird data not found</Text>
            </View>
        );
    }

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
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <TouchableOpacity onPress={() => {
                        setActiveSection(`${title} Tips`);
                        setActionSheetVisible(true);
                    }} style={styles.moreBtn}>
                        <MoreHorizontal size={20} color="#999" />
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                    {resolvedItems.map((item, index) => (
                        <View key={index} style={styles.gridItem}>
                            <View style={styles.assetWrapper}>
                                {item.asset ? (
                                    <Image source={item.asset} style={styles.assetImage} contentFit="cover" />
                                ) : (
                                    <View style={[styles.assetImagePlaceholder, styles.placeholderAsset]}>
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
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
                }, 300);
            }
        }
    }, [params.initialSection, layoutsReady]);

    const handleLayout = (section: string, y: number) => {
        sectionLayouts.current[section.toLowerCase()] = y;

        if (Object.keys(sectionLayouts.current).length >= 4 || (params.initialSection && sectionLayouts.current[params.initialSection.toLowerCase()] !== undefined)) {
            setLayoutsReady(true);
        }
    };

    return (
        <View style={styles.screenWrapper}>
            {/* Dark backdrop area — tap to dismiss */}
            <Pressable style={styles.backdrop} onPress={dismissScreen} />

            {/* Bottom sheet card — animated for drag dismiss */}
            <Animated.View style={[styles.card, { transform: [{ translateY: dragY }] }]}>
                {/* Drag handle — swipe down to close */}
                <View {...panResponder.panHandlers} style={styles.handleBarTouchArea}>
                    <View style={styles.handleBar} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={dismissScreen} style={styles.backBtn} hitSlop={12}>
                        <ChevronLeft color="#333" size={24} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Birding Tips</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.headerDivider} />

                {/* Main scrollable content */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    bounces={true}
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
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Habitat</Text>
                            <TouchableOpacity onPress={() => {
                                setActiveSection('Habitat Tips');
                                setActionSheetVisible(true);
                            }} style={styles.moreBtn}>
                                <MoreHorizontal size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.habitatIconContainer}>
                            <Image source={getHabitatIcon(bird)} style={styles.habitatLargeIcon} contentFit="contain" />
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
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Nesting</Text>
                            <TouchableOpacity onPress={() => {
                                setActiveSection('Nesting Tips');
                                setActionSheetVisible(true);
                            }} style={styles.moreBtn}>
                                <MoreHorizontal size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.habitatIconContainer}>
                            <Image source={getNestingIcon(bird)} style={styles.habitatLargeIcon} contentFit="contain" />
                            <Text style={styles.habitatName}>{bird.nesting_info?.location || bird.habitat || 'N/A'}</Text>
                        </View>
                        <Text style={styles.habitatDescription}>
                            {bird.nesting_info?.description || `${bird.name}'s nests are often located in protected locations, surrounded by dense foliage. Common trees and shrubs are used to provide shelter and security.`}
                        </Text>
                    </View>

                    {/* Fun Facts Section */}
                    <View style={[styles.section, { marginBottom: 60 }]}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Fun Facts</Text>
                            <TouchableOpacity onPress={() => {
                                setActiveSection('Fun Facts');
                                setActionSheetVisible(true);
                            }} style={styles.moreBtn}>
                                <MoreHorizontal size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.funFactCard}>
                            <View style={styles.funFactIconWrapper}>
                                <Lightbulb size={24} color="#FF6B35" fill="#FF6B35" strokeWidth={3} />
                            </View>
                            <Text style={styles.funFactTitleText}>{bird.behavior}</Text>
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>

            <ResultActionBottomSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                bird={bird}
                sectionContext={activeSection || 'Birding Tips'}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backdrop: {
        height: CARD_TOP,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#DCDCDC',
    },
    handleBarTouchArea: {
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 40,
        marginTop: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
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
    scrollContent: {
        paddingBottom: 80,
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
        flex: 1,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    moreBtn: {
        paddingRight: 16,
        paddingBottom: 4,
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
    },
    assetImagePlaceholder: {
        width: '100%',
        height: '100%',
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
});
