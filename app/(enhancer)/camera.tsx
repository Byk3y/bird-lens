import { useAlert } from '@/components/common/AlertProvider';
import { PhotoFramingView } from '@/components/scanner/PhotoFramingView';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { Colors, Typography } from '@/constants/theme';
import { EnhancerService } from '@/services/EnhancerService';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Download, Images, ShieldAlert, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Screen phases — everything happens on one screen
type EnhancerPhase = 'camera' | 'framing' | 'result';

/**
 * Scanning animation component for the enhancing phase
 */
function ScannerAnimation() {
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withTiming(SCREEN_WIDTH - 48, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={styles.scannerLineWrapper}>
            <Animated.View style={[styles.scannerLine, animatedStyle]} />
        </View>
    );
}

export default function EnhancerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [isCapturing, setIsCapturing] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    // State-based phase management (like the scanner)
    const [pickedImage, setPickedImage] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [phase, setPhase] = useState<EnhancerPhase>('camera');

    const cameraRef = useRef<CameraView>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    // Zoom
    const [zoom, setZoom] = useState(0);

    const pinchGesture = React.useMemo(() => {
        let savedZoom = 0;
        return Gesture.Pinch()
            .onStart(() => {
                savedZoom = zoom;
            })
            .onUpdate((e) => {
                const newZoom = Math.min(Math.max(savedZoom + (e.scale - 1) * 0.5, 0), 1);
                setZoom(newZoom);
            });
    }, [zoom]);

    const handleClose = () => {
        if (pickedImage || capturedImage) {
            // Go back to camera phase
            setPickedImage(null);
            setCapturedImage(null);
            setPhase('camera');
        } else {
            router.back();
        }
    };

    const handleCapture = async () => {
        if (!cameraRef.current || isCapturing) return;

        try {
            setIsCapturing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 100);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                base64: false,
                exif: false,
            });

            if (photo?.uri) {
                // Go directly to framing (like gallery pick in scanner)
                setPickedImage(photo.uri);
                setPhase('framing');
            }
        } catch (error) {
            console.error('Enhancer capture error:', error);
            showAlert({
                title: 'Capture Failed',
                message: 'Could not capture photo. Please try again.',
            });
        } finally {
            setIsCapturing(false);
        }
    };

    const handlePickPhoto = async () => {
        if (mediaPermission?.status !== 'granted') {
            const { status } = await requestMediaPermission();
            if (status !== 'granted') {
                showAlert({
                    title: 'Permission Required',
                    message: 'We need photo library access to select images.',
                });
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, // We use our own cropper
            quality: 1,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            setPickedImage(result.assets[0].uri);
            setPhase('framing');
        }
    };

    const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleFramingConfirm = async (cropData: {
        originX: number;
        originY: number;
        width: number;
        height: number;
        scale: number;
        baseImageWidth: number;
        baseImageHeight: number;
    }) => {
        if (!pickedImage) return;

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsEnhancing(true);

            // 1. Crop and resize the image for processing
            const manipResult = await manipulateAsync(
                pickedImage,
                [
                    {
                        crop: {
                            originX: Math.max(0, cropData.originX),
                            originY: Math.max(0, cropData.originY),
                            width: cropData.width,
                            height: cropData.height,
                        },
                    },
                    { resize: { width: 1024 } },
                ],
                { compress: 0.8, format: SaveFormat.JPEG, base64: true }
            );

            if (manipResult.base64) {
                setProcessedImage(manipResult.uri);

                // 2. Call the AI enhancement service
                const result = await EnhancerService.enhanceImage(manipResult.base64);

                setEnhancedImage(result);
                setPhase('result');
            }
        } catch (error: any) {
            console.error('Enhancement failed:', error);
            showAlert({
                title: 'Enhancement Failed',
                message: error.message || 'We could not enhance this image. Please try again.',
            });
            // Stay in framing phase
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleRepick = async () => {
        await handlePickPhoto();
    };

    const handleRetake = () => {
        setPickedImage(null);
        setCapturedImage(null);
        setEnhancedImage(null);
        setProcessedImage(null);
        setPhase('camera');
    };

    const handleSave = async () => {
        if (!enhancedImage || isSaving) return;

        try {
            setIsSaving(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert({
                    title: 'Permission Required',
                    message: 'Please enable gallery access to save photos.',
                });
                return;
            }

            let finalUri = enhancedImage;

            // 1. Prepare the image URI (save to local file if base64 or download if URL)
            if (enhancedImage.startsWith('data:') || !enhancedImage.startsWith('http')) {
                const base64Data = enhancedImage.includes('base64,')
                    ? enhancedImage.split('base64,')[1]
                    : enhancedImage;

                const filename = `${FileSystem.cacheDirectory}enhanced_${Date.now()}.jpg`;
                await FileSystem.writeAsStringAsync(filename, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                finalUri = filename;
            } else if (enhancedImage.startsWith('http')) {
                const filename = `${FileSystem.cacheDirectory}enhanced_${Date.now()}.jpg`;
                const downloadResult = await FileSystem.downloadAsync(enhancedImage, filename);
                finalUri = downloadResult.uri;
            }

            // 2. Save to library
            await MediaLibrary.saveToLibraryAsync(finalUri);

            showAlert({
                title: 'Saved! ✨',
                message: 'Enhanced photo has been saved to your gallery.',
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error saving image:', error);
            showAlert({
                title: 'Save Failed',
                message: 'We could not save the image to your gallery.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleIdentify = async () => {
        if (!enhancedImage) return;

        try {
            let finalUri = enhancedImage;

            // 1. Prepare the image URI (save to local file if base64 or download if URL)
            if (enhancedImage.startsWith('data:') || !enhancedImage.startsWith('http')) {
                // Handle Base64
                const base64Data = enhancedImage.includes('base64,')
                    ? enhancedImage.split('base64,')[1]
                    : enhancedImage;

                const filename = `${FileSystem.cacheDirectory}enhanced_${Date.now()}.jpg`;
                await FileSystem.writeAsStringAsync(filename, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                finalUri = filename;
            } else if (enhancedImage.startsWith('http')) {
                // Handle Remote URL from OpenRouter
                const filename = `${FileSystem.cacheDirectory}enhanced_${Date.now()}.jpg`;
                const downloadResult = await FileSystem.downloadAsync(enhancedImage, filename);
                finalUri = downloadResult.uri;
            }

            // 2. Navigate to scanner with the local file URI
            // We use 'push' to ensure we can go back, but we pass the uri
            router.push({
                pathname: '/(tabs)/scanner',
                params: { enhancedImageUri: finalUri }
            });
        } catch (error) {
            console.error('Error preparing image for identification:', error);
            // Fallback: try passing as is (though it may be too large for params)
            router.push({
                pathname: '/(tabs)/scanner',
                params: { enhancedImageUri: enhancedImage.substring(0, 1000) } // Truncate base64 if it's too long
            });
        }
    };

    // --- Permission States ---
    if (!permission || permission.status === 'undetermined') {
        return <View style={[styles.container, { backgroundColor: '#000' }]} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <View style={styles.iconCircle}>
                    <ShieldAlert color={Colors.primary} size={48} />
                </View>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    We need camera access to capture bird photos for AI enhancement.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ==========================================
    // STATE-BASED RENDERING (like the scanner)
    // ==========================================

    // Phase: FRAMING — Show the PhotoFramingView
    if (phase === 'framing' && pickedImage) {
        return (
            <PhotoFramingView
                imageUri={pickedImage}
                onCancel={handleRetake}
                onConfirm={handleFramingConfirm}
                onRepick={handleRepick}
                onShowTips={() => { }}
                isProcessing={isEnhancing}
            />
        );
    }

    // Phase: RESULT — Show the enhanced image
    if (phase === 'result' && enhancedImage) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" translucent />
                <View style={[styles.resultHeader, { paddingTop: insets.top + 8 }]}>
                    <Text style={styles.resultTitle}>Enhanced Photo</Text>
                    <TouchableOpacity style={styles.closeBtn} onPress={handleRetake}>
                        <X color="#fff" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={styles.resultContent}>
                    <Image
                        source={{ uri: enhancedImage }}
                        style={styles.enhancedPreview}
                        resizeMode="contain"
                    />
                </View>

                <View style={[styles.resultFooter, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.resultBtn} onPress={handleRetake}>
                        <Text style={styles.resultBtnText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.resultBtn, styles.saveCompactBtn, isSaving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <Download color={Colors.text} size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.resultBtn, styles.resultBtnPrimary]}
                        onPress={handleIdentify}
                    >
                        <Text style={[styles.resultBtnText, { color: '#fff' }]}>Identify Bird</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Phase: CAMERA — Default view
    return (
        <>
            <StatusBar style="light" translucent />
            <View style={styles.container}>
                {/* Camera */}
                <GestureDetector gesture={pinchGesture}>
                    <View style={styles.fullScreenCamera}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            ref={cameraRef}
                            facing="back"
                            flash={flash}
                            enableTorch={flash === 'on'}
                            zoom={zoom}
                        />

                        {/* Flash overlay */}
                        {isFlashing && (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', zIndex: 999 }]} />
                        )}

                        {/* Overlay UI */}
                        <View style={styles.overlay}>
                            <ScannerHeader
                                onBack={handleClose}
                                flash={flash}
                                onFlashToggle={() => setFlash(f => f === 'off' ? 'on' : 'off')}
                            />
                            <ScannerViewfinder />
                        </View>
                    </View>
                </GestureDetector>

                <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Gallery */}
                    <TouchableOpacity style={styles.sideButton} onPress={handlePickPhoto}>
                        <View style={styles.galleryButton}>
                            <View pointerEvents="none">
                                <Images color={Colors.primary} size={24} strokeWidth={2.5} />
                            </View>
                        </View>
                        <Text style={styles.sideLabel}>Photos</Text>
                    </TouchableOpacity>

                    {/* Capture */}
                    <TouchableOpacity
                        onPress={handleCapture}
                        disabled={isCapturing}
                        style={styles.captureButton}
                    >
                        <View style={[styles.captureInner, isCapturing && { opacity: 0.6 }]}>
                            <View style={styles.captureGradient} />
                        </View>
                    </TouchableOpacity>

                    {/* Spacer for symmetry */}
                    <View style={styles.sideButton}>
                        <View style={{ width: 48, height: 48 }} />
                        <Text style={[styles.sideLabel, { opacity: 0 }]}>—</Text>
                    </View>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullScreenCamera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
    },
    // --- Controls ---
    controls: {
        backgroundColor: Colors.white,
        paddingTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 64,
    },
    sideButton: {
        alignItems: 'center',
        gap: 8,
    },
    galleryButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff7ed',
        borderWidth: 1.5,
        borderColor: '#ffedd5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sideLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.white,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        overflow: 'hidden',
    },
    captureGradient: {
        flex: 1,
        borderRadius: 28,
        backgroundColor: Colors.primary,
    },
    // --- Processing ---
    processingHeader: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
    },
    processingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    processingText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    processingSubtext: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        paddingHorizontal: 40,
        fontWeight: '500',
    },
    scannerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#111',
    },
    scannerLineWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    scannerLine: {
        height: 3,
        width: '100%',
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 8,
    },
    processedPreview: {
        width: '100%',
        height: '100%',
        opacity: 0.7,
    },
    processingFooter: {
        paddingTop: 40,
        paddingBottom: 80,
    },
    // --- Result ---
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        top: 60,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    enhancedPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    resultFooter: {
        backgroundColor: Colors.white,
        paddingTop: 24,
        paddingHorizontal: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    resultBtn: {
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveCompactBtn: {
        backgroundColor: '#f1f5f9',
        width: 48,
        height: 48,
        paddingHorizontal: 0,
        borderRadius: 24,
    },
    resultBtnPrimary: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    resultBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    // --- Permission ---
    permissionContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    permissionTitle: {
        ...Typography.h1,
        color: Colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    permissionText: {
        ...Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 48,
        paddingHorizontal: 16,
    },
    permissionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 48,
        paddingVertical: 24,
        borderRadius: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 6,
    },
    permissionButtonText: {
        ...Typography.body,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: -0.2,
    },
});
