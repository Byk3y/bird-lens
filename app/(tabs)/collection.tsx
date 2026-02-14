import { Colors, Spacing, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Forward, Gem, Plus, Settings } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
            {/* Header with Cardinal Gradient */}
            <LinearGradient
                colors={['#f97316', '#D4202C', '#D4202C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.topActions}>
                        <Pressable style={styles.headerBtn}>
                            <Forward color={Colors.white} size={22} />
                        </Pressable>
                        <Pressable style={styles.headerBtn} onPress={() => router.push('/settings')}>
                            <Settings color={Colors.white} size={22} />
                        </Pressable>
                    </View>

                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800 }}
                        style={styles.subscribeBanner}
                    >
                        <Gem color="#fbbf24" size={20} />
                        <Text style={styles.subscribeText}>Subscribe Now</Text>
                    </MotiView>
                </View>
            </LinearGradient>

            {/* Main Content Area */}
            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Collections (0)</Text>
                </View>

                <View style={styles.grid}>
                    {/* Collection Cards would go here */}

                    {/* Plus Button Card - Empty state requirement */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <Pressable style={styles.plusCard}>
                            <Plus color="#94a3b8" size={48} strokeWidth={1.5} />
                        </Pressable>
                    </MotiView>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingBottom: Spacing.xxl,
        height: 280,
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    topActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscribeBanner: {
        backgroundColor: '#1e293b',
        marginTop: Spacing.md,
        marginHorizontal: Spacing.xl,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    subscribeText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginTop: -80,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: 600,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
    },
    sectionHeader: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.text,
        fontSize: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    plusCard: {
        width: (Platform.OS === 'web' ? 180 : 165),
        aspectRatio: 0.85,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
});
