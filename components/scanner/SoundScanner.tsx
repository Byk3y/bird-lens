import { Typography } from '@/constants/theme';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ScannerHeader } from './ScannerHeader';

interface SoundScannerProps {
    onBack: () => void;
}

export const SoundScanner: React.FC<SoundScannerProps> = ({ onBack }) => {
    return (
        <View style={styles.soundWrapper}>
            <ScannerHeader onBack={onBack} flash="off" onFlashToggle={() => { }} isDark />

            <View style={styles.soundMainContent}>
                <Text style={styles.timerText}>00:00.00</Text>
                <Text style={styles.recordingStatus}>
                    Tap the button below to start recording
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
        paddingBottom: 100,
    },
    timerText: {
        fontSize: 64,
        fontWeight: '800',
        color: '#1e293b',
        fontVariant: ['tabular-nums'],
        letterSpacing: -1,
    },
    recordingStatus: {
        ...Typography.body,
        color: '#64748b',
        marginTop: 16,
        fontWeight: '600',
    },
});
