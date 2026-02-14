import { Colors, Typography } from '@/constants/theme';
import { MotiView } from 'moti';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ScannerHeader } from './ScannerHeader';

interface SoundScannerProps {
    onBack: () => void;
    isRecording: boolean;
    formattedTime: string;
    hasRecording: boolean;
    isProcessing: boolean;
}

export const SoundScanner: React.FC<SoundScannerProps> = ({
    onBack,
    isRecording,
    formattedTime,
    hasRecording,
    isProcessing,
}) => {
    return (
        <View style={styles.soundWrapper}>
            <ScannerHeader onBack={onBack} flash="off" onFlashToggle={() => { }} isDark />

            <View style={styles.soundMainContent}>
                <View style={styles.vizContainer}>
                    {isRecording ? (
                        <View style={styles.waveRow}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <MotiView
                                    key={i}
                                    from={{ height: 20, opacity: 0.3 }}
                                    animate={{
                                        height: Math.random() * 50 + 20,
                                        opacity: 1
                                    }}
                                    transition={{
                                        type: 'timing',
                                        duration: 300,
                                        loop: true,
                                        delay: i * 40,
                                    }}
                                    style={styles.waveBar}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.placeholderIcon}>
                            <MotiView
                                from={{ scale: 0.9, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'timing', duration: 1000, loop: true }}
                            />
                        </View>
                    )}
                </View>

                <View style={[
                    styles.timerContainer,
                    isRecording && styles.timerContainerActive,
                    hasRecording && !isRecording && styles.timerContainerFinished
                ]}>
                    <Text style={[
                        styles.timerText,
                        isRecording && styles.timerTextActive,
                        hasRecording && !isRecording && styles.timerTextFinished
                    ]}>
                        {formattedTime}
                    </Text>
                </View>

                <Text style={styles.recordingStatus}>
                    {isRecording
                        ? 'Recording in progress...'
                        : isProcessing
                            ? 'Analyzing audio...'
                            : hasRecording
                                ? 'Tap the button below to upload the recording'
                                : 'Tap the button below to start recording'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    soundWrapper: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    soundMainContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 120,
    },
    vizContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    placeholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 80,
    },
    waveBar: {
        width: 6,
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },
    timerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    timerContainerActive: {
        backgroundColor: '#fef2f2',
    },
    timerContainerFinished: {
        backgroundColor: '#FFF7ED',
    },
    timerText: {
        fontSize: 64,
        fontWeight: '800',
        color: '#1e293b',
        fontVariant: ['tabular-nums'],
        letterSpacing: -1,
    },
    timerTextActive: {
        color: Colors.primary,
    },
    timerTextFinished: {
        color: '#f97316',
    },
    recordingStatus: {
        ...Typography.body,
        color: '#64748b',
        marginTop: 16,
        fontWeight: '600',
    },
});
