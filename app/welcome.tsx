import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    const router = useRouter();

    const handleContinue = () => {
        router.push('/onboarding');
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.centerContent}>
                    <Image
                        source={require('../assets/images/icon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>BirdSnap</Text>
                    <Text style={styles.tagline}>Discover the birds around you</Text>
                </View>

                <View style={styles.bottomContent}>
                    <TouchableOpacity onPress={handleContinue} style={styles.continueButton}>
                        <Text style={styles.continueText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: 120,
        height: 120,
        marginBottom: 20,
        borderRadius: 26.4,
    },
    title: {
        fontSize: 42,
        color: '#FFFFFF',
        fontFamily: 'PoppinsBold',
        textAlign: 'center',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 18,
        color: '#AAAAAA',
        textAlign: 'center',
        fontWeight: '500',
    },
    bottomContent: {
        width: '100%',
        alignItems: 'center',
        gap: 15,
    },
    continueButton: {
        backgroundColor: '#F97316',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    continueText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PoppinsBold',
        fontWeight: '700',
    },
});
