import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function AppInfoScreen() {
    const router = useRouter();
    const version = Constants.expoConfig?.version || '1.0.0';

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color="#000000" size={26} strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.headerTitle}>App Info</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Visual Branding Card */}
                <View style={styles.brandingCardContainer}>
                    <LinearGradient
                        colors={['#2C3E50', '#000000']}
                        style={styles.brandingCard}
                    >
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../assets/images/icon.png')}
                                style={styles.appIcon}
                            />
                        </View>
                        <Text style={styles.appName}>BirdSnap v{version}</Text>
                        <Text style={styles.tagline}>Instantly Identify Bird</Text>
                    </LinearGradient>
                </View>

                {/* Description Card */}
                <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionText}>
                        Don't know the name of a bird? BirdSnap helps you to identify unknown birds and discover nature in the most simple and interesting way.
                    </Text>
                    <Text style={styles.descriptionText}>
                        We've been working hard to provide a better user experience and optimize our recognition technology all the time! We would love to have anyone who loves birds join our family.
                    </Text>
                    <Text style={styles.descriptionText}>
                        Let us start the journey encountering the most lovely birds from all over the world.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        height: 50,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        color: '#000000',
        letterSpacing: -0.5,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    brandingCardContainer: {
        width: '100%',
        aspectRatio: 1.6,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    brandingCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 90,
        height: 90,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 12,
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    appIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
        borderRadius: 12,
    },
    appName: {
        fontSize: 18,
        fontFamily: 'Inter_400Regular',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    tagline: {
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    descriptionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    descriptionText: {
        fontSize: 16,
        fontFamily: 'Inter_300Light',
        color: '#4B5563',
        lineHeight: 24,
        marginBottom: 16,
    },
});
