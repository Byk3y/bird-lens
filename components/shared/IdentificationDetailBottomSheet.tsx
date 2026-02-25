import { ResultActionBottomSheet } from '@/components/shared/ResultActionBottomSheet';
import { IdentificationComparison } from '@/components/shared/profile/IdentificationComparison';
import { BirdResult } from '@/types/scanner';
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
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_TOP = Math.max(SCREEN_HEIGHT * 0.12, 80);

interface IdentificationDetailBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    bird: BirdResult;
}

export const IdentificationDetailBottomSheet: React.FC<IdentificationDetailBottomSheetProps> = ({
    visible,
    onClose,
    bird,
}) => {
    const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState<string | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
    const isAtTop = React.useRef(true);

    // Reset state when closing
    React.useEffect(() => {
        if (!visible) {
            setIsAnimatingOut(true);
            setTimeout(() => {
                setActionSheetVisible(false);
                setActiveSection(null);
                setIsAnimatingOut(false);
            }, 350);
        }
    }, [visible]);

    // Drag-to-dismiss — responsive, real-time tracking on header area
    const dragY = React.useRef(new Animated.Value(0)).current;

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

    // Header drag zone — captures gestures immediately with very low threshold
    const headerPanResponder = React.useRef(
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

    // ScrollView overscroll dismiss (for content area)
    const scrollPanResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => isAtTop.current && g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
            onMoveShouldSetPanResponderCapture: (_, g) => isAtTop.current && g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
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
                        {/* Dark overlay backdrop — fades as you drag */}
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
                                <Pressable style={styles.backdrop} onPress={onClose} />
                            </Animated.View>
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
                                style={[styles.card, { transform: [{ translateY: dragY }] }]}
                            >
                                {/* Draggable header zone — entire area responds to drag */}
                                <View {...headerPanResponder.panHandlers}>
                                    {/* Drag handle */}
                                    <View style={styles.handleBarTouchArea}>
                                        <View style={styles.handleBar} />
                                    </View>

                                    {/* Header */}
                                    <View style={styles.header}>
                                        <View style={{ width: 44 }} />
                                        <Text style={styles.headerTitle}>How to identify it?</Text>
                                        <Pressable
                                            onPress={onClose}
                                            style={styles.closeBtn}
                                            hitSlop={12}
                                        >
                                            <Text style={styles.closeBtnText}>Done</Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.headerDivider} />
                                </View>

                                {/* Scrollable content — also supports drag-dismiss when at top */}
                                <View style={{ flex: 1 }} {...scrollPanResponder.panHandlers}>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        style={styles.scrollView}
                                        contentContainerStyle={styles.scrollContent}
                                        bounces={false}
                                        scrollEventThrottle={16}
                                        onScrollEndDrag={handleScrollEndDrag}
                                        onScroll={handleScroll}
                                    >
                                        <IdentificationComparison
                                            bird={bird}
                                            variant="full"
                                            onMorePress={(section) => {
                                                setActiveSection(section);
                                                setActionSheetVisible(true);
                                            }}
                                        />
                                        <View style={{ height: 40 }} />
                                    </ScrollView>
                                </View>
                            </Animated.View>
                        </MotiView>

                        <ResultActionBottomSheet
                            visible={actionSheetVisible}
                            onClose={() => setActionSheetVisible(false)}
                            bird={bird}
                            sectionContext={activeSection || 'Identification Detail'}
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
        paddingHorizontal: 13,
        paddingBottom: 8,
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    closeBtn: {
        width: 44,
        height: 36,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    closeBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 13,
        paddingTop: 0,
    },
});
