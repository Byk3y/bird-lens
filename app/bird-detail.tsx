import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Colors } from '@/constants/theme';
import { BirdMedia, MediaService } from '@/services/MediaService';
import { BirdSound, SoundService } from '@/services/SoundService';
import { BirdResult } from '@/types/scanner';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Camera,
    ChevronLeft,
    Edit2,
    Info,
    MoreHorizontal,
    Notebook,
    Share2,
    Volume2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function BirdDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        birdData: string;
        sightingDate?: string;
        imageUrl?: string;
    }>();
    const bird = JSON.parse(params.birdData as string) as BirdResult;
    const sightingDate = params.sightingDate ? new Date(params.sightingDate) : new Date();

    const [media, setMedia] = useState<BirdMedia | null>(null);
    const [sounds, setSounds] = useState<BirdSound[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [mediaData, soundData] = await Promise.all([
                    MediaService.fetchBirdMedia(bird.scientific_name),
                    SoundService.fetchSounds(bird.scientific_name)
                ]);
                setMedia(mediaData);
                setSounds(soundData);
            } catch (error) {
                console.error('Failed to load detail data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [bird.scientific_name]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this ${bird.name} I spotted! It's scientific name is ${bird.scientific_name}.`,
                url: params.imageUrl as string || media?.image?.url || bird.images?.[0] || '',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return <LoadingScreen onBack={() => router.back()} message="Opening Profile..." />;
    }

    return (
        <View style={styles.container}>
            {/* Header / Navigation */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft color={Colors.white} size={28} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image Section */}
                <View style={styles.heroWrapper}>
                    <Image
                        source={{ uri: params.imageUrl as string || media?.image?.url || bird.images?.[0] }}
                        style={styles.heroBlur}
                        blurRadius={100}
                    />
                    <View style={styles.imageCardContainer}>
                        <Image
                            source={{ uri: params.imageUrl as string || media?.image?.url || bird.images?.[0] }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    </View>
                    <View style={styles.timestampContainer}>
                        <Text style={styles.timestampLabel}>posted on</Text>
                        <Text style={styles.timestampValue}>{format(sightingDate, 'do MMM')}</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.mainInfoSection}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mainTitle}>{bird.name}, a species of</Text>
                            <Text style={styles.familyText}>
                                <Text style={styles.bold}>{bird.taxonomy?.family || 'N/A'}</Text>
                                {bird.taxonomy?.family_scientific && (
                                    <Text style={[styles.bold, { fontStyle: 'italic' }]}> ({bird.taxonomy.family_scientific})</Text>
                                )}
                            </Text>
                        </View>
                        <Pressable style={styles.editBtn}>
                            <Edit2 size={18} color="#666" />
                        </Pressable>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Also known as: </Text>
                        <Text style={styles.metaValue}>{bird.also_known_as?.[0] || 'N/A'}</Text>
                    </View>

                    <View style={styles.scientificNameRow}>
                        <Text style={styles.scientificNameLabel}>Scientific name: </Text>
                        <Text style={styles.scientificNameValue}>{bird.scientific_name}</Text>
                        <Pressable style={styles.speakerBtn}>
                            <Volume2 size={18} color="#D4A373" />
                        </Pressable>
                    </View>

                    {/* Gallery Section */}
                    <View style={styles.gallerySection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.galleryTitle}>Images of {bird.name}</Text>
                            <MoreHorizontal size={20} color="#666" />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                            {Array.from(new Set([
                                params.imageUrl,
                                media?.image?.url,
                                ...(bird.images || [])
                            ])).filter(Boolean).map((img, idx) => (
                                <View key={idx} style={styles.galleryItem}>
                                    <Image source={{ uri: img as string }} style={styles.galleryImage} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Birding Tips Section */}
                    <View style={styles.tipsSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Notebook size={20} color="#666" />
                            <Text style={styles.sectionTitle}>Birding Tips</Text>
                        </View>

                        <View style={styles.tipsContainer}>
                            {bird.identification_tips?.male && (
                                <View style={styles.tipCard}>
                                    <Text style={styles.tipCardLabel}>Male</Text>
                                    <Text style={styles.tipCardText}>{bird.identification_tips.male}</Text>
                                </View>
                            )}
                            {bird.identification_tips?.female && (
                                <View style={styles.tipCard}>
                                    <Text style={styles.tipCardLabel}>Female</Text>
                                    <Text style={styles.tipCardText}>{bird.identification_tips.female}</Text>
                                </View>
                            )}
                            {bird.identification_tips?.juvenile && (
                                <View style={styles.tipCard}>
                                    <Text style={styles.tipCardLabel}>Juvenile</Text>
                                    <Text style={styles.tipCardText}>{bird.identification_tips.juvenile}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Extra Info */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Info size={20} color="#666" />
                            <Text style={styles.sectionTitle}>Facts</Text>
                        </View>
                        <Text style={styles.descriptionText}>{bird.description}</Text>
                    </View>

                    <View style={styles.factCard}>
                        <Info color={Colors.primary} size={24} />
                        <View style={styles.factContent}>
                            <Text style={styles.factTitle}>Did you know?</Text>
                            <Text style={styles.factText}>{bird.fact}</Text>
                        </View>
                    </View>
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.bottomBarBtn}
                    onPress={() => router.replace('/(tabs)/scanner')}
                >
                    <Camera size={24} color={Colors.textSecondary} />
                    <Text style={styles.bottomBarText}>New</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.bottomBarBtn} onPress={handleShare}>
                    <Share2 size={24} color={Colors.textSecondary} />
                    <Text style={styles.bottomBarText}>Share</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroWrapper: {
        width: '100%',
        height: 360,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    heroBlur: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    imageCardContainer: {
        width: width * 0.48,
        height: width * 0.65,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 15,
        elevation: 12,
        alignSelf: 'center',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    timestampContainer: {
        position: 'absolute',
        right: 20,
        top: '50%',
        marginTop: -20,
        backgroundColor: 'transparent',
    },
    timestampLabel: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
        textAlign: 'right',
        marginBottom: 2,
    },
    timestampValue: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'right',
    },
    mainInfoSection: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 40,
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginTop: -16,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    familyText: {
        fontSize: 16,
        color: '#666666',
        marginTop: 4,
    },
    bold: {
        fontWeight: '700',
    },
    italic: {
        fontStyle: 'italic',
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 16,
        color: '#666666',
    },
    metaValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    scientificNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fefae0',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 24,
    },
    scientificNameLabel: {
        fontSize: 16,
        color: '#666666',
    },
    scientificNameValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1A1A',
        fontStyle: 'italic',
        flex: 1,
    },
    speakerBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(212, 163, 115, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gallerySection: {
        marginBottom: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    galleryTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    galleryScroll: {
        marginHorizontal: -12,
        paddingHorizontal: 12,
    },
    galleryItem: {
        width: 140,
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#f1f5f9',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    tipsSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1,
        marginLeft: 10,
    },
    tipsContainer: {
        gap: 12,
    },
    tipCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tipCardLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    tipCardText: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    section: {
        marginBottom: 32,
    },
    descriptionText: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    factCard: {
        backgroundColor: '#fefae0',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9edc9',
    },
    factContent: {
        flex: 1,
    },
    factTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    factText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333333',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 25,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 20,
    },
    bottomBarBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    bottomBarText: {
        color: '#666666',
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#f1f5f9',
    },
});
