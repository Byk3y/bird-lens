import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShareCardData } from './MagazineCard';

interface MinimalCardProps {
    data: ShareCardData;
}

export const MinimalCard: React.FC<MinimalCardProps> = ({ data }) => {
    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <Text style={styles.commonName}>{data.name}</Text>
                <Text style={styles.scientificName}>{data.scientificName}</Text>

                <View style={styles.divider} />

                <Text style={styles.date}>{data.dateIdentified}</Text>
                {data.locationName ? (
                    <Text style={styles.location}>📍 {data.locationName}</Text>
                ) : null}
            </View>

            <View style={styles.footer}>
                <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} />
                <Text style={styles.footerText}>Identified with BirdSnap</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1080,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
    },
    content: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    commonName: {
        fontSize: 32 * 2.5,
        fontWeight: '800',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 8,
    },
    scientificName: {
        fontSize: 16 * 2.5,
        fontStyle: 'italic',
        color: '#444444',
        textAlign: 'center',
    },
    divider: {
        width: 60 * 2.5,
        height: 3,
        backgroundColor: '#F97316',
        marginVertical: 12 * 2.5,
    },
    date: {
        fontSize: 13 * 2.5,
        color: '#888888',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    location: {
        fontSize: 13 * 2.5,
        color: '#888888',
        fontWeight: '500',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 'auto',
    },
    appIcon: {
        width: 28 * 2.5,
        height: 28 * 2.5,
        borderRadius: 6 * 2.5,
    },
    footerText: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#F97316',
    },
});
