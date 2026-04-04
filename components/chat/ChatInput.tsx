import { Colors, Typography } from '@/constants/theme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Send, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputProps {
    onSend: (text: string, imageUri?: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [text, setText] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const insets = useSafeAreaInsets();
    const hasContent = text.trim().length > 0 || !!imageUri;

    const handleSend = () => {
        if (!hasContent || disabled) return;
        onSend(text.trim(), imageUri ?? undefined);
        setText('');
        setImageUri(null);
    };

    const pickFromCamera = useCallback(async () => {
        setShowPicker(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Camera access needed', 'Please enable camera access in Settings to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    }, []);

    const pickFromLibrary = useCallback(async () => {
        setShowPicker(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            mediaTypes: ['images'],
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    }, []);

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {/* Image preview */}
            {imageUri && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setImageUri(null)}
                        hitSlop={8}
                    >
                        <X size={14} color={Colors.white} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Popover picker menu */}
            {showPicker && (
                <>
                    <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)} />
                    <View style={styles.popover}>
                        <TouchableOpacity style={styles.popoverOption} onPress={pickFromCamera} activeOpacity={0.7}>
                            <Camera size={18} color={Colors.text} />
                            <Text style={styles.popoverText}>Take Photo</Text>
                        </TouchableOpacity>
                        <View style={styles.popoverDivider} />
                        <TouchableOpacity style={styles.popoverOption} onPress={pickFromLibrary} activeOpacity={0.7}>
                            <ImageIcon size={18} color={Colors.text} />
                            <Text style={styles.popoverText}>Choose from Library</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Input row */}
            <View style={styles.inputRow}>
                <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={() => setShowPicker(!showPicker)}
                    disabled={disabled}
                >
                    <Camera size={20} color={disabled ? Colors.textTertiary : Colors.textSecondary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Ask me anything"
                    placeholderTextColor={Colors.textTertiary}
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={1000}
                    editable={!disabled}
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                    returnKeyType="default"
                />

                <TouchableOpacity
                    style={[styles.sendButton, hasContent && !disabled && styles.sendButtonActive]}
                    onPress={handleSend}
                    disabled={!hasContent || disabled}
                >
                    <Send
                        size={18}
                        color={hasContent && !disabled ? Colors.white : Colors.textTertiary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 8,
    },
    previewContainer: {
        marginHorizontal: 12,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    previewImage: {
        width: 72,
        height: 72,
        borderRadius: 12,
    },
    removeImageButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: -500,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    popover: {
        position: 'absolute',
        bottom: 60,
        left: 12,
        backgroundColor: Colors.white,
        borderRadius: 14,
        paddingVertical: 4,
        zIndex: 2,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1.5,
        borderColor: '#c4c4c4',
        minWidth: 200,
    },
    popoverOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 12,
    },
    popoverText: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.text,
    },
    popoverDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginHorizontal: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        gap: 8,
    },
    cameraButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#c4c4c4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 2 : 0,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#c4c4c4',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        fontSize: 15,
        color: Colors.text,
        lineHeight: 20,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 1 : 0,
    },
    sendButtonActive: {
        backgroundColor: Colors.accent,
    },
});
