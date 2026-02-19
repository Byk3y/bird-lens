import { INaturalistPhoto } from '@/types/scanner';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AttributionWebView } from './AttributionWebView';

const { width, height } = Dimensions.get('window');

interface ImageViewerProps {
    visible: boolean;
    images: INaturalistPhoto[];
    initialIndex: number;
    onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
    visible,
    images,
    initialIndex,
    onClose,
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showCopyright, setShowCopyright] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
    const [webViewTitle, setWebViewTitle] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            // Small delay to ensure scroll ref is ready
            setTimeout(() => {
                scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
            }, 50);
        }
    }, [visible, initialIndex]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: showCopyright ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showCopyright]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / width);
        if (index !== currentIndex) {
            setCurrentIndex(index);
            setShowCopyright(false); // Hide tooltip when swiping
        }
    };

    const currentPhoto = images[currentIndex];

    // Helper to parse attribution and license
    const getAttributionInfo = () => {
        const defaultInfo = { creator: 'Unknown', license: 'Unknown license' };
        if (!currentPhoto) return defaultInfo;

        const attr = currentPhoto.attribution || '';
        // Parse "(c) Dario Sanches, some rights reserved (CC BY-SA)"
        let creatorMatch = attr.match(/(?:\(c\)\s*)?([^,]+)/i);
        let creator = creatorMatch ? creatorMatch[1].trim() : 'Unknown';

        let licenseMatch = attr.match(/\(([^)]+)\)$/);
        let license = currentPhoto.license || (licenseMatch ? licenseMatch[1] : 'Unknown license');

        return { creator, license };
    };

    const handleLinkPress = (type: 'photo' | 'creator' | 'license') => {
        const info = getAttributionInfo();
        if (!currentPhoto) return;

        let url = '';
        let title = '';

        if (type === 'license') {
            title = info.license;
            // Common CC licenses
            if (info.license.includes('CC BY-SA')) url = 'https://creativecommons.org/licenses/by-sa/2.0/';
            else if (info.license.includes('CC BY-NC')) url = 'https://creativecommons.org/licenses/by-nc/2.0/';
            else if (info.license.includes('CC BY 2.0')) url = 'https://creativecommons.org/licenses/by/2.0/';
            else url = 'https://creativecommons.org/licenses/';
        } else if (type === 'creator') {
            title = info.creator;
            if (currentPhoto.provider === 'wikimedia') {
                // For Wikimedia, the photo page is the best place to find the creator
                return handleLinkPress('photo');
            }
            // Default to iNaturalist profile search
            url = `https://www.inaturalist.org/people/${encodeURIComponent(info.creator)}`;
        } else if (type === 'photo') {
            title = 'Original Photo';
            const { url: photoUrl, id, provider } = currentPhoto;

            if (provider === 'inaturalist' && id) {
                url = `https://www.inaturalist.org/photos/${id}`;
            } else if (provider === 'wikimedia' && id) {
                url = `https://commons.wikimedia.org/wiki/File:${id}`;
            } else {
                // Fallback to URL parsing for legacy/cached data
                const inatMatch = photoUrl.match(/photos\/(\d+)\//);
                if (inatMatch) {
                    url = `https://www.inaturalist.org/photos/${inatMatch[1]}`;
                } else if (photoUrl.includes('wikimedia.org')) {
                    const parts = photoUrl.split('/');
                    const commonsIdx = parts.indexOf('commons');
                    if (commonsIdx !== -1 && parts[commonsIdx + 3]) {
                        const filename = parts[commonsIdx + 3];
                        url = `https://commons.wikimedia.org/wiki/File:${filename}`;
                    }
                }
            }

            if (!url) {
                url = 'https://www.inaturalist.org/observations';
            }
        }

        if (url) {
            setWebViewUrl(url);
            setWebViewTitle(title);
        }
    };

    const info = getAttributionInfo();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X color="#FFF" size={28} />
                    </TouchableOpacity>
                </View>

                {/* Main Content (Images) */}
                <View style={styles.content}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {images.map((photo, index) => (
                            <View key={index} style={styles.imageContainer}>
                                <Image
                                    source={{ uri: photo.url }}
                                    style={styles.fullImage}
                                    contentFit="contain"
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {/* Copyright Tooltip Popover */}
                    <Animated.View style={[styles.tooltipContainer, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
                        <View style={styles.tooltipContent}>
                            <Text style={styles.tooltipText}>
                                <Text style={styles.linkText} onPress={() => handleLinkPress('photo')}>Photos</Text> By <Text style={styles.linkText} onPress={() => handleLinkPress('creator')}>{info.creator}</Text>, used under <Text style={styles.linkText} onPress={() => handleLinkPress('license')}>{info.license}</Text> / Cropped and compressed from original
                            </Text>
                            <TouchableOpacity onPress={() => setShowCopyright(false)} style={styles.tooltipCloseBtn}>
                                <X size={16} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tooltipArrow} />
                    </Animated.View>

                    <View style={styles.footerInfo}>
                        <TouchableOpacity
                            onPress={() => setShowCopyright(!showCopyright)}
                            style={styles.copyrightBtn}
                        >
                            <Text style={styles.copyrightLabel}>copyright</Text>
                        </TouchableOpacity>

                        <Text style={styles.paginationText}>
                            {currentIndex + 1} / {images.length}
                        </Text>

                        <View style={{ width: 80 }} />
                    </View>

                    <View style={styles.controls}>
                        <TouchableOpacity
                            onPress={() => {
                                const next = Math.max(0, currentIndex - 1);
                                scrollRef.current?.scrollTo({ x: next * width, animated: true });
                                setCurrentIndex(next);
                            }}
                            disabled={currentIndex === 0}
                            style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
                        >
                            <ChevronLeft color="#FFF" size={32} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                const next = Math.min(images.length - 1, currentIndex + 1);
                                scrollRef.current?.scrollTo({ x: next * width, animated: true });
                                setCurrentIndex(next);
                            }}
                            disabled={currentIndex === images.length - 1}
                            style={[styles.navBtn, currentIndex === images.length - 1 && { opacity: 0.3 }]}
                        >
                            <ChevronRight color="#FFF" size={32} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <AttributionWebView
                visible={webViewUrl !== null}
                url={webViewUrl || ''}
                title={webViewTitle}
                onClose={() => setWebViewUrl(null)}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    header: {
        height: 100,
        paddingTop: 50,
        paddingHorizontal: 20,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    closeBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
    },
    content: {
        flex: 1,
    },
    imageContainer: {
        width,
        height: height - 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width,
        height: '100%',
    },
    footer: {
        paddingBottom: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    copyrightBtn: {
        width: 80,
    },
    copyrightLabel: {
        color: '#FFF',
        fontSize: 16,
        textDecorationLine: 'underline',
        opacity: 0.8,
    },
    paginationText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
        gap: 60,
    },
    navBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Tooltip Styles
    tooltipContainer: {
        position: 'absolute',
        bottom: 110,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    tooltipContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 10,
        paddingVertical: 14,
        paddingLeft: 18,
        paddingRight: 42,
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    tooltipText: {
        color: '#E0E0E0',
        fontSize: 15,
        lineHeight: 22,
    },
    linkText: {
        textDecorationLine: 'underline',
        color: '#FFF',
    },
    tooltipCloseBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#1E1E1E',
        marginLeft: 20,
    },
});
