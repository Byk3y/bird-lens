import { Colors, Typography } from '@/constants/theme';
import { ScanMode } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { HelpCircle, Image as ImageIcon, UploadCloud } from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ScannerControlsProps {
    activeMode: ScanMode;
    onModeChange: (mode: ScanMode) => void;
    onCapture: () => void;
    isProcessing: boolean;
    onShowTips: () => void;
    isRecording?: boolean;
    hasRecording?: boolean;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
    activeMode,
    onModeChange,
    onCapture,
    isProcessing,
    onShowTips,
    isRecording = false,
    hasRecording = false,
}) => {
    return (
        <View style={[styles.bottomArea, activeMode === 'sound' && styles.soundBottomArea]}>
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
                    <TouchableOpacity style={styles.sideControl}>
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
                    disabled={isProcessing}
                    style={styles.mainShutter}
                >
                    <View style={[
                        styles.shutterInner,
                        isProcessing && { opacity: 0.7 },
                        isRecording && styles.shutterInnerRecording,
                        hasRecording && !isRecording && styles.shutterInnerFinished
                    ]}>
                        {isRecording ? (
                            <View style={styles.stopButton}>
                                <LinearGradient
                                    colors={['#f97316', '#D4202C']}
                                    style={styles.stopGradient}
                                />
                                <View style={styles.stopIcon} />
                            </View>
                        ) : hasRecording ? (
                            <View style={styles.uploadButton}>
                                <LinearGradient
                                    colors={['#f97316', '#D4202C']}
                                    style={styles.shutterGradient}
                                />
                                <View style={styles.uploadIconContainer}>
                                    <UploadCloud color={Colors.white} size={24} />
                                </View>
                            </View>
                        ) : (
                            <LinearGradient
                                colors={['#f97316', '#D4202C']}
                                style={styles.shutterGradient}
                            />
                        )}
                    </View>
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
    );
};

const styles = StyleSheet.create({
    bottomArea: {
        backgroundColor: Colors.white,
        paddingTop: 28,
        paddingBottom: 80,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    soundBottomArea: {
        backgroundColor: '#F8FAFC',
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
        backgroundColor: Colors.white,
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
});
