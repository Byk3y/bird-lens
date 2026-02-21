import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DIET_ASSETS, FEEDER_ASSETS } from '../../constants/bird-assets';

interface OverlapAvatarsProps {
    tags: string[];
    type: 'diet' | 'feeder';
}

export const OverlapAvatars: React.FC<OverlapAvatarsProps> = ({ tags, type }) => {
    const assets = type === 'diet' ? DIET_ASSETS : FEEDER_ASSETS;

    // Improved matching: find assets where the key is contained within the tag
    // e.g. "Black Oil Sunflower Seeds" will match "seeds" or "sunflower seeds"
    const matchedUrls: any[] = [];
    const usedKeys = new Set<string>();

    tags.forEach(tag => {
        if (!tag) return;
        const lowerTag = tag.toLowerCase();

        // Sort keys by length descending to match longest possible string first 
        // (e.g. match "sunflower seeds" before just "seeds")
        const sortedKeys = Object.keys(assets).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            if (lowerTag.includes(key.toLowerCase()) && !usedKeys.has(key)) {
                const matchedAsset = assets[key];
                if (!matchedUrls.includes(matchedAsset)) {
                    matchedUrls.push(matchedAsset);
                }
                usedKeys.add(key);
                break; // Found a match for this tag, move to next tag
            }
        }
    });

    const finalUrls = matchedUrls.slice(0, 3);

    // If no tags, show skeletons
    if (tags.length === 0) {
        return (
            <View style={styles.container}>
                {[1, 2].map((i) => (
                    <View key={i} style={[styles.avatarWrapper, { backgroundColor: '#E0E0E0', opacity: 0.5 }]} />
                ))}
            </View>
        );
    }

    if (finalUrls.length === 0) return null;

    return (
        <View style={styles.container}>
            {finalUrls.map((url, index) => (
                <View
                    key={index}
                    style={styles.avatarWrapper}
                >
                    <Image
                        source={typeof url === 'number' ? url : { uri: url }}
                        style={styles.avatar}
                        cachePolicy="memory-disk"
                    />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#DDD', // Fallback color
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
});
