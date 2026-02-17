import { Colors, Spacing } from '@/constants/theme';
import { ChevronLeft, Wifi } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface NoConnectionProps {
    onRetry?: () => void;
    onBack?: () => void;
}

export const NoConnection: React.FC<NoConnectionProps> = ({
    onRetry,
    onBack,
}) => {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {onBack && (
                    <Pressable onPress={onBack} style={styles.backBtn}>
                        <ChevronLeft color="#A1A1A1" size={28} />
                    </Pressable>
                )}

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Wifi size={120} color="#D1D5DB" strokeWidth={2.5} />
                    </View>

                    <Text style={styles.title}>No connection.</Text>
                    <Text style={styles.subtitle}>
                        Please check it and try again later.
                    </Text>

                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={onRetry}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryButtonText}>Reconnected</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    safeArea: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.lg,
        marginTop: Spacing.md,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginTop: -120, // Moved upwards
    },
    iconContainer: {
        marginBottom: 40,
        opacity: 0.8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 32,
    },
    retryButton: {
        backgroundColor: Colors.accent, // Using theme accent color which matches the orange in screenshot
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    retryButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '600',
    },
});
