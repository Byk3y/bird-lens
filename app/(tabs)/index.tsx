import { Colors, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AudioLines,
  Binoculars,
  Camera,
  ChevronRight,
  Compass,
  MapPin,
  Search,
  Sparkles
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const EXPLORE_TAGS = ['Poultry', 'Attracting Birds', 'Hummingbirds', 'Annual C...'];

import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState('Poultry');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

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
          contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 120 }}
        >
          {/* Header Section */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerSubtitle}>Ready to find some birds?</Text>
          </View>

          {/* Search Bar - Crystallized */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search color="#475569" size={20} style={styles.searchIcon} />
              <TextInput
                placeholder="Search over 30,000 species"
                placeholderTextColor={Colors.textTertiary}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* Main Action Grid - Now more compact and premium */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <ActionCard
                title={"Photo\nIdentification"}
                icon={<Camera color={Colors.white} size={18} strokeWidth={2.5} />}
                style={styles.gridCard}
                gradient={['#FF758C', '#FF7EB3']}
                onPress={() => router.push('/(tabs)/scanner')}
              />
              <ActionCard
                title={"Sound\nIdentification"}
                icon={<AudioLines color={Colors.white} size={18} strokeWidth={2.5} />}
                style={styles.gridCard}
                gradient={['#FFDA77', '#FFA45B']}
                onPress={() => router.push({ pathname: '/(tabs)/scanner', params: { mode: 'sound' } })}
              />
            </View>
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
          </View>

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

          {/* Explore Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Compass color={Colors.primary} size={20} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Explore</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsContainer}
            >
              {EXPLORE_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(tag)}
                  style={[
                    styles.tag,
                    selectedTag === tag && styles.tagSelected
                  ]}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTag === tag && styles.tagTextSelected
                  ]}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.exploreCard}>
              <Image
                source={require('@/assets/images/explore_bird.jpg')}
                style={styles.exploreImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.exploreGradient}
              />
              <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle}>Capturing the Beauty of Early Birds</Text>
                <Text style={styles.exploreSubtitle}>5 min read • Photography</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

function AIEnhancerCard() {
  const containerWidth = width * 0.38;
  const sliderPos = useSharedValue(0.6); // Start at 60% across (showing 60% blur, 40% sharp)

  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      let newPos = event.x / containerWidth;
      if (newPos < 0.05) newPos = 0.05;
      if (newPos > 0.95) newPos = 0.95;
      sliderPos.value = withSpring(newPos, { damping: 20, stiffness: 200 });
    })
    .onUpdate((event) => {
      let newPos = event.x / containerWidth;
      if (newPos < 0.05) newPos = 0.05;
      if (newPos > 0.95) newPos = 0.95;
      sliderPos.value = newPos;
    })
    .onFinalize(() => {
      // Optional: snap to nearest edge or stay put
    })
    .activeOffsetX([-10, 10]);

  const sharpOverlayStyle = useAnimatedStyle(() => ({
    width: `${(1 - sliderPos.value) * 100}%`,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    left: `${sliderPos.value * 100}%`,
  }));

  return (
    <Pressable style={styles.enhancerCard}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.enhancerImageContainer}>
          {/* Blurred Background (Before) */}
          <Image
            source={require('@/assets/images/golden_pheasant.webp')}
            style={[styles.enhancerImage, { transform: [{ scaleX: -1 }] }]}
            resizeMode="cover"
            blurRadius={6}
          />

          {/* Sharp Overlay (After) */}
          <Animated.View style={[styles.sharpOverlay, sharpOverlayStyle]}>
            <Image
              source={require('@/assets/images/golden_pheasant.webp')}
              style={[styles.enhancerImage, { width: containerWidth, position: 'absolute', right: 0, transform: [{ scaleX: -1 }] }]}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Slider Line */}
          <Animated.View style={[styles.splitDivider, handleStyle]} />

          {/* Slider Handle */}
          <Animated.View style={[styles.splitHandle, handleStyle]}>
            <View style={styles.handleLine} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.enhancerContent}>
        <Text style={styles.enhancerTitle}>Turn your phone into a pro camera</Text>
        <View style={styles.startButton}>
          <Text style={styles.startText}>Start</Text>
          <ChevronRight color={Colors.primary} size={16} />
        </View>
      </View>
    </Pressable>
  );
}

function ActionCard({
  title,
  icon,
  isMap,
  style,
  gradient,
  transparentIcon,
  onPress
}: {
  title: string,
  icon: React.ReactNode,
  isMap?: boolean,
  style?: any,
  gradient?: string[],
  transparentIcon?: boolean,
  onPress?: () => void
}) {
  return (
    <Pressable style={[styles.card, style, isMap && styles.cardMap]} onPress={onPress}>
      {isMap && (
        <View style={styles.mapOverlay}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=300&auto=format&fit=crop' }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapDarken} />
        </View>
      )}
      {gradient ? (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          style={styles.cardIconContainer}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        >
          {icon}
        </LinearGradient>
      ) : (
        <View style={[styles.cardIconContainer, (isMap || transparentIcon) && styles.cardIconMap]}>
          {icon}
        </View>
      )}
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, isMap && styles.cardTitleMap]} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </Pressable>
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
  headerTitleContainer: {
    paddingHorizontal: Spacing.md,
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
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  gridContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gridCard: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    height: 74,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  cardIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardMap: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  cardIconMap: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.1,
    lineHeight: 21,
  },
  cardTitleMap: {
    color: '#1e293b',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  mapDarken: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
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
  enhancerCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  enhancerImageContainer: {
    width: width * 0.38,
    height: 94,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  enhancerImage: {
    width: '100%',
    height: '100%',
  },
  sharpOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  splitDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1.5,
    backgroundColor: Colors.white,
  },
  splitHandle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginLeft: -12,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  handleLine: {
    width: 2,
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
  },
  enhancerContent: {
    flex: 1,
    padding: Spacing.md,
  },
  enhancerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 18,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  tagsContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tagSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  tagTextSelected: {
    color: Colors.white,
  },
  exploreCard: {
    marginHorizontal: Spacing.md,
    borderRadius: 24,
    overflow: 'hidden',
    height: 320,
    backgroundColor: '#f1f5f9',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  exploreImage: {
    width: '100%',
    height: '100%',
  },
  exploreGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  exploreContent: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  exploreTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  exploreSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
