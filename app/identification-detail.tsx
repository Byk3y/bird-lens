import { BirdResult } from '@/types/scanner';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height, width } = Dimensions.get('window');

export default function IdentificationDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ birdData: string }>();
    const bird = React.useMemo(() => JSON.parse(params.birdData as string) as BirdResult, [params.birdData]);

    const translateY = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10 && gestureState.vy > 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    router.back();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 0,
                    }).start();
                }
            },
        })
    ).current;

    const hasMale = bird.identification_tips?.male && bird.identification_tips.male !== 'N/A';
    const hasFemale = bird.identification_tips?.female && bird.identification_tips.female !== 'N/A' && !bird.identification_tips.female.toLowerCase().includes('similar to male');
    const hasJuvenile = bird.identification_tips?.juvenile && bird.identification_tips.juvenile !== 'N/A';

    return (
        <View style={styles.screenWrapper}>
            <BlurView
                intensity={30}
                tint="dark"
                style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => router.back()}
            />
            <Animated.View
                style={[
                    styles.container,
                    {
                        transform: [{ translateY }],
                    },
                ]}
                {...panResponder.panHandlers}
            >
                <View style={styles.header}>
                    <View style={{ width: 44 }} />
                    <Text style={styles.headerTitle}>How to identify it?</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    {(() => {
                        const showMale = !!bird.male_image_url;
                        const showFemale = !!bird.female_image_url;

                        if (showMale || showFemale) {
                            return (
                                <>
                                    {hasMale && (
                                        <View style={styles.section}>
                                            <View style={styles.imageContainer}>
                                                <Image
                                                    source={{ uri: bird.male_image_url || bird.images?.[0] }}
                                                    style={styles.image}
                                                    contentFit="cover"
                                                />
                                                <View style={styles.labelBadge}>
                                                    <Text style={styles.labelText}>Male</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.sectionTitle}>Male Identification</Text>
                                            <View style={styles.descCard}>
                                                <Text style={styles.descText}>{bird.identification_tips.male}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {hasFemale && (
                                        <View style={styles.section}>
                                            {bird.female_image_url && (
                                                <View style={styles.imageContainer}>
                                                    <Image
                                                        source={{ uri: bird.female_image_url }}
                                                        style={styles.image}
                                                        contentFit="cover"
                                                    />
                                                    <View style={styles.labelBadge}>
                                                        <Text style={styles.labelText}>Female</Text>
                                                    </View>
                                                </View>
                                            )}
                                            <Text style={styles.sectionTitle}>Female Identification</Text>
                                            <View style={styles.descCard}>
                                                <Text style={styles.descText}>{bird.identification_tips.female}</Text>
                                            </View>
                                        </View>
                                    )}
                                </>
                            );
                        }

                        // Fallback: Single Adult section
                        return (
                            <View style={styles.section}>
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={{ uri: bird.images?.[0] }}
                                        style={styles.image}
                                        contentFit="cover"
                                    />
                                    <View style={styles.labelBadge}>
                                        <Text style={styles.labelText}>Adult</Text>
                                    </View>
                                </View>
                                <Text style={styles.sectionTitle}>Adult Identification</Text>
                                <View style={styles.descCard}>
                                    <Text style={styles.descText}>{bird.identification_tips.male}</Text>
                                </View>
                            </View>
                        );
                    })()}

                    {hasJuvenile && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>juvenile Identification</Text>
                            <View style={styles.descCard}>
                                <Text style={styles.descText}>{bird.identification_tips.juvenile}</Text>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 100,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 13,
        paddingTop: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 13,
        paddingTop: 0,
    },
    section: {
        marginBottom: 32,
    },
    imageContainer: {
        width: '100%',
        height: 240,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    labelBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    labelText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    descCard: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    descText: {
        fontSize: 17,
        lineHeight: 26,
        color: '#334155',
    },
});
