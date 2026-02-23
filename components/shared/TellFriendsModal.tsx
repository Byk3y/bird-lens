import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TellFriendsModalProps {
    visible: boolean;
    onClose: () => void;
}

const SHARE_MESSAGE = "Check out Birdsnap! It's an amazing app for identifying birds. Download it here: https://thebirdsnap.com";

export const TellFriendsModal: React.FC<TellFriendsModalProps> = ({ visible, onClose }) => {

    const handleShare = async (platform: 'whatsapp' | 'message' | 'email' | 'more') => {
        try {
            switch (platform) {
                case 'whatsapp':
                    await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(SHARE_MESSAGE)}`);
                    break;
                case 'message':
                    // On iOS/Android 'sms:' is the most cross-platform way for simple text
                    await Linking.openURL(`sms:?&body=${encodeURIComponent(SHARE_MESSAGE)}`);
                    break;
                case 'email':
                    await Linking.openURL(`mailto:?subject=Check out this bird app!&body=${encodeURIComponent(SHARE_MESSAGE)}`);
                    break;
                case 'more':
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                        await Sharing.shareAsync('https://thebirdsnap.com', {
                            dialogTitle: 'Tell friends about Birdsnap',
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error sharing via ${platform}:`, error);
            // Fallback to general share if specific platform fails (e.g. app not installed)
            if (platform !== 'more') {
                handleShare('more');
            }
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <AnimatePresence>
                {visible && (
                    <View style={styles.overlay}>
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <Pressable style={styles.backdrop} onPress={onClose} />
                        </MotiView>

                        <View style={styles.contentContainer}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                exit={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                transition={{ type: 'timing', duration: 300 }}
                                style={styles.card}
                            >
                                <Text style={styles.title}>Tell friends about Birdsnap</Text>

                                <View style={styles.optionsGrid}>
                                    <ShareOption
                                        label="WhatsApp"
                                        icon="logo-whatsapp"
                                        color="#25D366"
                                        onPress={() => handleShare('whatsapp')}
                                    />
                                    <ShareOption
                                        label="Message"
                                        icon="chatbubble"
                                        color="#4ADE80"
                                        onPress={() => handleShare('message')}
                                    />
                                    <ShareOption
                                        label="Email"
                                        icon="mail"
                                        color="#007AFF"
                                        onPress={() => handleShare('email')}
                                    />
                                    <ShareOption
                                        label="More"
                                        icon="ellipsis-horizontal"
                                        color="#94a3b8"
                                        onPress={() => handleShare('more')}
                                    />
                                </View>
                            </MotiView>

                            <MotiView
                                from={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'timing', duration: 250, delay: 100 }}
                                style={styles.closeBtnContainer}
                            >
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={onClose}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={28} color={Colors.white} />
                                </TouchableOpacity>
                            </MotiView>
                        </View>
                    </View>
                )}
            </AnimatePresence>
        </Modal>
    );
};

interface ShareOptionProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
}

const ShareOption: React.FC<ShareOptionProps> = ({ label, icon, color, onPress }) => (
    <TouchableOpacity style={styles.option} onPress={onPress}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <Ionicons name={icon} size={30} color={Colors.white} />
        </View>
        <Text style={styles.optionLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    contentContainer: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        ...Typography.h3,
        textAlign: 'center',
        marginBottom: 24,
        color: Colors.text,
        fontSize: 18,
    },
    optionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    option: {
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    closeBtnContainer: {
        marginTop: 24,
    },
    closeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
});
