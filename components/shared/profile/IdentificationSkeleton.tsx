import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/** Vertical sweep shimmer */
function VerticalShimmer({ style }: { style?: any }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: 1400,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [-250, 250],
    });

    return (
        <View style={[{ backgroundColor: '#E8E8E8', overflow: 'hidden' }, style]}>
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateY }] }}>
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>
        </View>
    );
}

export const IdentificationSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {[1, 2].map((i) => (
                <View key={i} style={styles.idItem}>
                    <VerticalShimmer style={styles.idItemTitle} />
                    <VerticalShimmer style={styles.idImageWrapper} />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        gap: 20,
        width: '100%',
    },
    idItem: {
        width: '100%',
    },
    idItemTitle: {
        width: '30%',
        height: 20,
        borderRadius: 4,
        marginBottom: 8,
    },
    idImageWrapper: {
        width: '100%',
        height: 220,
        borderRadius: 16,
    },
});
