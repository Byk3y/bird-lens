import { Colors } from '@/constants/theme';
import { MotiView } from 'moti';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

interface SkeletonScreenProps {
    items?: number;
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({ items = 4 }) => {
    return (
        <>
            {Array.from({ length: items }).map((_, i) => (
                <View key={i} style={styles.card}>
                    {/* Image Area Shimmer */}
                    <View style={styles.imageContainer}>
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

                    {/* Content Area */}
                    <View style={styles.content}>
                        {/* Name Bar */}
                        <MotiView
                            from={{ opacity: 0.3 }}
                            animate={{ opacity: 0.6 }}
                            transition={{
                                type: 'timing',
                                duration: 1000,
                                delay: 100,
                                loop: true,
                                repeatReverse: true,
                            }}
                            style={styles.nameBar}
                        />

                        {/* Footer Bar */}
                        <View style={styles.footer}>
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
                                style={styles.dateBar}
                            />
                            <View style={styles.moreIcon} />
                        </View>
                    </View>
                </View>
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        borderRadius: 12,
        backgroundColor: Colors.white,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.9,
        backgroundColor: '#f1f5f9',
    },
    shimmer: {
        flex: 1,
        backgroundColor: '#e2e8f0',
    },
    content: {
        padding: 12,
        paddingTop: 10,
    },
    nameBar: {
        width: '80%',
        height: 15,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateBar: {
        width: '40%',
        height: 12,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
    },
    moreIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#f1f5f9',
    }
});
