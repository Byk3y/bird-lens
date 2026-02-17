import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface ActionSheetOption {
    label: string;
    onPress: () => void;
    isDestructive?: boolean;
}

interface CustomActionSheetProps {
    visible: boolean;
    onClose: () => void;
    options: ActionSheetOption[];
    title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomActionSheet: React.FC<CustomActionSheetProps> = ({
    visible,
    onClose,
    options,
    title,
}) => {
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
                            transition={{ type: 'timing', duration: 250 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <Pressable style={styles.backdrop} onPress={onClose} />
                        </MotiView>

                        <MotiView
                            from={{ translateY: 400 }}
                            animate={{ translateY: 0 }}
                            exit={{ translateY: 400 }}
                            transition={{
                                type: 'timing',
                                duration: 300,
                            }}
                            style={styles.sheetContainer}
                        >
                            <View style={styles.optionsBlock}>
                                {title && (
                                    <View style={styles.titleContainer}>
                                        <Text style={styles.titleText}>{title}</Text>
                                    </View>
                                )}
                                {options.map((option, index) => (
                                    <View key={index}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.optionButton,
                                                pressed && styles.pressedOption
                                            ]}
                                            onPress={() => {
                                                option.onPress();
                                                onClose();
                                            }}
                                        >
                                            <Text style={[
                                                styles.optionText,
                                                option.isDestructive && styles.destructiveText
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                        {index < options.length - 1 && <View style={styles.separator} />}
                                    </View>
                                ))}
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.cancelButton,
                                    pressed && styles.pressedOption
                                ]}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                        </MotiView>
                    </View>
                )}
            </AnimatePresence>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        paddingHorizontal: 10,
        paddingBottom: 40,
        width: '100%',
    },
    optionsBlock: {
        backgroundColor: '#F2F2F2',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 8,
    },
    titleContainer: {
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#A7A7A7',
    },
    titleText: {
        fontSize: 13,
        color: '#8e8e93',
        fontWeight: '600',
    },
    optionButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressedOption: {
        backgroundColor: '#E5E5E5',
    },
    optionText: {
        fontSize: 19,
        color: '#007AFF',
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    destructiveText: {
        color: '#FF3B30',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#D1D1D6',
        width: '100%',
    },
    cancelButton: {
        height: 56,
        backgroundColor: 'white',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 19,
        color: '#007AFF',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
