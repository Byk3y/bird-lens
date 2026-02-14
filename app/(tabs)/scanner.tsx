import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bird,
  Diamond,
  HelpCircle,
  Image as ImageIcon,
  Info,
  RefreshCcw,
  Save,
  ShieldAlert,
  X,
  XCircle,
  Zap,
  ZapOff
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, GestureResponderEvent, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [activeMode, setActiveMode] = useState<'photo' | 'sound'>('photo');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [showSnapTips, setShowSnapTips] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const baseZoom = useRef(0);
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: 'photo' | 'sound' }>();

  useEffect(() => {
    if (params.mode) {
      setActiveMode(params.mode);
    }
  }, [params.mode]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseZoom.current = zoom;
    })
    .onUpdate((event) => {
      const zoomSensitivity = 0.5;
      const newZoom = baseZoom.current + (event.scale - 1) * zoomSensitivity;
      runOnJS(setZoom)(Math.min(Math.max(newZoom, 0), 1));
    });

  const handleTrackInteraction = (event: GestureResponderEvent) => {
    const { locationY } = event.nativeEvent;
    const trackHeight = 100;
    const normalized = 1 - (locationY / trackHeight);
    setZoom(Math.min(Math.max(normalized, 0), 1));
  };

  if (!permission) return <View style={[styles.container, { backgroundColor: '#000' }]} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <ShieldAlert color={Colors.accent} size={64} style={{ marginBottom: Spacing.lg }} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>Enable your camera to start identifying species in the wild.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const identifyBird = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      const { data, error } = await supabase.functions.invoke('identify-bird', {
        body: { image: photo?.base64 },
      });

      if (error) throw error;
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Identification Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveSighting = async () => {
    if (!result || isSaving) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.from('sightings').insert({
        species_name: result.name,
        scientific_name: result.scientific_name,
        rarity: result.rarity,
        fact: result.fact,
        confidence: result.confidence,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', `${result.name} added to your collection.`);
      setResult(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {!result ? (
          <View style={[styles.cameraWrapper, activeMode === 'sound' && styles.soundBackground]}>
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
                      {/* Top Controls */}
                      <SafeAreaView style={styles.cameraHeader}>
                        <View style={styles.headerLeft}>
                          <TouchableOpacity
                            style={[styles.iconBtn, { marginLeft: 16, marginTop: 8 }]}
                            onPress={() => router.back()}
                          >
                            <X color={Colors.white} size={30} strokeWidth={3} />
                          </TouchableOpacity>
                          <View style={styles.premiumBadge}>
                            <Diamond color="#fcd34d" size={12} fill="#fcd34d" />
                            <Text style={styles.premiumText}>Unlimited IDs</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
                        >
                          {flash === 'on' ? (
                            <Zap color="#fcd34d" size={22} fill="#fcd34d" />
                          ) : (
                            <ZapOff color={Colors.white} size={22} />
                          )}
                        </TouchableOpacity>
                      </SafeAreaView>

                      {/* Viewfinder Corners - Minimalist */}
                      <View style={styles.viewfinderContainer}>
                        <View style={styles.minimalViewfinder}>
                          <View style={[styles.miniCorner, styles.topLeft]} />
                          <View style={[styles.miniCorner, styles.topRight]} />
                          <View style={[styles.miniCorner, styles.bottomLeft]} />
                          <View style={[styles.miniCorner, styles.bottomRight]} />
                        </View>

                        {/* Vertical Zoom Slider */}
                        <View style={styles.zoomControl}>
                          <TouchableOpacity onPress={() => setZoom(Math.min(zoom + 0.1, 1))}>
                            <Text style={styles.zoomSymbol}>+</Text>
                          </TouchableOpacity>
                          <View
                            style={styles.zoomTrackContainer}
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={handleTrackInteraction}
                            onResponderMove={handleTrackInteraction}
                          >
                            <View style={styles.zoomTrack}>
                              <View style={[styles.zoomIndicator, { bottom: `${zoom * 100}%` }]} />
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => setZoom(Math.max(zoom - 0.1, 0))}>
                            <Text style={styles.zoomSymbol}>−</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Viewfinder Text */}
                      <View style={styles.viewfinderInfo}>
                        <Text style={styles.infoLine}>Identify a bird via photo</Text>
                        <Text style={styles.infoLine}>Ensure the bird is in focus</Text>
                      </View>
                    </View>
                  </CameraView>
                </View>
              </GestureDetector>
            ) : (
              <View style={styles.soundWrapper}>
                <SafeAreaView style={styles.cameraHeader}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { marginLeft: 16, marginTop: 8 }]}
                    onPress={() => router.back()}
                  >
                    <X color="#1e293b" size={30} strokeWidth={3} />
                  </TouchableOpacity>
                </SafeAreaView>

                <View style={styles.soundMainContent}>
                  <Text style={styles.timerText}>00:00.00</Text>
                  <Text style={styles.recordingStatus}>Tap the button below to start recording</Text>
                </View>
              </View>
            )}

            {/* Bottom White Area */}
            <View style={[styles.bottomArea, activeMode === 'sound' && styles.soundBottomArea]}>
              {/* Mode Switcher */}
              <View style={styles.modeSwitcher}>
                <TouchableOpacity onPress={() => setActiveMode('photo')}>
                  <Text style={[styles.modeLabel, activeMode === 'photo' && styles.modeLabelActive]}>By Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveMode('sound')}>
                  <Text style={[styles.modeLabel, activeMode === 'sound' && styles.modeLabelActive]}>By Sound</Text>
                </TouchableOpacity>
              </View>

              {/* Captures / Controls */}
              <View style={styles.shutterRow}>
                {activeMode === 'photo' ? (
                  <TouchableOpacity style={styles.sideControl}>
                    <View style={styles.galleryPreview}>
                      <ImageIcon color="#f97316" size={21} />
                    </View>
                    <Text style={styles.sideLabel}>Photos</Text>
                  </TouchableOpacity>
                ) : <View style={styles.sideControlSpacer} />}

                <TouchableOpacity
                  onPress={activeMode === 'photo' ? identifyBird : () => { }} // Sound identification logic
                  disabled={isProcessing}
                  style={styles.mainShutter}
                >
                  <View style={[styles.shutterInner, isProcessing && { opacity: 0.7 }]}>
                    <LinearGradient
                      colors={['#f97316', '#D4202C']}
                      style={styles.shutterGradient}
                    />
                  </View>
                </TouchableOpacity>

                {activeMode === 'photo' ? (
                  <TouchableOpacity
                    style={styles.sideControl}
                    onPress={() => setShowSnapTips(true)}
                  >
                    <View style={styles.tipsBtn}>
                      <HelpCircle color="#1e293b" size={21} />
                    </View>
                    <Text style={styles.sideLabel}>Snap Tips</Text>
                  </TouchableOpacity>
                ) : <View style={styles.sideControlSpacer} />}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <ScrollView contentContainerStyle={styles.resultScroll}>
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                style={styles.resultCard}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.birdIconContainer}>
                    <Bird color={Colors.primary} size={40} />
                  </View>
                  <View style={styles.resultTitleContainer}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultScientific}>{result.scientific_name}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.resultStat}>
                    <Text style={styles.statLabel}>RARITY</Text>
                    <Text style={[styles.statValue, { color: result.rarity === 'Rare' ? Colors.accent : Colors.primary }]}>
                      {result.rarity}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.resultStat}>
                    <Text style={styles.statLabel}>CONFIDENCE</Text>
                    <Text style={styles.statValue}>{Math.round(result.confidence * 100)}%</Text>
                  </View>
                </View>

                <View style={styles.factContainer}>
                  <View style={styles.factHeader}>
                    <Info size={16} color={Colors.accent} />
                    <Text style={styles.factHeaderText}>Naturalist Fact</Text>
                  </View>
                  <Text style={styles.resultFact}>{result.fact}</Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={saveSighting}
                    disabled={isSaving}
                    style={[styles.actionBtn, styles.saveBtn]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Save color={Colors.white} size={20} />
                        <Text style={styles.actionBtnText}>Log to Journal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setResult(null)}
                    style={[styles.actionBtn, styles.resetBtn]}
                  >
                    <RefreshCcw color={Colors.white} size={20} />
                    <Text style={styles.actionBtnText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            </ScrollView>
          </View>
        )}

        {/* Snap Tips Modal */}
        <Modal
          visible={showSnapTips}
          animationType="fade"
          transparent={false}
        >
          <View style={styles.tipsContainer}>
            <SafeAreaView style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>Snap Tips</Text>
            </SafeAreaView>

            <View style={styles.tipsContent}>
              <View style={styles.tipMainCircle}>
                <Image
                  source={require('@/assets/images/tip_good.jpg')}
                  style={styles.tipLargeImage}
                />
                <View style={styles.successBadge}>
                  <LinearGradient
                    colors={['#4ade80', '#22c55e']}
                    style={styles.badgeGradient}
                  >
                    <Bird color="#fff" size={20} />
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.tipsGrid}>
                <View style={styles.tipGridItem}>
                  <View>
                    <View style={styles.tipSmallCircle}>
                      <Image
                        source={require('@/assets/images/tip_far.jpg')}
                        style={[styles.tipSmallImage, { transform: [{ scale: 3.5 }] }]}
                      />
                    </View>
                    <View style={styles.errorBadge}>
                      <XCircle color="#ef4444" size={24} fill="#fff" />
                    </View>
                  </View>
                  <Text style={styles.tipLabel}>Too far</Text>
                </View>

                <View style={styles.tipGridItem}>
                  <View>
                    <View style={styles.tipSmallCircle}>
                      <Image
                        source={require('@/assets/images/tip_blurry.jpg')}
                        style={styles.tipSmallImage}
                      />
                    </View>
                    <View style={styles.errorBadge}>
                      <XCircle color="#ef4444" size={24} fill="#fff" />
                    </View>
                  </View>
                  <Text style={styles.tipLabel}>Too blurry</Text>
                </View>

                <View style={styles.tipGridItem}>
                  <View>
                    <View style={styles.tipSmallCircle}>
                      <Image
                        source={require('@/assets/images/tip_multi.jpg')}
                        style={styles.tipSmallImage}
                      />
                    </View>
                    <View style={styles.errorBadge}>
                      <XCircle color="#ef4444" size={24} fill="#fff" />
                    </View>
                  </View>
                  <Text style={styles.tipLabel}>Multi-species</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => setShowSnapTips(false)}
            >
              <LinearGradient
                colors={['#f97316', '#D4202C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueGradient}
              >
                <Text style={styles.continueText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.white,
    marginBottom: Spacing.sm,
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
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  viewfinderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 44, // Offset to keep viewfinder centered with slider
  },
  minimalViewfinder: {
    width: width * 0.75,
    height: width * 0.75,
    position: 'relative',
  },
  miniCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 30 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 30 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 30 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 30 },
  zoomControl: {
    height: 180,
    width: 44,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 22,
    paddingVertical: 12,
  },
  zoomSymbol: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  zoomTrack: {
    width: 2,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    position: 'relative',
  },
  zoomTrackContainer: {
    width: 44,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.white,
    position: 'absolute',
    left: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  viewfinderInfo: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  infoLine: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  bottomArea: {
    backgroundColor: Colors.white,
    paddingTop: 28,
    paddingBottom: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
  },
  soundBackground: {
    backgroundColor: '#fffdfb',
  },
  soundWrapper: {
    flex: 1,
  },
  soundMainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    ...Typography.h1,
    fontSize: 42,
    color: '#1e293b',
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  recordingStatus: {
    ...Typography.body,
    color: '#94a3b8',
    fontSize: 16,
  },
  soundBottomArea: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  sideControlSpacer: {
    minWidth: 80,
  },
  modeSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 40,
  },
  modeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeLabelActive: {
    color: '#1e293b',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  sideControl: {
    alignItems: 'center',
    minWidth: 80,
  },
  galleryPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  mainShutter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.white,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  shutterGradient: {
    flex: 1,
    borderRadius: 34,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  resultScroll: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 32,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  birdIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  resultTitleContainer: {
    alignItems: 'center',
  },
  resultName: {
    ...Typography.h1,
    color: Colors.white,
    textAlign: 'center',
  },
  resultScientific: {
    ...Typography.body,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.white,
  },
  factContainer: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  factHeaderText: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 1,
  },
  resultFact: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  actionRow: {
    gap: Spacing.md,
  },
  actionBtn: {
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  resetBtn: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionBtnText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.white,
  },
  tipsContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  tipsHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  tipsContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  tipMainCircle: {
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: (width * 0.55) / 2,
    backgroundColor: '#fff',
    padding: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  tipLargeImage: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.55) / 2,
  },
  successBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
  },
  badgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tipGridItem: {
    alignItems: 'center',
    gap: 12,
  },
  tipSmallCircle: {
    width: width * 0.23,
    height: width * 0.23,
    borderRadius: (width * 0.23) / 2,
    backgroundColor: '#fff',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  tipSmallImage: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.23) / 2,
  },
  errorBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  continueBtn: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  continueGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});
