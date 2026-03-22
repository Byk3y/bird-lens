import { Colors, Spacing, Typography } from '@/constants/theme';
import { useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Linking,
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
import { AttributionSurveySheet } from '@/components/home/AttributionSurveySheet';
import { DraftSightingPrompt } from '@/components/home/DraftSightingPrompt';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HomeHeader } from '@/components/home/HomeHeader';
import { TrialBanner } from '@/components/home/TrialBanner';
import { useAlert } from '@/components/common/AlertProvider';
import { useAuth } from '@/lib/auth';
import { draftSighting, DraftSighting } from '@/lib/draftSighting';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [draftData, setDraftData] = useState<DraftSighting | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  // Show Pro welcome alert if user just completed a purchase
  useEffect(() => {
    AsyncStorage.getItem('@show_pro_welcome').then(val => {
      if (val === 'true') {
        AsyncStorage.removeItem('@show_pro_welcome');
        setTimeout(() => {
          showAlert({
            title: 'Welcome to BirdMark Pro! 🎉',
            message: 'Your purchase was successful. Enjoy unlimited identifications!',
            actions: [{ text: 'Start Discovering' }]
          });
        }, 500);
      }
    });
  }, []);

  // Show attribution survey on second app open, not immediately after onboarding
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    (async () => {
      const surveyDone = await AsyncStorage.getItem('@attribution_survey_completed');
      if (surveyDone === 'true') return;

      // Track home screen visits — only show survey from the second visit onward
      const visitCount = parseInt(await AsyncStorage.getItem('@home_visit_count') ?? '0', 10) + 1;
      await AsyncStorage.setItem('@home_visit_count', String(visitCount));

      if (visitCount >= 2) {
        timeout = setTimeout(() => setShowAttribution(true), 2000);
      }
    })();
    return () => clearTimeout(timeout);
  }, []);

  // Check for unsaved draft on mount
  useEffect(() => {
    draftSighting.loadDraft().then(draft => {
      if (draft) setDraftData(draft);
    });
  }, []);

  const handleSaveDraft = async () => {
    if (!draftData || !user?.id) {
      showAlert({ title: 'Error', message: 'You must be signed in to save sightings.' });
      return;
    }
    setIsDraftSaving(true);
    try {
      await draftSighting.saveDraftToCollection(draftData, user.id);
      await draftSighting.clearDraft();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDraftData(null);
    } catch (e: any) {
      console.error('Error saving draft:', e);
      showAlert({ title: 'Save Error', message: e.message || 'Failed to save sighting.' });
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleDiscardDraft = async () => {
    await draftSighting.clearDraft();
    setDraftData(null);
  };

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

        <TrialBanner />

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
                onPress={() => {
                  if (permission?.canAskAgain) {
                    requestPermission();
                  } else {
                    Linking.openSettings();
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.overlayButtonText}>
                  {permission?.canAskAgain ? 'Enable Camera' : 'Open Settings'}
                </Text>
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
            <Text style={styles.sectionTitle}>Bird Photo Enhancer</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>

          <AIEnhancerCard />
        </View>

        <ExploreSection />


      </ScrollView>

      {draftData && (
        <DraftSightingPrompt
          visible={!!draftData}
          draft={draftData}
          onSave={handleSaveDraft}
          onDiscard={handleDiscardDraft}
          isSaving={isDraftSaving}
        />
      )}

      <AttributionSurveySheet
        visible={showAttribution}
        onDismiss={() => setShowAttribution(false)}
      />
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
    color: Colors.text,
  },
  betaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
  },
});
