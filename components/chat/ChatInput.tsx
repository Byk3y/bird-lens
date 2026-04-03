import { Colors } from '@/constants/theme';
import { Camera, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputProps {
    onSend: (text: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [text, setText] = useState('');
    const insets = useSafeAreaInsets();
    const hasText = text.trim().length > 0;

    const handleSend = () => {
        if (!hasText || disabled) return;
        onSend(text.trim());
        setText('');
    };

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={styles.cameraButton} disabled>
                <Camera size={20} color={Colors.textTertiary} />
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
                style={[styles.sendButton, hasText && !disabled && styles.sendButtonActive]}
                onPress={handleSend}
                disabled={!hasText || disabled}
            >
                <Send
                    size={18}
                    color={hasText && !disabled ? Colors.white : Colors.textTertiary}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
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
