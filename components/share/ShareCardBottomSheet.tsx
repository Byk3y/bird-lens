import { useShareCard } from '@/hooks/useShareCard';
import { BirdResult } from '@/types/scanner';
import { AnimatePresence, MotiView } from 'moti';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import ViewShot from 'react-native-view-shot';
import { FieldGuideCard } from './FieldGuideCard';
import { MagazineCard, ShareCardData } from './MagazineCard';
import { MinimalCard } from './MinimalCard';
import { WildCard } from './WildCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_SCALE = (SCREEN_WIDTH * 0.64) / 1080;
const PREVIEW_SIZE = 1080 * PREVIEW_SCALE;
const GAP = 16;
const PADDING = (SCREEN_WIDTH - PREVIEW_SIZE) / 2;
const SNAP_INTERVAL = PREVIEW_SIZE + GAP;

type TemplateType = 'magazine' | 'wild' | 'fieldguide' | 'minimal';

interface ShareCardBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    bird: BirdResult;
    imageUrl?: string;
    locationName?: string;
}

const TEMPLATES: { key: TemplateType; label: string }[] = [
    { key: 'wild', label: 'Wild' },
    { key: 'magazine', label: 'Magazine' },
    { key: 'fieldguide', label: 'Field Guide' },
    { key: 'minimal', label: 'Minimal' },
];

export const ShareCardBottomSheet: React.FC<ShareCardBottomSheetProps> = ({
    visible,
    onClose,
    bird,
    imageUrl,
    locationName,
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('wild');
    const scrollRef = useRef<ScrollView>(null);
    const { viewShotRef, isCapturing, saveToPhotos, shareCard } = useShareCard();

    const cardData: ShareCardData = {
        name: bird.name,
        scientificName: bird.scientific_name,
        familyName: bird.taxonomy?.family || 'Unknown',
        orderName: bird.taxonomy?.order,
        confidence: bird.confidence ?? 0.99,
        dateIdentified: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        locationName: locationName,
        imageUrl: imageUrl,
    };

    // Drag-to-dismiss — responsive, real-time tracking on header area
    const dragY = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            dragY.stopAnimation();
            dragY.setValue(0);
        }
    }, [visible]);

    // Backdrop opacity fades as user drags down
    const backdropOpacity = dragY.interpolate({
        inputRange: [0, SCREEN_HEIGHT * 0.4],
        outputRange: [1, 0.2],
        extrapolate: 'clamp',
    });

    // Header drag zone — captures gestures immediately
    const headerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 2 && Math.abs(g.dy) > Math.abs(g.dx),
            onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 2 && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderGrant: () => { },
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) {
                    dragY.setValue(g.dy);
                }
            },
            onPanResponderRelease: (_, g) => {
                const shouldDismiss = g.dy > 80 || (g.dy > 20 && g.vy > 0.5);
                if (shouldDismiss) {
                    // Let MotiView exit animation handle the slide-down
                    onClose();
                } else {
                    Animated.spring(dragY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 120,
                        friction: 10,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(dragY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 120,
                    friction: 10,
                }).start();
            },
        })
    ).current;

    const renderCardTemplate = (template: TemplateType, scale: number = 1) => {
        const containerStyle = scale < 1
            ? { transform: [{ scale }], width: 1080, height: 1080 }
            : { width: 1080, height: 1080 };

        return (
            <View style={containerStyle}>
                {template === 'magazine' && <MagazineCard data={cardData} />}
                {template === 'wild' && <WildCard data={cardData} />}
                {template === 'fieldguide' && <FieldGuideCard data={cardData} />}
                {template === 'minimal' && <MinimalCard data={cardData} />}
            </View>
        );
    };

    return (
        <AnimatePresence>
            {visible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
                    {/* Backdrop — fades as you drag */}
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                        style={StyleSheet.absoluteFill}
                    >
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
                            <Pressable
                                style={styles.backdrop}
                                onPress={onClose}
                            />
                        </Animated.View>
                    </MotiView>

                    <MotiView
                        from={{ translateY: SCREEN_HEIGHT }}
                        animate={{ translateY: 0 }}
                        exit={{ translateY: SCREEN_HEIGHT }}
                        transition={{ type: 'timing', duration: 350 }}
                        style={styles.sheetContainer}
                    >
                        <Animated.View style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
                            {/* Draggable header zone — handle + title */}
                            <View {...headerPanResponder.panHandlers}>
                                <View style={styles.handleRow}>
                                    <View style={styles.handle} />
                                </View>
                                <Text style={styles.title}>Share your sighting</Text>
                            </View>

                            {/* Template Previews */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.previewScroll,
                                    { paddingHorizontal: PADDING }
                                ]}
                                snapToInterval={SNAP_INTERVAL}
                                snapToAlignment="start"
                                decelerationRate="fast"
                                scrollEventThrottle={16}
                                onScroll={(event) => {
                                    const offsetX = event.nativeEvent.contentOffset.x;
                                    const index = Math.round(offsetX / SNAP_INTERVAL);
                                    if (TEMPLATES[index] && selectedTemplate !== TEMPLATES[index].key) {
                                        setSelectedTemplate(TEMPLATES[index].key);
                                    }
                                }}
                                ref={scrollRef}
                            >
                                {TEMPLATES.map((tmpl, index) => (
                                    <TouchableOpacity
                                        key={tmpl.key}
                                        onPress={() => {
                                            setSelectedTemplate(tmpl.key);
                                            scrollRef.current?.scrollTo({ x: index * SNAP_INTERVAL, animated: true });
                                        }}
                                        activeOpacity={0.9}
                                        style={{ width: PREVIEW_SIZE }}
                                    >
                                        <MotiView
                                            animate={{
                                                scale: 1,
                                                opacity: 1,
                                            }}
                                            transition={{ type: 'timing', duration: 200 }}
                                            style={[
                                                styles.previewCard,
                                                selectedTemplate === tmpl.key && styles.previewCardSelected,
                                            ]}
                                        >
                                            <View style={styles.previewInner}>
                                                {renderCardTemplate(tmpl.key, PREVIEW_SCALE)}
                                            </View>
                                        </MotiView>
                                        <Text
                                            style={[
                                                styles.templateLabel,
                                                selectedTemplate === tmpl.key && styles.templateLabelSelected,
                                            ]}
                                        >
                                            {tmpl.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Action Buttons */}
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={saveToPhotos}
                                    disabled={isCapturing}
                                >
                                    {isCapturing ? (
                                        <ActivityIndicator size="small" color="#F97316" />
                                    ) : (
                                        <Text style={styles.secondaryBtnText}>Save to Photos</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={shareCard}
                                    disabled={isCapturing}
                                >
                                    {isCapturing ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.primaryBtnText}>Share</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </MotiView>

                    {/* Off-screen full-size card for capture */}
                    <View style={styles.offscreen} pointerEvents="none">
                        <ViewShot
                            ref={viewShotRef}
                            options={{
                                format: 'png',
                                quality: 1,
                                width: 1080,
                                height: 1080,
                            }}
                        >
                            {renderCardTemplate(selectedTemplate, 1)}
                        </ViewShot>
                    </View>
                </View>
            )}
        </AnimatePresence>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 44,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1a1a1a',
        paddingHorizontal: 24,
        marginBottom: 16,
        letterSpacing: -0.3,
    },
    previewScroll: {
        paddingBottom: 8,
        flexDirection: 'row',
        gap: 16,
    },
    previewCard: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#EFEFEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    previewCardSelected: {
        borderColor: '#F97316',
        borderWidth: 2,
    },
    previewInner: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    templateLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    templateLabelSelected: {
        color: '#F97316',
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#F97316',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F97316',
    },
    primaryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F97316',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    offscreen: {
        position: 'absolute',
        left: -9999,
        top: -9999,
        opacity: 0,
    },
});
