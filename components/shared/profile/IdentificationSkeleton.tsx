import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export const IdentificationSkeleton: React.FC = () => {
    return (
        <View style={styles.container}>
            {[1, 2].map((i) => (
                <View key={i} style={styles.idItem}>
                    {/* Title Shimmer */}
                    <MotiView
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.6 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            loop: true,
                            repeatReverse: true,
                        }}
                        style={styles.idItemTitle}
                    />

                    {/* Image Area Shimmer */}
                    <View style={styles.idImageWrapper}>
                        <MotiView
                            from={{ opacity: 0.4 }}
                            animate={{ opacity: 0.7 }}
                            transition={{
                                type: 'timing',
                                duration: 1000,
                                loop: true,
                                repeatReverse: true,
                            }}
                            style={styles.shimmer}
                        />
                    </View>
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
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 8,
    },
    idImageWrapper: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F8F8F8',
    },
    shimmer: {
        flex: 1,
        backgroundColor: '#E2E8F0',
    },
});
