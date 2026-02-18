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
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

// Hooks
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useBirdIdentification } from '@/hooks/useBirdIdentification';
import { useScannerGestures } from '@/hooks/useScannerGestures';
import { useAuth } from '@/lib/auth';

// Components
import { IdentificationResult } from '@/components/scanner/IdentificationResult';
import { ScannerControls } from '@/components/scanner/ScannerControls';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { ScannerPreview } from '@/components/scanner/ScannerPreview';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { SnapTipsModal } from '@/components/scanner/SnapTipsModal';
import { SoundScanner } from '@/components/scanner/SoundScanner';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

// Types
import { ScanMode } from '@/types/scanner';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<ScanMode>('photo');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [showSnapTips, setShowSnapTips] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const { isLoading: isAuthLoading } = useAuth();

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: ScanMode }>();

  const {
    isProcessing,
    isSaving,
    result,
    candidates,
    enrichedCandidates,
    heroImages,
    error,
    identifyBird,
    enrichCandidate,
    updateHeroImage,
    saveSighting,
    resetResult,
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
    recordingUri,
  } = useAudioRecording();

  // Reset to photo mode and auto-request permission on mount
  useEffect(() => {
    setActiveMode('photo');
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    setActiveMode(params.mode || 'photo');
  }, [params.mode]);

  // Provide a way to clear the captured image when result is reset
  useEffect(() => {
    if (!result && !isProcessing && !error) {
      setCapturedImage(null);
    }
  }, [result, isProcessing, error]);

  const [isFlashing, setIsFlashing] = useState(false);

  const handleCapture = async () => {
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
            { compress: 0.6, format: SaveFormat.JPEG, base64: true }
          );

          if (manipResult.base64) {
            setCapturedImage(manipResult.base64); // Set resized preview
            await identifyBird(manipResult.base64);
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
      } else if (recordingUri) {
        // Handle upload/identification
        try {
          const base64 = await FileSystem.readAsStringAsync(recordingUri, {
            encoding: 'base64',
          });
          await identifyBird(undefined, base64);
        } catch (error) {
          console.error('Audio processing error:', error);
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await startRecording();
      }
    }
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
          We need your camera to identify bird species. Enable access to start your bird lens.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" translucent />
      <View style={styles.container}>
        {capturedImage && !result && (isProcessing || error) ? (
          <ScannerPreview
            imageUri={capturedImage}
            isProcessing={isProcessing}
            progressMessage={null} // We are using dynamic messages now
            error={error}
            onReset={() => {
              resetResult();
              setCapturedImage(null);
            }}
          />
        ) : !result ? (
          <View style={styles.scannerWrapper}>
            {activeMode === 'photo' ? (
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
                  {isFlashing && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', zIndex: 999 }]} />
                  )}
                  <View style={styles.overlay}>
                    <ScannerHeader
                      onBack={() => router.back()}
                      flash={flash}
                      onFlashToggle={() => setFlash(flash === 'off' ? 'on' : 'off')}
                    />
                    <ScannerViewfinder
                      zoom={zoom}
                      onZoomChange={setZoom}
                      onTrackInteraction={handleTrackInteraction}
                    />
                  </View>
                </View>
              </GestureDetector>
            ) : (
              <SoundScanner
                onBack={() => router.back()}
                isRecording={isRecording}
                formattedTime={formattedTime}
                hasRecording={!!recordingUri}
                isProcessing={isProcessing}
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
            />
          </View>
        ) : (
          <IdentificationResult
            result={result}
            candidates={candidates}
            enrichedCandidates={enrichedCandidates}
            heroImages={heroImages}
            capturedImage={capturedImage}
            isSaving={isSaving}
            savedIndices={savedIndices}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            enrichCandidate={enrichCandidate}
            updateHeroImage={updateHeroImage}
            onSave={async (bird, image) => {
              const success = await saveSighting(bird, image);
              if (success) {
                setSavedIndices(prev => new Set(prev).add(activeIndex));

                // Navigate to collection after a brief delay to show success state
                setTimeout(() => {
                  resetResult();
                  setCapturedImage(null);
                  setSavedIndices(new Set());
                  setActiveIndex(0);
                  router.replace('/(tabs)/collection');
                }, 1200);
              }
            }}
            onReset={() => {
              resetResult();
              setCapturedImage(null);
              setSavedIndices(new Set());
              setActiveIndex(0);
            }}
          />
        )}

        <SnapTipsModal
          visible={showSnapTips}
          onClose={() => setShowSnapTips(false)}
        />
      </View>
    </GestureHandlerRootView>
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
