import { Colors, Typography } from '@/constants/theme';
import { Check, HelpCircle, Image as ImageIcon, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoFramingViewProps {
    imageUri: string;
    onCancel: () => void;
    onConfirm: (cropResult: { originX: number; originY: number; width: number; height: number; scale: number; baseImageWidth: number; baseImageHeight: number }) => void;
    onRepick: () => void;
    onShowTips: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HANDLE_SIZE = 30;
const MIN_CROP_SIZE = 100;

export const PhotoFramingView: React.FC<PhotoFramingViewProps> = ({
    imageUri,
    onCancel,
    onConfirm,
    onRepick,
    onShowTips
}) => {
    const insets = useSafeAreaInsets();
    // Image Layout State (Actual displayed size)
    const [imageLayout, setImageLayout] = useState<{ width: number; height: number; scale: number; offsetX: number; offsetY: number } | null>(null);
    const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);

    // Crop State (in displayed pixels)
    const cropX = useSharedValue(0);
    const cropY = useSharedValue(0);
    const cropWidth = useSharedValue(200);
    const cropHeight = useSharedValue(200);

    // Saved values for gestures
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startWidth = useSharedValue(0);
    const startHeight = useSharedValue(0);

    // Image Transform State
    const imgScale = useSharedValue(1);
    const imgTransX = useSharedValue(0);
    const imgTransY = useSharedValue(0);

    const savedImgScale = useSharedValue(1);
    const savedImgTransX = useSharedValue(0);
    const savedImgTransY = useSharedValue(0);

    // Initial Image Load and Sizing
    useEffect(() => {
        Image.getSize(imageUri, (w, h) => {
            setOriginalImageSize({ width: w, height: h });

            // Calculate "Contain" dimensions (Fit screen)
            const screenAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
            const imageAspectRatio = w / h;

            let displayWidth, displayHeight, scale;

            // We use Math.min to ensure it fits within BOTH dimensions
            const scaleW = SCREEN_WIDTH / w;
            const scaleH = SCREEN_HEIGHT / h;

            scale = Math.min(scaleW, scaleH);
            displayWidth = w * scale;
            displayHeight = h * scale;

            const offsetX = (SCREEN_WIDTH - displayWidth) / 2;
            const offsetY = (SCREEN_HEIGHT - displayHeight) / 2;

            setImageLayout({ width: displayWidth, height: displayHeight, scale, offsetX, offsetY });

            // Initialize Crop Box:
            // Default to 80% of the smaller dimension of the visible image
            const initialSize = Math.min(displayWidth, displayHeight) * 0.8;
            cropWidth.value = initialSize;
            cropHeight.value = initialSize;

            // Center crop box on screen (matches image center since image is centered)
            cropX.value = (SCREEN_WIDTH - initialSize) / 2;
            cropY.value = (SCREEN_HEIGHT - initialSize) / 2;
        });
    }, [imageUri]);

    // 4. Helper function as a worklet
    const clamp = (val: number, min: number, max: number) => {
        'worklet';
        return Math.min(Math.max(val, min), max);
    };

    // --- Gestures ---

    // 1. Global Pinch (Zoom) - To be attached to the container
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            'worklet';
            savedImgScale.value = imgScale.value;
        })
        .onUpdate((e) => {
            'worklet';
            imgScale.value = Math.max(0.5, savedImgScale.value * e.scale);
        });

    // 2. Image Pan (Background)
    const imagePanGesture = Gesture.Pan()
        .onStart(() => {
            savedImgTransX.value = imgTransX.value;
            savedImgTransY.value = imgTransY.value;
        })
        .onUpdate((e) => {
            imgTransX.value = savedImgTransX.value + e.translationX;
            imgTransY.value = savedImgTransY.value + e.translationY;
        })
        .simultaneousWithExternalGesture(pinchGesture);

    // 3. Crop Box Move (Foreground)
    const moveGesture = Gesture.Pan()
        .maxPointers(1)
        .onStart(() => {
            startX.value = cropX.value;
            startY.value = cropY.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const maxX = SCREEN_WIDTH - cropWidth.value;
            const maxY = SCREEN_HEIGHT - cropHeight.value;

            cropX.value = clamp(startX.value + e.translationX, 0, maxX);
            cropY.value = clamp(startY.value + e.translationY, 0, maxY);
        })
        .simultaneousWithExternalGesture(pinchGesture);


    // Corners - Resizing
    const resizeTL = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startX.value = cropX.value;
            startY.value = cropY.value;
            startWidth.value = cropWidth.value;
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const newX = clamp(startX.value + e.translationX, imageLayout.offsetX, startX.value + startWidth.value - MIN_CROP_SIZE);
            const newY = clamp(startY.value + e.translationY, imageLayout.offsetY, startY.value + startHeight.value - MIN_CROP_SIZE);

            cropWidth.value = startX.value + startWidth.value - newX;
            cropHeight.value = startY.value + startHeight.value - newY;
            cropX.value = newX;
            cropY.value = newY;
        }), [imageLayout, cropX, cropY, cropWidth, cropHeight, startX, startY]);

    const resizeTR = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startY.value = cropY.value;
            startWidth.value = cropWidth.value;
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const maxW = imageLayout.offsetX + imageLayout.width - cropX.value;
            const newW = clamp(startWidth.value + e.translationX, MIN_CROP_SIZE, maxW);
            const newY = clamp(startY.value + e.translationY, imageLayout.offsetY, startY.value + startHeight.value - MIN_CROP_SIZE);

            cropWidth.value = newW;
            cropHeight.value = startY.value + startHeight.value - newY;
            cropY.value = newY;
        }), [imageLayout, cropX, cropY, cropWidth, cropHeight, startX, startY]);

    const resizeBL = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startX.value = cropX.value;
            startWidth.value = cropWidth.value;
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const newX = clamp(startX.value + e.translationX, imageLayout.offsetX, startX.value + startWidth.value - MIN_CROP_SIZE);
            const maxH = imageLayout.offsetY + imageLayout.height - cropY.value;
            const newH = clamp(startHeight.value + e.translationY, MIN_CROP_SIZE, maxH);

            cropWidth.value = startX.value + startWidth.value - newX;
            cropHeight.value = newH;
            cropX.value = newX;
        }), [imageLayout, cropX, cropY, cropWidth, cropHeight, startX, startY]);

    const resizeBR = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startWidth.value = cropWidth.value;
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const maxW = imageLayout.offsetX + imageLayout.width - cropX.value;
            const maxH = imageLayout.offsetY + imageLayout.height - cropY.value;

            cropWidth.value = clamp(startWidth.value + e.translationX, MIN_CROP_SIZE, maxW);
            cropHeight.value = clamp(startHeight.value + e.translationY, MIN_CROP_SIZE, maxH);
        }), [imageLayout, cropX, cropY, cropWidth, cropHeight, startWidth, startHeight]);

    // Sides
    const resizeTop = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startY.value = cropY.value;
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const newY = clamp(startY.value + e.translationY, imageLayout.offsetY, startY.value + startHeight.value - MIN_CROP_SIZE);
            cropHeight.value = startY.value + startHeight.value - newY;
            cropY.value = newY;
        }), [imageLayout, cropY, cropHeight, startY, startHeight]);

    const resizeBottom = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startHeight.value = cropHeight.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const maxH = imageLayout.offsetY + imageLayout.height - cropY.value;
            cropHeight.value = clamp(startHeight.value + e.translationY, MIN_CROP_SIZE, maxH);
        }), [imageLayout, cropY, cropHeight, startHeight]);

    const resizeLeft = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startX.value = cropX.value;
            startWidth.value = cropWidth.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const newX = clamp(startX.value + e.translationX, imageLayout.offsetX, startX.value + startWidth.value - MIN_CROP_SIZE);
            cropWidth.value = startX.value + startWidth.value - newX;
            cropX.value = newX;
        }), [imageLayout, cropX, cropWidth, startX, startWidth]);

    const resizeRight = React.useMemo(() => Gesture.Pan()
        .onStart(() => {
            startWidth.value = cropWidth.value;
        })
        .onUpdate((e) => {
            if (!imageLayout) return;
            const maxW = imageLayout.offsetX + imageLayout.width - cropX.value;
            cropWidth.value = clamp(startWidth.value + e.translationX, MIN_CROP_SIZE, maxW);
        }), [imageLayout, cropX, cropWidth, startWidth]);


    const animatedStyles = useAnimatedStyle(() => ({
        transform: [
            { translateX: cropX.value },
            { translateY: cropY.value }
        ],
        width: cropWidth.value,
        height: cropHeight.value,
    }));

    const animatedImageStyles = useAnimatedStyle(() => ({
        transform: [
            { translateX: imgTransX.value },
            { translateY: imgTransY.value },
            { scale: imgScale.value }
        ]
    }));

    // Mask Styles
    const maskTopStyle = useAnimatedStyle(() => ({
        height: cropY.value,
        width: '100%',
        top: 0,
        left: 0,
    }));
    const maskBottomStyle = useAnimatedStyle(() => ({
        top: cropY.value + cropHeight.value,
        height: SCREEN_HEIGHT,
        width: '100%',
        left: 0,
    }));
    const maskLeftStyle = useAnimatedStyle(() => ({
        top: cropY.value,
        height: cropHeight.value,
        width: cropX.value,
        left: 0,
    }));
    const maskRightStyle = useAnimatedStyle(() => ({
        top: cropY.value,
        height: cropHeight.value,
        left: cropX.value + cropWidth.value,
        width: SCREEN_WIDTH,
    }));

    const handleConfirm = () => {
        if (!imageLayout) return;

        // 1. Calculate Image Center (Pre-transform)
        const cx = imageLayout.offsetX + imageLayout.width / 2;
        const cy = imageLayout.offsetY + imageLayout.height / 2;

        // 2. Calculate Transformed Center
        const tcx = cx + imgTransX.value;
        const tcy = cy + imgTransY.value;

        // 3. Calculate Transformed Top-Left
        const currentScale = imgScale.value;
        const tx = tcx - (imageLayout.width * currentScale) / 2;
        const ty = tcy - (imageLayout.height * currentScale) / 2;

        // 4. Calculate Crop Box Position relative to Transformed Image Top-Left
        const relativeX = cropX.value - tx;
        const relativeY = cropY.value - ty;

        // 5. Scale back to Original Image coordinates
        const totalScale = imageLayout.scale * currentScale;

        const originalX = relativeX / totalScale;
        const originalY = relativeY / totalScale;
        const originalW = cropWidth.value / totalScale;
        const originalH = cropHeight.value / totalScale;

        onConfirm({
            originX: originalX,
            originY: originalY,
            width: originalW,
            height: originalH,
            scale: 1,
            baseImageWidth: originalImageSize?.width || 0,
            baseImageHeight: originalImageSize?.height || 0,
        });
    };

    if (!imageLayout) return <View style={styles.container} />;

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.contentContainer}>

                {/* Global Pinch Handler */}
                <GestureDetector gesture={pinchGesture}>
                    <Animated.View style={{ flex: 1 }}>

                        {/* Background Image Pan */}
                        <GestureDetector gesture={imagePanGesture}>
                            <Animated.View style={{ flex: 1 }}>
                                <Animated.Image
                                    source={{ uri: imageUri }}
                                    style={[{
                                        position: 'absolute',
                                        width: imageLayout.width,
                                        height: imageLayout.height,
                                        top: imageLayout.offsetY,
                                        left: imageLayout.offsetX,
                                    }, animatedImageStyles]}
                                    resizeMode="contain"
                                />

                                {/* Dark Overlay masks */}
                                <Animated.View style={[styles.mask, maskTopStyle]} pointerEvents="none" />
                                <Animated.View style={[styles.mask, maskBottomStyle]} pointerEvents="none" />
                                <Animated.View style={[styles.mask, maskLeftStyle]} pointerEvents="none" />
                                <Animated.View style={[styles.mask, maskRightStyle]} pointerEvents="none" />
                            </Animated.View>
                        </GestureDetector>

                        {/* Crop Box Move */}
                        <GestureDetector gesture={moveGesture}>
                            <Animated.View style={[styles.cropBox, animatedStyles]}>
                                <GridOverlay />

                                {/* Corners */}
                                <GestureDetector gesture={resizeTL}>
                                    <View style={[styles.hitBox, styles.cornerHitBox, { top: -15, left: -15 }]}>
                                        <View style={[styles.bracket, styles.topLeft]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeTR}>
                                    <View style={[styles.hitBox, styles.cornerHitBox, { top: -15, right: -15 }]}>
                                        <View style={[styles.bracket, styles.topRight]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeBL}>
                                    <View style={[styles.hitBox, styles.cornerHitBox, { bottom: -15, left: -15 }]}>
                                        <View style={[styles.bracket, styles.bottomLeft]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeBR}>
                                    <View style={[styles.hitBox, styles.cornerHitBox, { bottom: -15, right: -15 }]}>
                                        <View style={[styles.bracket, styles.bottomRight]} />
                                    </View>
                                </GestureDetector>

                                {/* Sides */}
                                <GestureDetector gesture={resizeTop}>
                                    <View style={[styles.hitBox, styles.sideHitBox, { top: -15, left: 20, right: 20, height: 40 }]}>
                                        <View style={[styles.sideBar, styles.topBar]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeBottom}>
                                    <View style={[styles.hitBox, styles.sideHitBox, { bottom: -15, left: 20, right: 20, height: 40 }]}>
                                        <View style={[styles.sideBar, styles.bottomBarVisual]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeLeft}>
                                    <View style={[styles.hitBox, styles.sideHitBox, { left: -15, top: 20, bottom: 20, width: 40 }]}>
                                        <View style={[styles.sideBar, styles.leftBar]} />
                                    </View>
                                </GestureDetector>
                                <GestureDetector gesture={resizeRight}>
                                    <View style={[styles.hitBox, styles.sideHitBox, { right: -15, top: 20, bottom: 20, width: 40 }]}>
                                        <View style={[styles.sideBar, styles.rightBar]} />
                                    </View>
                                </GestureDetector>
                            </Animated.View>
                        </GestureDetector>
                    </Animated.View>
                </GestureDetector>

                {/* Instructions */}
                <View style={styles.instructionContainer} pointerEvents="none">
                    <Text style={styles.instructionText}>
                        Zoom and drag to frame your bird within the square.
                    </Text>
                </View>

                {/* Bottom Controls */}
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.bottomBtn} onPress={onRepick}>
                        <View style={styles.iconCircleSec}>
                            <ImageIcon size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.btnText}>Photos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.captureBtn} onPress={handleConfirm}>
                        <Check size={32} color={Colors.primary} strokeWidth={3} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.bottomBtn} onPress={onShowTips}>
                        <View style={styles.iconCircleSec}>
                            <HelpCircle size={24} color={Colors.text} />
                        </View>
                        <Text style={styles.btnText}>Snap Tips</Text>
                    </TouchableOpacity>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                    style={[styles.closeBtn, { top: Math.max(insets.top, 20) + 10, left: 24 }]}
                    onPress={onCancel}
                >
                    <X color="#fff" size={34} strokeWidth={3} />
                </TouchableOpacity>
            </View>
        </GestureHandlerRootView>
    );
};

const GridOverlay = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.gridLine, { top: '33%', height: 1, width: '100%' }]} />
        <View style={[styles.gridLine, { top: '66%', height: 1, width: '100%' }]} />
        <View style={[styles.gridLine, { left: '33%', width: 1, height: '100%' }]} />
        <View style={[styles.gridLine, { left: '66%', width: 1, height: '100%' }]} />
    </View>
);
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
    },
    mask: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    cropBox: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    gridLine: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    hitBox: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    cornerHitBox: {
        width: 40,
        height: 40,
    },
    sideHitBox: {
        // dimensions set inline based on orientation
    },
    bracket: {
        width: 20,
        height: 20,
        borderColor: Colors.primary, // Using primary color for handles as per theme
        borderWidth: 4,
    },
    // Stylized bars for sides
    sideBar: {
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    topBar: { width: 20, height: 4 },
    bottomBarVisual: { width: 20, height: 4 },
    leftBar: { width: 4, height: 20 },
    rightBar: { width: 4, height: 20 },

    topLeft: { borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { borderLeftWidth: 0, borderTopWidth: 0 },

    instructionContainer: {
        position: 'absolute',
        bottom: 180,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    instructionText: {
        color: '#fff',
        textAlign: 'center',
        paddingHorizontal: 40,
        ...Typography.body,
        fontSize: 14,
        opacity: 0.9,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        zIndex: 30,
    },
    bottomBtn: {
        alignItems: 'center',
        gap: 6,
    },
    iconCircleSec: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        ...Typography.caption,
        color: Colors.text,
        fontWeight: '600',
    },
    captureBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    closeBtn: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 40,
    },
});
