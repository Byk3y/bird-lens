import { Colors, Typography } from '@/constants/theme';
import { ScanMode } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { HelpCircle, Image as ImageIcon, UploadCloud } from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

interface ScannerControlsProps {
    activeMode: ScanMode;
    onModeChange: (mode: ScanMode) => void;
    onCapture: () => void;
    isProcessing: boolean;
    isInitializing?: boolean;
    onShowTips: () => void;
    isRecording?: boolean;
    hasRecording?: boolean;
    onGalleryPress?: () => void;
    zoom: number;
    onZoomChange: (value: number) => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
    activeMode,
    onModeChange,
    onCapture,
    isProcessing,
    isInitializing = false,
    onShowTips,
    isRecording = false,
    hasRecording = false,
    onGalleryPress,
    zoom,
    onZoomChange,
}) => {
    const handleZoomPress = (level: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Map 1x to 0, 2x to 0.15, and 5x to 0.45 for a natural lens progression
        const zoomMap: Record<number, number> = { 1: 0, 2: 0.15, 5: 0.45 };
        onZoomChange(zoomMap[level] ?? 0);
    };

    // Horizontal swipe gesture to change modes
    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-20, 20]) // Require some movement to trigger
        .onEnd((e) => {
            // Swipe Left -> To Sound
            if (e.translationX < -60 && activeMode === 'photo' && !isRecording) {
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                runOnJS(onModeChange)('sound');
            }
            // Swipe Right -> To Photo
            else if (e.translationX > 60 && activeMode === 'sound' && !isRecording) {
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                runOnJS(onModeChange)('photo');
            }
        });

    return (
        <GestureDetector gesture={swipeGesture}>
            <View style={[styles.bottomArea, activeMode === 'sound' && styles.soundBottomArea]}>
                {/* Zoom Selector - Floating above the white bar */}
                {activeMode === 'photo' && (
                    <View style={styles.zoomContainer}>
                        <View style={styles.zoomPill}>
                            <TouchableOpacity
                                onPress={() => handleZoomPress(1)}
                                style={[styles.zoomButton, zoom === 0 && styles.zoomButtonActive]}
                            >
                                <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1x</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleZoomPress(2)}
                                style={[styles.zoomButton, zoom > 0 && zoom < 0.3 && styles.zoomButtonActive]}
                            >
                                <Text style={[styles.zoomText, zoom > 0 && zoom < 0.3 && styles.zoomTextActive]}>2x</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleZoomPress(5)}
                                style={[styles.zoomButton, zoom >= 0.3 && styles.zoomButtonActive]}
                            >
                                <Text style={[styles.zoomText, zoom >= 0.3 && styles.zoomTextActive]}>5x</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Mode Switcher */}
                <View style={styles.modeSwitcher}>
                    <TouchableOpacity onPress={() => onModeChange('photo')} disabled={isRecording}>
                        <Text style={[
                            styles.modeLabel,
                            activeMode === 'photo' && styles.modeLabelActive,
                            isRecording && { opacity: 0.5 }
                        ]}>
                            By Photo
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onModeChange('sound')} disabled={isRecording}>
                        <Text style={[
                            styles.modeLabel,
                            activeMode === 'sound' && styles.modeLabelActive,
                            isRecording && { opacity: 0.5 }
                        ]}>
                            By Sound
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Captures / Controls */}
                <View style={styles.shutterRow}>
                    {activeMode === 'photo' ? (
                        <TouchableOpacity style={styles.sideControl} onPress={onGalleryPress}>
                            <View style={styles.galleryPreview}>
                                <ImageIcon color="#f97316" size={21} />
                            </View>
                            <Text style={styles.sideLabel}>Photos</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.sideControlSpacer} />
                    )}

                    <TouchableOpacity
                        onPress={onCapture}
                        disabled={isProcessing || isInitializing}
                        style={[styles.mainShutter, activeMode === 'sound' && styles.soundShutter]}
                    >
                        {activeMode === 'photo' ? (
                            <View style={[
                                styles.shutterInner,
                                (isProcessing || isInitializing) && { opacity: 0.7 }
                            ]}>
                                {isInitializing ? (
                                    <View style={styles.initializingContainer}>
                                        <ActivityIndicator color={Colors.primary} size="small" />
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={['#f97316', '#D4202C']}
                                        style={styles.shutterGradient}
                                    />
                                )}
                            </View>
                        ) : (
                            // Sound Mode Shutter
                            <View style={[
                                styles.soundShutterInner,
                                isRecording && styles.soundShutterActive
                            ]}>
                                {isProcessing ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : hasRecording ? (
                                    <View style={styles.uploadIconContainer}>
                                        <UploadCloud color={Colors.white} size={24} />
                                    </View>
                                ) : isRecording ? (
                                    <View style={styles.stopIcon} />
                                ) : (
                                    <View style={styles.recordDot} />
                                )}
                            </View>
                        )}
                    </TouchableOpacity>

                    {activeMode === 'photo' ? (
                        <TouchableOpacity style={styles.sideControl} onPress={onShowTips}>
                            <View style={styles.tipsBtn}>
                                <HelpCircle color="#1e293b" size={21} />
                            </View>
                            <Text style={styles.sideLabel}>Snap Tips</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.sideControlSpacer} />
                    )}
                </View>
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    bottomArea: {
        backgroundColor: Colors.white,
        paddingTop: 28, // Restored to original
        paddingBottom: 80,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    soundBottomArea: {
        backgroundColor: Colors.white,
    },
    zoomContainer: {
        position: 'absolute',
        top: -60, // Float above the white area
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    zoomPill: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.4)', // Darker glass for overlay
        borderRadius: 24,
        padding: 4,
        gap: 4,
    },
    zoomButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomButtonActive: {
        backgroundColor: Colors.primary,
    },
    zoomText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.white, // White text for dark overlay
    },
    zoomTextActive: {
        color: Colors.white,
    },
    modeSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 16,
    },
    modeLabel: {
        ...Typography.body,
        fontSize: 16,
        fontWeight: '700',
        color: '#94a3b8',
    },
    modeLabelActive: {
        color: Colors.primary,
    },
    shutterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
    },
    sideControl: {
        alignItems: 'center',
        gap: 8,
    },
    sideControlSpacer: {
        width: 56,
    },
    galleryPreview: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff7ed',
        borderWidth: 1.5,
        borderColor: '#ffedd5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sideLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    mainShutter: {
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
    shutterInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 2,
        backgroundColor: Colors.white,
        borderWidth: 2,
        borderColor: '#f1f5f9',
    },
    shutterInnerRecording: {
        borderColor: '#fee2e2',
    },
    shutterInnerFinished: {
        borderColor: '#ffedd5',
    },
    shutterGradient: {
        flex: 1,
        borderRadius: 28,
    },
    stopButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    stopGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
    },
    stopIcon: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    uploadButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadIconContainer: {
        position: 'absolute',
        zIndex: 1,
    },
    initializingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Sound Shutter Styles
    soundShutter: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
        padding: 0,
    },
    soundShutterInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#E5E7EB', // Light gray ring by default
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4, // Space between ring and dot
    },
    soundShutterActive: {
        borderColor: Colors.primary, // Red ring when recording
    },
    recordDot: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: Colors.primary,
    },
});
