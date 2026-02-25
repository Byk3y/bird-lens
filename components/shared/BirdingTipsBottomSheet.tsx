import { ResultActionBottomSheet } from '@/components/shared/ResultActionBottomSheet';
import { DIET_ASSETS, FEEDER_ASSETS } from '@/constants/bird-assets';
import { BirdResult } from '@/types/scanner';
import { getHabitatIcon, getNestingIcon } from '@/utils/bird-profile-helpers';
import { Image } from 'expo-image';
import { ChevronLeft, Lightbulb, MoreHorizontal } from 'lucide-react-native';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_TOP = Math.max(SCREEN_HEIGHT * 0.12, 80);

interface BirdingTipsBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    bird: BirdResult;
    initialSection?: string;
}

export const BirdingTipsBottomSheet: React.FC<BirdingTipsBottomSheetProps> = ({
    visible,
    onClose,
    bird,
    initialSection,
}) => {
    const scrollViewRef = React.useRef<ScrollView>(null);
    const sectionLayouts = React.useRef<Record<string, number>>({});
    const [layoutsReady, setLayoutsReady] = React.useState(false);
    const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState<string | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
    const isAtTop = React.useRef(true);

    // Reset state when closing
    React.useEffect(() => {
        if (!visible) {
            setIsAnimatingOut(true);
            setTimeout(() => {
                setLayoutsReady(false);
                sectionLayouts.current = {};
                setActionSheetVisible(false);
                setActiveSection(null);
                setIsAnimatingOut(false);
            }, 350);
        }
    }, [visible]);

    // Auto-scroll to initial section
    React.useEffect(() => {
        if (visible && initialSection && layoutsReady) {
            const section = initialSection.toLowerCase();
            const yOffset = sectionLayouts.current[section];
            if (yOffset !== undefined) {
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
                }, 400);
            }
        }
    }, [visible, initialSection, layoutsReady]);

    // Drag-to-dismiss
    const dragY = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            dragY.setValue(0);
        }
    }, [visible]);

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => isAtTop.current && g.dy > 8,
            onMoveShouldSetPanResponderCapture: (_, g) => isAtTop.current && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) dragY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 80) {
                    Animated.timing(dragY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                    });
                } else {
                    Animated.spring(dragY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 10,
                    }).start();
                }
            },
        })
    ).current;

    // Dismiss when user overscrolls down from top
    const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, velocity } = e.nativeEvent;
        if (contentOffset.y <= 0 && velocity && velocity.y < -0.5) {
            onClose();
        }
    };

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        isAtTop.current = e.nativeEvent.contentOffset.y <= 0;
    };

    const handleLayout = (section: string, y: number) => {
        sectionLayouts.current[section.toLowerCase()] = y;
        if (
            Object.keys(sectionLayouts.current).length >= 4 ||
            (initialSection &&
                sectionLayouts.current[initialSection.toLowerCase()] !== undefined)
        ) {
            setLayoutsReady(true);
        }
    };

    const renderAssetGrid = (
        title: string,
        tags: string[],
        assetMap: Record<string, any>,
        onLayout?: (event: any) => void
    ) => {
        if (!tags || tags.length === 0) return null;

        const filteredTags = tags.filter((t) => {
            const low = t?.toLowerCase();
            return low && !['none', 'n/a', 'nil', 'unknown', 'none.'].includes(low);
        });

        if (filteredTags.length === 0) return null;

        const resolvedItems = filteredTags.reduce(
            (acc: { tag: string; asset: any }[], tag) => {
                const normalizedTag = tag.toLowerCase().trim();
                let asset = assetMap[normalizedTag];

                if (!asset) {
                    const sortedKeys = Object.keys(assetMap).sort(
                        (a, b) => b.length - a.length
                    );
                    const key = sortedKeys.find(
                        (k) => normalizedTag.includes(k) || k.includes(normalizedTag)
                    );
                    if (key) asset = assetMap[key];
                }

                if (!asset || !acc.some((item) => item.asset === asset)) {
                    acc.push({ tag, asset });
                }
                return acc;
            },
            []
        );

        return (
            <View style={styles.section} onLayout={onLayout}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setActiveSection(`${title} Tips`);
                            setActionSheetVisible(true);
                        }}
                        style={styles.moreBtn}
                    >
                        <MoreHorizontal size={20} color="#999" />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalGrid}
                >
                    {resolvedItems.map((item, index) => (
                        <View key={index} style={styles.gridItem}>
                            <View style={styles.assetWrapper}>
                                {item.asset ? (
                                    <Image
                                        source={item.asset}
                                        style={styles.assetImage}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View
                                        style={[
                                            styles.assetImagePlaceholder,
                                            styles.placeholderAsset,
                                        ]}
                                    >
                                        <Text style={styles.placeholderText}>
                                            {item.tag.substring(0, 1).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.assetLabel} numberOfLines={2}>
                                {item.tag}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    // Prepare diet tags
    const getDietTags = () => {
        let tags = [...(bird.diet_tags || [])];
        if (tags.length === 0 && bird.diet) {
            tags = [bird.diet];
        }
        if (tags.length > 1) {
            const hasSpecifics = tags.some(
                (t) =>
                    !['omnivore', 'generalist', 'mixed'].includes(t.toLowerCase())
            );
            if (hasSpecifics) {
                tags = tags.filter(
                    (t) =>
                        !['omnivore', 'generalist', 'mixed'].includes(t.toLowerCase())
                );
            }
        }
        return tags;
    };

    return (
        <Modal
            visible={visible || isAnimatingOut}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <AnimatePresence>
                {visible && (
                    <View style={StyleSheet.absoluteFill}>
                        {/* Dark overlay backdrop */}
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <Pressable style={styles.backdrop} onPress={onClose} />
                        </MotiView>

                        {/* Bottom sheet card */}
                        <MotiView
                            from={{ translateY: SCREEN_HEIGHT }}
                            animate={{ translateY: 0 }}
                            exit={{ translateY: SCREEN_HEIGHT }}
                            transition={{ type: 'timing', duration: 350 }}
                            style={styles.sheetPositioner}
                            pointerEvents="box-none"
                        >
                            <Animated.View
                                {...panResponder.panHandlers}
                                style={[styles.card, { transform: [{ translateY: dragY }] }]}
                            >
                                {/* Drag handle */}
                                <View
                                    style={styles.handleBarTouchArea}
                                >
                                    <View style={styles.handleBar} />
                                </View>

                                {/* Header */}
                                <View style={styles.header}>
                                    <Pressable
                                        onPress={onClose}
                                        style={styles.backBtn}
                                        hitSlop={12}
                                    >
                                        <ChevronLeft color="#333" size={24} strokeWidth={2.5} />
                                    </Pressable>
                                    <Text style={styles.headerTitle}>Birding Tips</Text>
                                    <View style={{ width: 44 }} />
                                </View>
                                <View style={styles.headerDivider} />

                                {/* Scrollable content */}
                                <ScrollView
                                    ref={scrollViewRef}
                                    style={styles.scrollView}
                                    contentContainerStyle={styles.scrollContent}
                                    showsVerticalScrollIndicator={false}
                                    scrollEventThrottle={16}
                                    bounces={false}
                                    onScrollEndDrag={handleScrollEndDrag}
                                    onScroll={handleScroll}
                                >
                                    {/* Diet Section */}
                                    {renderAssetGrid('Diet', getDietTags(), DIET_ASSETS, (e) =>
                                        handleLayout('diet', e.nativeEvent.layout.y)
                                    )}

                                    {/* Feeder Section */}
                                    {renderAssetGrid(
                                        'Feeder',
                                        bird.feeder_info?.feeder_types || [],
                                        FEEDER_ASSETS,
                                        (e) => handleLayout('feeder', e.nativeEvent.layout.y)
                                    )}

                                    {/* Backyard Birding Tips Card */}
                                    <View style={styles.tipCard}>
                                        <Text style={styles.tipCardTitle}>
                                            Backyard Birding Tips
                                        </Text>
                                        <Text style={styles.tipCardText}>
                                            {bird.behavior ||
                                                `Offer preferred foods in appropriate feeders to entice ${bird.name}. Provide a water source for drinking and bathing to create a conducive habitat.`}
                                        </Text>
                                    </View>

                                    {/* Habitat Section */}
                                    <View
                                        style={styles.section}
                                        onLayout={(e) =>
                                            handleLayout('habitat', e.nativeEvent.layout.y)
                                        }
                                    >
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.sectionTitle}>Habitat</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setActiveSection('Habitat Tips');
                                                    setActionSheetVisible(true);
                                                }}
                                                style={styles.moreBtn}
                                            >
                                                <MoreHorizontal size={20} color="#999" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.habitatIconContainer}>
                                            <Image
                                                source={getHabitatIcon(bird)}
                                                style={styles.habitatLargeIcon}
                                                contentFit="contain"
                                            />
                                            <Text style={styles.habitatName}>
                                                {bird.habitat_tags?.[0] || bird.habitat || 'N/A'}
                                            </Text>
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
                                    <View
                                        style={styles.section}
                                        onLayout={(e) =>
                                            handleLayout('nesting', e.nativeEvent.layout.y)
                                        }
                                    >
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.sectionTitle}>Nesting</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setActiveSection('Nesting Tips');
                                                    setActionSheetVisible(true);
                                                }}
                                                style={styles.moreBtn}
                                            >
                                                <MoreHorizontal size={20} color="#999" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.habitatIconContainer}>
                                            <Image
                                                source={getNestingIcon(bird)}
                                                style={styles.habitatLargeIcon}
                                                contentFit="contain"
                                            />
                                            <Text style={styles.habitatName}>
                                                {bird.nesting_info?.location ||
                                                    bird.habitat ||
                                                    'N/A'}
                                            </Text>
                                        </View>
                                        <Text style={styles.habitatDescription}>
                                            {bird.nesting_info?.description ||
                                                `${bird.name}'s nests are often located in protected locations, surrounded by dense foliage. Common trees and shrubs are used to provide shelter and security.`}
                                        </Text>
                                    </View>

                                    {/* Fun Facts Section */}
                                    <View style={[styles.section, { marginBottom: 60 }]}>
                                        <View style={styles.sectionHeaderRow}>
                                            <Text style={styles.sectionTitle}>Fun Facts</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setActiveSection('Fun Facts');
                                                    setActionSheetVisible(true);
                                                }}
                                                style={styles.moreBtn}
                                            >
                                                <MoreHorizontal size={20} color="#999" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.funFactCard}>
                                            <View style={styles.funFactIconWrapper}>
                                                <Lightbulb
                                                    size={24}
                                                    color="#FF6B35"
                                                    fill="#FF6B35"
                                                    strokeWidth={3}
                                                />
                                            </View>
                                            <Text style={styles.funFactTitleText}>
                                                {bird.behavior}
                                            </Text>
                                        </View>
                                    </View>
                                </ScrollView>
                            </Animated.View>
                        </MotiView>

                        <ResultActionBottomSheet
                            visible={actionSheetVisible}
                            onClose={() => setActionSheetVisible(false)}
                            bird={bird}
                            sectionContext={activeSection || 'Birding Tips'}
                        />
                    </View>
                )}
            </AnimatePresence>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetPositioner: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingTop: CARD_TOP,
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
        paddingBottom: 4,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    backBtn: {
        width: 44,
        height: 36,
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
