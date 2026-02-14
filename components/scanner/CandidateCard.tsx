import { Colors, Typography } from '@/constants/theme';
import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CandidateCardProps {
    bird: BirdResult;
    isActive: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ bird, isActive }) => {
    return (
        <View style={[styles.container, isActive && styles.activeContainer]}>
            <View style={styles.imageContainer}>
                {/* Placeholder for bird image since the API currently returns base64 or URL */}
                {/* In a real app, we would have a proper image URL here. 
                    For now, we'll use a placeholder or the captured image if we had it passed down */}
                <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>{bird.name.charAt(0)}</Text>
                </View>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.name}>{bird.name}</Text>
                <Text style={styles.scientific}>{bird.scientific_name}</Text>
                <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{Math.round(bird.confidence * 100)}% Match</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 280,
        height: 380,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: Colors.surface,
        marginHorizontal: 10,
        opacity: 0.7,
        transform: [{ scale: 0.9 }],
    },
    activeContainer: {
        opacity: 1,
        transform: [{ scale: 1 }],
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    imageContainer: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 80,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.1)',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
    },
    infoContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    name: {
        ...Typography.h2,
        color: Colors.white,
        marginBottom: 4,
    },
    scientific: {
        ...Typography.body,
        color: Colors.textSecondary,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    matchBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    matchText: {
        ...Typography.caption,
        color: Colors.white,
        fontWeight: '700',
    },
});
