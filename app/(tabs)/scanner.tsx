import { Colors, Spacing, Typography } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

// Components
import { IdentificationResult } from '@/components/scanner/IdentificationResult';
import { ScannerControls } from '@/components/scanner/ScannerControls';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { ScannerPreview } from '@/components/scanner/ScannerPreview';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { SnapTipsModal } from '@/components/scanner/SnapTipsModal';
import { SoundScanner } from '@/components/scanner/SoundScanner';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';

// Types
import { ScanMode } from '@/types/scanner';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<ScanMode>('photo');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [showSnapTips, setShowSnapTips] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: ScanMode }>();

  const {
    isProcessing,
    isSaving,
    result,
    candidates,
    identifyBird,
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

  // Reset to photo mode on mount to prevent being stuck in sound mode
  useEffect(() => {
    setActiveMode('photo');
    resetResult();
    setCapturedImage(null);
  }, []);

  useEffect(() => {
    setActiveMode(params.mode || 'photo');
  }, [params.mode]);

  // Provide a way to clear the captured image when result is reset
  useEffect(() => {
    if (!result && !isProcessing) {
      setCapturedImage(null);
    }
  }, [result, isProcessing]);

  const handleCapture = async () => {
    if (activeMode === 'photo') {
      if (!cameraRef.current || isProcessing) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: false,
        });

        if (photo?.base64) {
          setCapturedImage(photo.base64); // Set immediate preview
          await identifyBird(photo.base64);
        }
      } catch (error) {
        console.error('Capture error:', error);
        setCapturedImage(null); // Reset on error
      }
    } else {
      if (isRecording) {
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
        await startRecording();
      }
    }
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  if (!permission) return <View style={[styles.container, { backgroundColor: '#000' }]} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <ShieldAlert color={Colors.accent} size={64} style={{ marginBottom: Spacing.lg }} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Enable your camera to start identifying species in the wild.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" translucent />
      <View style={styles.container}>
        {capturedImage && isProcessing ? (
          <ScannerPreview
            imageUri={capturedImage}
            onClose={() => {
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
              onShowTips={() => setShowSnapTips(true)}
              isRecording={isRecording}
              hasRecording={!!recordingUri}
            />
          </View>
        ) : (
          <IdentificationResult
            result={result}
            candidates={candidates}
            capturedImage={capturedImage}
            isSaving={isSaving}
            isSaved={isSaved}
            onSave={async (bird, image, inatPhotos) => {
              const success = await saveSighting(bird, image, inatPhotos);
              if (success) {
                setIsSaved(true);
                // Wait 1s to show success state before navigating
                setTimeout(() => {
                  resetResult();
                  setCapturedImage(null);
                  setIsSaved(false);
                  router.replace('/(tabs)/collection');
                }, 1000);
              }
            }}
            onReset={() => {
              resetResult();
              setCapturedImage(null);
              setIsSaved(false);
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
    padding: Spacing.xl,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  permissionButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.white,
  },
});
