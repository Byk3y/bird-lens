import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AttributionWebViewProps {
    visible: boolean;
    url: string;
    title: string;
    onClose: () => void;
}

export const AttributionWebView: React.FC<AttributionWebViewProps> = ({
    visible,
    url,
    title,
    onClose,
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    // We use visible prop on Modal for basic visibility, 
    // but the internal slideAnim ensures a smooth slide up.
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <Pressable style={styles.backdrop} onPress={onClose}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </Pressable>

                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <ChevronLeft size={28} color="#1A1A1A" />
                            </TouchableOpacity>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                            </View>
                            <View style={styles.closeBtnPlaceholder} />
                        </View>
                    </View>

                    <View style={styles.webviewContainer}>
                        <WebView
                            source={{ uri: url }}
                            startInLoadingState={true}
                            style={styles.webview}
                            renderLoading={() => (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                </View>
                            )}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        backgroundColor: '#FFF',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    closeBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnPlaceholder: {
        width: 44,
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
});
