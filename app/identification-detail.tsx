import { ResultActionBottomSheet } from '@/components/shared/ResultActionBottomSheet';
import { IdentificationComparison } from '@/components/shared/profile/IdentificationComparison';
import { BirdResult } from '@/types/scanner';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const { height } = Dimensions.get('window');
const CARD_TOP = Math.max(height * 0.12, 80);

export default function IdentificationDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ birdData: string }>();
    const bird = React.useMemo(() => JSON.parse(params.birdData as string) as BirdResult, [params.birdData]);

    const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState<string | null>(null);

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
                    <View style={{ width: 44 }} />
                    <Text style={styles.headerTitle}>How to identify it?</Text>
                    <Pressable onPress={dismissScreen} style={styles.closeBtn} hitSlop={12}>
                        <Text style={styles.closeBtnText}>Done</Text>
                    </Pressable>
                </View>
                <View style={styles.headerDivider} />

                {/* Scrollable content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    bounces={true}
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
            </Animated.View>

            <ResultActionBottomSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                bird={bird}
                sectionContext={activeSection || 'Identification Detail'}
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
