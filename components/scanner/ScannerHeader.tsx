import { Colors, Spacing, Typography } from '@/constants/theme';
import { Diamond, X, Zap, ZapOff } from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScannerHeaderProps {
    onBack: () => void;
    flash: 'on' | 'off' | 'auto';
    onFlashToggle: () => void;
    isDark?: boolean;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
    onBack,
    flash,
    onFlashToggle,
    isDark = false,
}) => {
    const insets = useSafeAreaInsets();
    const iconColor = isDark ? Colors.text : Colors.white;
    const buttonBg = isDark ? Colors.surfaceLight : 'rgba(0,0,0,0.3)';

    return (
        <View style={[styles.cameraHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={styles.headerLeft}>
                <TouchableOpacity
                    style={[styles.iconBtn, styles.backBtn, { backgroundColor: buttonBg }]}
                    onPress={onBack}
                >
                    <X color={iconColor} size={30} strokeWidth={3} />
                </TouchableOpacity>
                {!isDark && (
                    <View style={styles.premiumBadge}>
                        <Diamond color="#fcd34d" size={12} fill="#fcd34d" />
                        <Text style={styles.premiumText}>Unlimited IDs</Text>
                    </View>
                )}
            </View>

            {!isDark && (
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: buttonBg }]} onPress={onFlashToggle}>
                    {flash === 'on' ? (
                        <Zap color="#fcd34d" size={22} fill="#fcd34d" />
                    ) : (
                        <ZapOff color={Colors.white} size={22} />
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    cameraHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        marginLeft: 16,
        marginTop: 8,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 8,
    },
    premiumText: {
        ...Typography.label,
        color: Colors.white,
        fontSize: 10,
        fontWeight: '700',
    },
});
