import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronLeft, Edit3, FileWarning, Heart, ScanEye } from 'lucide-react-native';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ViewState = 'menu' | 'form' | 'success';
type FormType = 'error' | 'suggestion' | null;

interface ResultActionBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    bird: BirdResult;
}

export const ResultActionBottomSheet: React.FC<ResultActionBottomSheetProps> = ({
    visible,
    onClose,
    bird,
}) => {
    const [view, setView] = React.useState<ViewState>('menu');
    const [formType, setFormType] = React.useState<FormType>(null);
    const [feedbackText, setFeedbackText] = React.useState('');

    const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

    // Reset state when closing or opening
    React.useEffect(() => {
        if (!visible) {
            setIsAnimatingOut(true);
            setTimeout(() => {
                setView('menu');
                setFormType(null);
                setFeedbackText('');
                setIsAnimatingOut(false);
            }, 350); // Wait for exit animation
        }
    }, [visible]);

    const handleQuickAction = (type: 'like' | 'incorrect') => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setView('success');
        setTimeout(() => {
            onClose();
        }, 1500); // Close after 1.5s
    };

    const handleOpenForm = (type: FormType) => {
        setFormType(type);
        setView('form');
    };

    const handleSubmitForm = () => {
        if (!feedbackText.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setView('success');
        setTimeout(() => {
            onClose();
        }, 1500);
    };
    return (
        <Modal
            visible={visible || isAnimatingOut}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <AnimatePresence>
                {visible && (
                    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <TouchableOpacity
                                style={styles.backdrop}
                                activeOpacity={1}
                                onPress={onClose}
                            />
                        </MotiView>

                        <MotiView
                            from={{ translateY: SCREEN_HEIGHT }}
                            animate={{ translateY: 0 }}
                            exit={{ translateY: SCREEN_HEIGHT }}
                            transition={{ type: 'timing', duration: 350 }}
                            style={styles.sheetContainer}
                        >
                            <View style={styles.sheet}>
                                {view === 'menu' && (
                                    <MotiView
                                        from={{ opacity: 0, translateX: -20 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        exit={{ opacity: 0, translateX: -20 }}
                                        transition={{ type: 'timing', duration: 250 }}
                                    >
                                        {/* Options */}
                                        <TouchableOpacity style={styles.optionRow} onPress={() => handleQuickAction('like')}>
                                            <Heart size={24} color={Colors.text} strokeWidth={1.5} />
                                            <View style={styles.optionContent}>
                                                <Text style={styles.optionTitle}>I Like This Content</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.optionRow} onPress={() => handleOpenForm('error')}>
                                            <FileWarning size={24} color={Colors.text} strokeWidth={1.5} />
                                            <View style={styles.optionContent}>
                                                <Text style={styles.optionTitle}>Error in Content</Text>
                                                <Text style={styles.optionSubtitle}>Poor content, errors, etc.</Text>
                                            </View>
                                            <Text style={styles.chevron}>›</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.optionRow} onPress={() => handleQuickAction('incorrect')}>
                                            <ScanEye size={24} color={Colors.text} strokeWidth={1.5} />
                                            <View style={styles.optionContent}>
                                                <Text style={styles.optionTitle}>Incorrect Identification</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.optionRow} onPress={() => handleOpenForm('suggestion')}>
                                            <Edit3 size={24} color={Colors.text} strokeWidth={1.5} />
                                            <View style={styles.optionContent}>
                                                <Text style={styles.optionTitle}>Suggestions</Text>
                                                <Text style={styles.optionSubtitle}>Help us make it better</Text>
                                            </View>
                                            <Text style={styles.chevron}>›</Text>
                                        </TouchableOpacity>
                                    </MotiView>
                                )}

                                {view === 'form' && (
                                    <MotiView
                                        from={{ opacity: 0, translateX: 20 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        exit={{ opacity: 0, translateX: 20 }}
                                        transition={{ type: 'timing', duration: 250 }}
                                        style={styles.formContainer}
                                    >
                                        <View style={styles.formHeader}>
                                            <TouchableOpacity onPress={() => setView('menu')} style={styles.backButton}>
                                                <ChevronLeft size={24} color={Colors.text} />
                                            </TouchableOpacity>
                                            <Text style={styles.formTitle}>
                                                {formType === 'error' ? 'Error in Content' : 'Suggestions'}
                                            </Text>
                                            <View style={{ width: 24 }} />
                                        </View>

                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Please describe the issue..."
                                                placeholderTextColor={Colors.textTertiary}
                                                multiline
                                                textAlignVertical="top"
                                                value={feedbackText}
                                                onChangeText={setFeedbackText}
                                                autoFocus
                                            />
                                        </View>

                                        <TouchableOpacity disabled={!feedbackText.trim()} onPress={handleSubmitForm}>
                                            <LinearGradient
                                                colors={feedbackText.trim() ? ['#ECA392', '#F3C79B'] : ['#E2E8F0', '#E2E8F0']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.submitButton}
                                            >
                                                <Text style={[styles.submitButtonText, !feedbackText.trim() && { color: Colors.textTertiary }]}>Submit</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </MotiView>
                                )}

                                {view === 'success' && (
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ type: 'timing', duration: 300 }}
                                        style={styles.successContainer}
                                    >
                                        <CheckCircle2 size={64} color={Colors.success} strokeWidth={1.5} />
                                        <Text style={styles.successTitle}>Thank You!</Text>
                                        <Text style={styles.successSubtitle}>Your feedback helps us improve Bird Lens.</Text>
                                    </MotiView>
                                )}

                            </View>
                        </MotiView>
                    </View>
                )}
            </AnimatePresence>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingBottom: 44,
        paddingHorizontal: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
    },
    optionContent: {
        flex: 1,
        marginLeft: 16,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: -0.3,
    },
    optionSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    chevron: {
        fontSize: 24,
        color: Colors.textTertiary,
        marginLeft: 12,
    },
    formContainer: {
        paddingVertical: 8,
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        padding: 4,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    inputContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        marginBottom: 24,
        minHeight: 140,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    textInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.white,
    },
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        marginTop: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
    }
});
