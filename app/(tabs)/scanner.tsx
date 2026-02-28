import { useAlert } from '@/components/common/AlertProvider';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

// Hooks
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useBirdIdentification } from '@/hooks/useBirdIdentification';
import { useIsCameraActive } from '@/hooks/useIsCameraActive';
import { useScannerGestures } from '@/hooks/useScannerGestures';
import { useSubscriptionGating } from '@/hooks/useSubscriptionGating';
import { useAuth } from '@/lib/auth';

// Components
import { Paywall } from '@/components/Paywall';
import { IdentificationResult } from '@/components/scanner/IdentificationResult';
import { PhotoFramingView } from '@/components/scanner/PhotoFramingView';
import { ScannerControls } from '@/components/scanner/ScannerControls';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { ScannerPreview } from '@/components/scanner/ScannerPreview';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { SnapTipsModal } from '@/components/scanner/SnapTipsModal';
import { SoundScanner } from '@/components/scanner/SoundScanner';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

// Types
import { ScanMode } from '@/types/scanner';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [activeMode, setActiveMode] = useState<ScanMode>('photo');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const isCameraActive = useIsCameraActive();
  const [showSnapTips, setShowSnapTips] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const { isLoading: isAuthLoading } = useAuth();
  const { isGated, remainingCredits, incrementCount } = useSubscriptionGating();
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const { showAlert } = useAlert();

  const cameraRef = useRef<CameraView>(null);
  const processedAudioUris = useRef<Set<string>>(new Set());
  const router = useRouter();
  const {
    isProcessing,
    isSaving,
    result,
    candidates,
    enrichedCandidates,
    heroImages,
    error,
    progressMessage,
    identifyBird,
    enrichCandidate,
    updateHeroImage,
    saveSighting,
    resetResult,
    lastLocation,
  } = useBirdIdentification();

  const {
    zoom,
    setZoom,
    pinchGesture,
    handleTrackInteraction,
  } = useScannerGestures();

  const {
    isRecording,
    formattedTime,
    startRecording,
    stopRecording,
    stopAndCleanup,
    clearRecording,
    recordingUri,
    meteringLevel,
    durationMillis,
  } = useAudioRecording();

  const params = useLocalSearchParams<{ mode: ScanMode, enhancedImageUri?: string }>();

  useEffect(() => {
    setActiveMode(params.mode || 'photo');
  }, [params.mode]);

  // Handle enhanced images passed from the Enhancer
  useEffect(() => {
    if (params.enhancedImageUri && !result && !isProcessing) {
      console.log('[ScannerScreen] Automatically identifying enhanced image');

      if (isGated) {
        setIsPaywallVisible(true);
        return;
      }

      (async () => {
        try {
          const base64 = await FileSystem.readAsStringAsync(params.enhancedImageUri!, {
            encoding: FileSystem.EncodingType.Base64,
          });

          setCapturedImage(params.enhancedImageUri!);
          const bird = await identifyBird(base64);
          if (bird) incrementCount();
        } catch (e) {
          console.error('[ScannerScreen] Error processing enhanced image:', e);
          // If we can't read it as base64, try passing it as is as a last resort
          identifyBird(params.enhancedImageUri!);
        }
      })();
    }
  }, [params.enhancedImageUri]);

  // Provide a way to clear the captured image when result is reset
  useEffect(() => {
    if (!result && !isProcessing && !error) {
      setCapturedImage(null);
    }
  }, [result, isProcessing, error]);


  const [isFlashing, setIsFlashing] = useState(false);

  // Cleanup on unmount or navigate away
  useEffect(() => {
    return () => {
      resetResult();
      stopAndCleanup();
    };
  }, []);

  const handleBack = async () => {
    if (isRecording) {
      await stopAndCleanup();
    }
    clearRecording();
    resetResult();
    router.back();
  };

  const handlePickPhoto = async () => {
    // Check permission status from hook state first (instant)
    if (mediaPermission?.status !== 'granted') {
      const { status } = await requestMediaPermission();
      if (status !== 'granted') {
        showAlert({
          title: 'Permission Required',
          message: 'Sorry, we need camera roll permissions to make this work!'
        });
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // We use our own cropper
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPickedImage(result.assets[0].uri);
    }
  };

  const confirmFraming = async (cropData: { originX: number; originY: number; width: number; height: number; scale: number; baseImageWidth: number; baseImageHeight: number }) => {
    if (!pickedImage) return;
    if (isGated) { setIsPaywallVisible(true); return; }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Ensure crop rectangle is within image bounds
      const originX = Math.max(0, cropData.originX);
      const originY = Math.max(0, cropData.originY);

      // Adjust width and height if origin was clamped, and ensure they don't exceed remaining image space
      const availableWidth = (cropData.baseImageWidth || 0) - originX;
      const availableHeight = (cropData.baseImageHeight || 0) - originY;

      const width = Math.min(cropData.width - (originX - cropData.originX), availableWidth);
      const height = Math.min(cropData.height - (originY - cropData.originY), availableHeight);

      // Perform crop then resize
      const manipResult = await manipulateAsync(
        pickedImage,
        [
          {
            crop: {
              originX: Math.floor(originX),
              originY: Math.floor(originY),
              width: Math.floor(width),
              height: Math.floor(height),
            },
          },
          { resize: { width: 800 } },
        ],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      if (manipResult.uri) {
        setCapturedImage(manipResult.uri);
        const bird = await identifyBird(manipResult.base64!);
        if (bird) incrementCount();
        setPickedImage(null);
      }
    } catch (error: any) {
      console.error('Processing picked image failed', error);
      showAlert({
        title: 'Error',
        message: 'Failed to process image'
      });
    }
  };


  const handleCapture = async () => {
    if (isGated) {
      setIsPaywallVisible(true);
      return;
    }

    if (activeMode === 'photo') {
      if (!cameraRef.current || isProcessing) return;

      try {
        // Immediate feedback: heavy haptic and flash
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 100);

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false, // We will generate base64 after resizing
          exif: false,
        });

        if (photo?.uri) {
          // Resize and compress the image to avoid hitting Edge Function memory limits
          const manipResult = await manipulateAsync(
            photo.uri,
            [{ resize: { width: 800 } }], // Resize to reasonable width for API
            { compress: 0.6, format: SaveFormat.WEBP, base64: true }
          );

          if (manipResult.uri) {
            // We store the URI for direct display and share sheet compatibility
            setCapturedImage(manipResult.uri);
            if (manipResult.base64) {
              await identifyBird(manipResult.base64);
            }
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
        setCapturedImage(null); // Reset on error
      }
    } else {
      if (isRecording) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await stopRecording();

        // Auto-trigger identification after stopping if we have a URI
        // Note: we need to use a small delay or check the URI from the stopRecording result if possible
        // but useAudioRecording updates state. We can use the fact that stopRecording is async.
      } else if (recordingUri) {
        // Handle upload/identification manually if they press again
        try {
          const base64 = await FileSystem.readAsStringAsync(recordingUri, {
            encoding: 'base64',
          });
          const bird = await identifyBird(undefined, base64);
          if (bird) incrementCount();
        } catch (error) {
          console.error('Audio processing error:', error);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await startRecording();
      }
    }
  };

  // Add a side effect to auto-trigger identification when recording stops and we have a URI
  useEffect(() => {
    if (!isRecording && recordingUri && !result && !isProcessing && activeMode === 'sound' && !processedAudioUris.current.has(recordingUri)) {
      const triggerIdentification = async () => {
        try {
          processedAudioUris.current.add(recordingUri);
          const base64 = await FileSystem.readAsStringAsync(recordingUri, {
            encoding: 'base64',
          });
          const identifiedBird = await identifyBird(undefined, base64);
          if (identifiedBird) incrementCount();

          // Only show "No Match" if it's NOT aborted (identifiedBird === null)
          // identifiedBird is undefined when aborted
          if (identifiedBird === null && !isProcessing) {
            showAlert({
              title: 'No Match Found',
              message: "We couldn't identify this bird sound. Try recording a clearer sample!"
            });
          }
        } catch (err: any) {
          console.error('Auto audio processing error:', err);
          showAlert({
            title: 'Identification Failed',
            message: err.message || 'Something went wrong while analyzing the audio.'
          });
        }
      };
      triggerIdentification();
    }
  }, [isRecording, recordingUri, result, isProcessing, activeMode]);

  // Handle errors
  useEffect(() => {
    if (error && !isProcessing && activeMode === 'sound') {
      // Block cancel messages from showing alerts as they are intentional
      const isCancelMessage =
        error.toLowerCase().includes('cancel') ||
        error.toLowerCase().includes('abort');

      if (isCancelMessage) return;

      showAlert({
        title: 'Identification Error',
        message: error
      });
    }
  }, [error, isProcessing, activeMode]);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  if (!permission || permission.status === 'undetermined') {
    return <View style={[styles.container, { backgroundColor: '#000' }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.iconCircle}>
          <View pointerEvents="none">
            <ShieldAlert color={Colors.primary} size={48} />
          </View>
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need your camera to identify bird species. Enable access to start your bird lens.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <>
      <StatusBar style="light" translucent />
      <View style={styles.container}>
        {pickedImage && !result && !isProcessing ? (
          <PhotoFramingView
            imageUri={pickedImage}
            onCancel={() => setPickedImage(null)}
            onRepick={handlePickPhoto}
            onConfirm={confirmFraming}
            onShowTips={() => setShowSnapTips(true)}
          />
        ) : ((capturedImage || (activeMode === 'sound' && recordingUri)) && !result && (isProcessing || error)) ? (
          <ScannerPreview
            imageUri={capturedImage}
            audioUri={recordingUri}
            activeMode={activeMode}
            isProcessing={isProcessing}
            progressMessage={progressMessage}
            error={error}
            onReset={() => {
              resetResult();
              setCapturedImage(null);
              clearRecording();
            }}
          />
        ) : !result ? (
          <View style={styles.scannerWrapper}>
            {activeMode === 'photo' ? (
              <GestureDetector gesture={pinchGesture}>
                <View style={styles.fullScreenCamera}>
                  {isCameraActive && (
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      ref={cameraRef}
                      facing="back"
                      flash={flash}
                      enableTorch={flash === 'on'}
                      zoom={zoom}
                    />
                  )}
                  {isFlashing && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', zIndex: 999 }]} />
                  )}
                  <View style={styles.overlay}>
                    <ScannerHeader
                      onBack={handleBack}
                      flash={flash}
                      onFlashToggle={() => setFlash(flash === 'off' ? 'on' : 'off')}
                    />
                    <ScannerViewfinder />
                  </View>
                </View>
              </GestureDetector>
            ) : (
              <SoundScanner
                onBack={handleBack}
                isRecording={isRecording}
                formattedTime={formattedTime}
                hasRecording={!!recordingUri}
                isProcessing={isProcessing}
                meteringLevel={meteringLevel}
                durationMillis={durationMillis}
              />
            )}

            <ScannerControls
              activeMode={activeMode}
              onModeChange={setActiveMode}
              onCapture={handleCapture}
              isProcessing={isProcessing}
              isInitializing={isAuthLoading}
              onShowTips={() => setShowSnapTips(true)}
              isRecording={isRecording}
              hasRecording={!!recordingUri}
              onGalleryPress={handlePickPhoto}
              zoom={zoom}
              onZoomChange={setZoom}
            />
          </View>
        ) : (
          <IdentificationResult
            result={result}
            candidates={candidates}
            enrichedCandidates={enrichedCandidates}
            heroImages={heroImages}
            capturedImage={capturedImage}
            recordingUri={recordingUri}
            isProcessing={isProcessing}
            isSaving={isSaving}
            savedIndices={savedIndices}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            enrichCandidate={enrichCandidate}
            updateHeroImage={updateHeroImage}
            locationName={lastLocation?.locationName}
            onSave={async (bird, image, recording) => {
              const success = await saveSighting(bird, image, recording);
              if (success) {
                setSavedIndices(prev => new Set(prev).add(activeIndex));

                // Navigate to collection after a brief delay to show success state
              }
            }}
            onReset={() => {
              resetResult();
              setCapturedImage(null);
              clearRecording();
              setSavedIndices(new Set());
              setActiveIndex(0);
            }}
          />
        )}

        <SnapTipsModal
          visible={showSnapTips}
          onClose={() => setShowSnapTips(false)}
        />

        {isPaywallVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
            <Paywall onClose={() => setIsPaywallVisible(false)} />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenCamera: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    // iOS Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    // Android Elevation
    elevation: 8,
  },
  permissionTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: 20,
    // iOS Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    // Android Elevation
    elevation: 6,
  },
  permissionButtonText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
});
