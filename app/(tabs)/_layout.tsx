import { Colors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { Camera, CircleUserRound, LayoutGrid } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 72,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          elevation: 100,
          shadowOpacity: 0.1,
          zIndex: 999,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 5 : 12,
        },
        tabBarIconStyle: {
          marginTop: 6,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <View pointerEvents="none">
              <LayoutGrid color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          title: '',
          tabBarIcon: () => (
            <View pointerEvents="none" style={[styles.fabContainer, { bottom: Platform.OS === 'ios' ? 10 : 15 }]}>
              <View style={styles.fabGradient}>
                <Camera color={Colors.white} size={32} strokeWidth={2.5} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => (
            <View pointerEvents="none">
              <CircleUserRound color={color} size={24} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: Colors.primary, // Could be a LinearGradient but standard color for now
    justifyContent: 'center',
    alignItems: 'center',
  },
});
