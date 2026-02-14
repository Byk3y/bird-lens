import { Colors, Spacing } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

// Hooks
import { useBirdIdentification } from '@/hooks/useBirdIdentification';
import { useScannerGestures } from '@/hooks/useScannerGestures';

// Components
import { IdentificationResult } from '@/components/scanner/IdentificationResult';
import { ScannerControls } from '@/components/scanner/ScannerControls';
import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { ScannerViewfinder } from '@/components/scanner/ScannerViewfinder';
import { SnapTipsModal } from '@/components/scanner/SnapTipsModal';
import { SoundScanner } from '@/components/scanner/SoundScanner';

// Types
import { ScanMode } from '@/types/scanner';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<ScanMode>('photo');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [showSnapTips, setShowSnapTips] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: ScanMode }>();

  const {
    isProcessing,
    isSaving,
    result,
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

  useEffect(() => {
    if (params.mode) {
      setActiveMode(params.mode);
    }
  }, [params.mode]);

  const handleIdentify = async () => {
    if (!cameraRef.current || isProcessing) return;

    const photo = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.5,
    });

    if (photo?.base64) {
      await identifyBird(photo.base64);
    }
  };

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
      <View style={styles.container}>
        {!result ? (
          <View style={styles.scannerWrapper}>
            {activeMode === 'photo' ? (
              <GestureDetector gesture={pinchGesture}>
                <View style={{ flex: 1 }}>
                  <CameraView
                    style={styles.camera}
                    ref={cameraRef}
                    facing="back"
                    zoom={zoom}
                    enableTorch={flash === 'on'}
                  >
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
                  </CameraView>
                </View>
              </GestureDetector>
            ) : (
              <SoundScanner onBack={() => router.back()} />
            )}

            <ScannerControls
              activeMode={activeMode}
              onModeChange={setActiveMode}
              onCapture={activeMode === 'photo' ? handleIdentify : () => { }} // TODO: Sound ID logic
              isProcessing={isProcessing}
              onShowTips={() => setShowSnapTips(true)}
            />
          </View>
        ) : (
          <IdentificationResult
            result={result}
            isSaving={isSaving}
            onSave={() => saveSighting(result)}
            onReset={resetResult}
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
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
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
