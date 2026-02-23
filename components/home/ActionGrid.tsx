import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import {
    AudioLines,
    Camera
} from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';
import { ActionCard } from './ActionCard';

export const ActionGrid: React.FC = () => {
    const router = useRouter();

    return (
        <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
                <ActionCard
                    title={"Photo\nIdentification"}
                    icon={<Camera color={Colors.white} size={18} strokeWidth={2.5} />}
                    style={styles.gridCard}
                    gradient={['#F97316', '#F97316']}
                    onPress={() => router.push({ pathname: '/(tabs)/scanner', params: { mode: 'photo' } })}
                />
                <ActionCard
                    title={"Sound\nIdentification"}
                    icon={<AudioLines color={Colors.white} size={18} strokeWidth={2.5} />}
                    style={styles.gridCard}
                    gradient={['#F97316', '#F97316']}
                    onPress={() => router.push({ pathname: '/(tabs)/scanner', params: { mode: 'sound' } })}
                />
            </View>
            {/* 
            <View style={styles.gridRow}>
                <ActionCard
                    title={"Bird\nFinder"}
                    icon={<Binoculars color="#10B981" size={28} strokeWidth={2.5} />}
                    style={styles.gridCard}
                    transparentIcon
                />
                <ActionCard
                    title={"Birding\nHotspots"}
                    icon={<MapPin color="#EF4444" size={28} strokeWidth={2.5} />}
                    style={styles.gridCard}
                    isMap
                />
            </View>
            */}
        </View>
    );
};

const styles = StyleSheet.create({
    gridContainer: {
        paddingHorizontal: 12,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    gridRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    gridCard: {
        flex: 1,
    },
});
