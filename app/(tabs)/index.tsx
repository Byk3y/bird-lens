import { Colors, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { ActionGrid } from '@/components/home/ActionGrid';
import { AIEnhancerCard } from '@/components/home/AIEnhancerCard';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HomeHeader } from '@/components/home/HomeHeader';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={[Colors.primary, Colors.background]}
          locations={[0, 0.7]}
          style={[styles.headerGradient, { height: 320 }]}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + Spacing.md,
            paddingBottom: 120
          }}
        >
          <HomeHeader />

          <ActionGrid />

          {/* AI Enhancer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles color={Colors.primary} size={20} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Bird Photo AI Enhancer</Text>
              <View style={styles.betaBadge}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>

            <AIEnhancerCard />
          </View>

          <ExploreSection />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f4',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  betaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  betaText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
  },
});
