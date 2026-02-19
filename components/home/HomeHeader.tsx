import { Colors, Spacing } from '@/constants/theme';
import { Search } from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export const HomeHeader: React.FC = () => {
    const router = useRouter();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View>
            {/* Header Section */}
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerGreeting}>{getGreeting()}</Text>
                <Text style={styles.headerSubtitle}>Ready to find some birds?</Text>
            </View>

            {/* Search Bar - Crystallized */}
            <View style={styles.searchContainer}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.searchBar}
                    onPress={() => router.push('/search')}
                >
                    <Search color="#475569" size={20} style={styles.searchIcon} />
                    <Text style={styles.searchPlaceholder}>Search over 30,000 species</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerTitleContainer: {
        paddingHorizontal: 12,
        marginBottom: Spacing.lg,
    },
    headerGreeting: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    searchContainer: {
        paddingHorizontal: 12,
        marginBottom: Spacing.md,
    },
    searchBar: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    searchIcon: {
        marginRight: Spacing.sm,
        opacity: 0.9,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.textTertiary,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
});
