import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface ActionCardProps {
    title: string;
    icon: React.ReactNode;
    isMap?: boolean;
    style?: any;
    gradient?: string[];
    transparentIcon?: boolean;
    onPress?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    icon,
    isMap,
    style,
    gradient,
    transparentIcon,
    onPress
}) => {
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
};

const styles = StyleSheet.create({
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
});
