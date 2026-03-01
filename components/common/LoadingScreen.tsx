import { Colors, Spacing } from '@/constants/theme';
import LottieView from 'lottie-react-native';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';

interface LoadingScreenProps {
    message?: string;
    onBack?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    onBack
}) => {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {onBack && (
                    <Pressable onPress={onBack} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                        <View pointerEvents="none">
                            <ChevronLeft color={Colors.textSecondary} size={28} />
                        </View>
                    </Pressable>
                )}

                <View style={styles.content}>
                    <LottieView
                        source={require('@/assets/animations/bird-loading.lottie')}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    safeArea: {
        flex: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.lg,
        marginTop: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -120,
    },
    lottie: {
        width: 200,
        height: 200,
    },
});
