import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Bird, XCircle } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface SnapTipsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SnapTipsModal: React.FC<SnapTipsModalProps> = ({ visible, onClose }) => {
    return (
        <Modal visible={visible} animationType="fade" transparent={false}>
            <View style={styles.tipsContainer}>
                <SafeAreaView style={styles.tipsHeader}>
                    <Text style={styles.tipsTitle}>Snap Tips</Text>
                </SafeAreaView>

                <View style={styles.tipsContent}>
                    <View style={styles.tipMainCircle}>
                        <Image
                            source={require('@/assets/images/tip_good.jpg')}
                            style={styles.tipLargeImage}
                        />
                        <View style={styles.successBadge}>
                            <LinearGradient
                                colors={['#4ade80', '#22c55e']}
                                style={styles.badgeGradient}
                            >
                                <Bird color="#fff" size={20} />
                            </LinearGradient>
                        </View>
                    </View>

                    <View style={styles.tipsGrid}>
                        <View style={styles.tipGridItem}>
                            <View>
                                <View style={styles.tipSmallCircle}>
                                    <Image
                                        source={require('@/assets/images/tip_far.jpg')}
                                        style={[styles.tipSmallImage, { transform: [{ scale: 3.5 }] }]}
                                    />
                                </View>
                                <View style={styles.errorBadge}>
                                    <XCircle color="#ef4444" size={24} fill="#fff" />
                                </View>
                            </View>
                            <Text style={styles.tipLabel}>Too far</Text>
                        </View>

                        <View style={styles.tipGridItem}>
                            <View>
                                <View style={styles.tipSmallCircle}>
                                    <Image
                                        source={require('@/assets/images/tip_blurry.jpg')}
                                        style={styles.tipSmallImage}
                                    />
                                </View>
                                <View style={styles.errorBadge}>
                                    <XCircle color="#ef4444" size={24} fill="#fff" />
                                </View>
                            </View>
                            <Text style={styles.tipLabel}>Too blurry</Text>
                        </View>

                        <View style={styles.tipGridItem}>
                            <View>
                                <View style={styles.tipSmallCircle}>
                                    <Image
                                        source={require('@/assets/images/tip_multi.jpg')}
                                        style={styles.tipSmallImage}
                                    />
                                </View>
                                <View style={styles.errorBadge}>
                                    <XCircle color="#ef4444" size={24} fill="#fff" />
                                </View>
                            </View>
                            <Text style={styles.tipLabel}>Multi-species</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.continueBtn} onPress={onClose}>
                    <LinearGradient
                        colors={['#f97316', '#D4202C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.continueGradient}
                    >
                        <Text style={styles.continueText}>Continue</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    tipsContainer: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingBottom: 60,
    },
    tipsHeader: {
        alignItems: 'center',
        marginTop: 20,
    },
    tipsTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 0.5,
    },
    tipsContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
    },
    tipMainCircle: {
        width: width * 0.55,
        height: width * 0.55,
        borderRadius: (width * 0.55) / 2,
        backgroundColor: '#fff',
        padding: 2,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    tipLargeImage: {
        width: '100%',
        height: '100%',
        borderRadius: (width * 0.55) / 2,
    },
    successBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: '#1C1C1E',
        overflow: 'hidden',
    },
    badgeGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipsGrid: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    tipGridItem: {
        alignItems: 'center',
        gap: 12,
    },
    tipSmallCircle: {
        width: width * 0.23,
        height: width * 0.23,
        borderRadius: (width * 0.23) / 2,
        backgroundColor: '#fff',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    tipSmallImage: {
        width: '100%',
        height: '100%',
        borderRadius: (width * 0.23) / 2,
    },
    errorBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
    },
    tipLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94a3b8',
    },
    continueBtn: {
        width: '100%',
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#f97316',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    continueGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 0.5,
    },
});
