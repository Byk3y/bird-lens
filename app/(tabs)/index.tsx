import { Colors, Spacing, Typography } from '@/constants/theme';
import { useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Sparkles } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import { ActionGrid } from '@/components/home/ActionGrid';
import { AIEnhancerCard } from '@/components/home/AIEnhancerCard';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HomeHeader } from '@/components/home/HomeHeader';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Proactively request permission on mount if undetermined
  useEffect(() => {
    if (permission && permission.status === 'undetermined' && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  return (
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

        {/* Camera Permission Overlay (Only if denied) */}
        {permission && !permission.granted && permission.status !== 'undetermined' && (
          <View style={styles.permissionOverlay}>
            <View style={styles.overlayCard}>
              <View style={styles.overlayHeader}>
                <View style={styles.overlayIconCircle}>
                  <View pointerEvents="none">
                    <Camera color={Colors.primary} size={24} />
                  </View>
                </View>
                <View style={styles.overlayTextContent}>
                  <Text style={styles.overlayTitle}>Camera Ready?</Text>
                  <Text style={styles.overlaySubtitle}>Identify birds instantly with your lens.</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.overlayButton}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Text style={styles.overlayButtonText}>Enable Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Enhancer Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View pointerEvents="none">
              <Sparkles color={Colors.primary} size={20} style={styles.sectionIcon} />
            </View>
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
  permissionOverlay: {
    marginHorizontal: 16,
    marginBottom: Spacing.lg,
  },
  overlayCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
    // iOS Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    // Android Elevation
    elevation: 6,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  overlayIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  overlayTextContent: {
    flex: 1,
  },
  overlayTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 18,
    marginBottom: 4,
  },
  overlaySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  overlayButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    // iOS Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    // Android Elevation
    elevation: 4,
  },
  overlayButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
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
