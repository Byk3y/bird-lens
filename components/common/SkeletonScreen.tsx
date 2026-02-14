import { MotiView } from 'moti';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonScreenProps {
    items?: number;
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({ items = 4 }) => {
    return (
        <>
            {Array.from({ length: items }).map((_, i) => (
                <View key={i} style={styles.card}>
                    {/* Name Shimmer */}
                    <MotiView
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.6 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            loop: true,
                            repeatReverse: true,
                        }}
                        style={styles.nameBar}
                    />
                    {/* Sci Name Shimmer */}
                    <MotiView
                        from={{ opacity: 0.2 }}
                        animate={{ opacity: 0.4 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            delay: 200,
                            loop: true,
                            repeatReverse: true,
                        }}
                        style={styles.sciNameBar}
                    />
                    {/* Badge Shimmer */}
                    <MotiView
                        from={{ opacity: 0.2 }}
                        animate={{ opacity: 0.4 }}
                        transition={{
                            type: 'timing',
                            duration: 1000,
                            delay: 400,
                            loop: true,
                            repeatReverse: true,
                        }}
                        style={styles.badge}
                    />
                </View>
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        width: (width - 36) / 2,
        aspectRatio: 0.75,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        padding: 16,
        justifyContent: 'space-between',
    },
    nameBar: {
        width: '80%',
        height: 20,
        backgroundColor: '#e2e8f0',
        borderRadius: 10,
    },
    sciNameBar: {
        width: '60%',
        height: 12,
        backgroundColor: '#e2e8f0',
        borderRadius: 6,
        marginTop: 8,
    },
    badge: {
        width: 60,
        height: 20,
        backgroundColor: '#e2e8f0',
        borderRadius: 10,
    },
});
