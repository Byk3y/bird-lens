import * as Haptics from 'expo-haptics';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'Confirm',
    cancelText,
    isDestructive = false,
    isLoading = false,
}) => {
    const handleCancel = () => {
        if (isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const handleConfirm = () => {
        if (isLoading) return;
        Haptics.impactAsync(
            isDestructive
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light
        );
        onConfirm();
    };

    return (
        <AnimatePresence>
            {visible && (
                <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'timing', duration: 250 }}
                        style={StyleSheet.absoluteFill}
                    >
                        <Pressable
                            style={styles.backdrop}
                            onPress={handleCancel}
                            disabled={isLoading}
                        />
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'timing', duration: 200 }}
                        style={styles.alertContainer}
                    >
                        <View style={styles.content}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.message}>{message}</Text>
                        </View>

                        <View style={styles.actions}>
                            {cancelText && (
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={handleCancel}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.cancelText}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.confirmButton,
                                    !cancelText && styles.fullWidthButton
                                ]}
                                onPress={handleConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={isDestructive ? '#FF3B30' : '#007AFF'} />
                                ) : (
                                    <Text style={[
                                        styles.confirmText,
                                        isDestructive && styles.destructiveText
                                    ]}>
                                        {confirmText}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            )}
        </AnimatePresence>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    alertContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        maxWidth: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E5E5',
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F2F2F7',
    },
    confirmButton: {
        backgroundColor: '#F2F2F7',
    },
    fullWidthButton: {
        backgroundColor: '#F2F2F7',
    },
    cancelText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
    confirmText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
    destructiveText: {
        color: '#FF3B30',
    },
});
