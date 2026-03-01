import { useAuth } from '@/lib/auth';
import { submitFeedback } from '@/lib/feedback';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronLeft, Edit3, FileWarning, Heart, ScanEye } from 'lucide-react-native';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
    sectionContext?: string | null;
    activeMediaUrl?: string | null;
}

export const ResultActionBottomSheet: React.FC<ResultActionBottomSheetProps> = ({
    visible,
    onClose,
    bird,
    sectionContext,
    activeMediaUrl,
}) => {
    const { user } = useAuth();
    const [view, setView] = React.useState<ViewState>('menu');
    const [formType, setFormType] = React.useState<FormType>(null);
    const [feedbackText, setFeedbackText] = React.useState('');
    const [submittingType, setSubmittingType] = React.useState<'like' | 'incorrect_id' | 'form' | null>(null);
    const isSubmitting = !!submittingType;

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

    const handleQuickAction = async (type: 'like' | 'incorrect_id') => {
        setSubmittingType(type);
        try {
            await submitFeedback({
                user_id: user?.id,
                scientific_name: bird.scientific_name,
                feedback_type: type,
                section_context: sectionContext,
                media_url: activeMediaUrl,
                app_metadata: {
                    confidence: bird.confidence,
                }
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setView('success');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            // Error handled in utility, could show local error if needed
        } finally {
            setSubmittingType(null);
        }
    };

    const handleOpenForm = (type: FormType) => {
        setFormType(type);
        setView('form');
    };

    const handleSubmitForm = async () => {
        if (!feedbackText.trim() || isSubmitting) return;

        setSubmittingType('form');
        try {
            await submitFeedback({
                user_id: user?.id,
                scientific_name: bird.scientific_name,
                feedback_type: formType === 'error' ? 'content_error' : 'suggestion',
                section_context: sectionContext,
                user_message: feedbackText.trim(),
                media_url: activeMediaUrl,
                app_metadata: {
                    confidence: bird.confidence,
                }
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setView('success');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            // Error handling
        } finally {
            setSubmittingType(null);
        }
    };

    const getPlaceholder = () => {
        if (formType === 'suggestion') return 'Help us make BirdMark better...';
        if (sectionContext) {
            return `What is wrong with the ${sectionContext.toLowerCase()} section?`;
        }
        return 'Please describe the issue...';
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
                            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                style={styles.backdrop}
                                activeOpacity={1}
                                onPress={onClose}
                            />
                        </MotiView>

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.keyboardAvoidingView}
                            pointerEvents="box-none"
                        >
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
                                            <TouchableOpacity
                                                style={styles.optionRow}
                                                onPress={() => handleQuickAction('like')}
                                                disabled={isSubmitting}
                                            >
                                                <View pointerEvents="none">
                                                    <Heart size={24} color={Colors.text} strokeWidth={1.5} />
                                                </View>
                                                <View style={styles.optionContent}>
                                                    <Text style={styles.optionTitle}>I Like This Content</Text>
                                                </View>
                                                {submittingType === 'like' && <ActivityIndicator size="small" color={Colors.textTertiary} />}
                                            </TouchableOpacity>

                                            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                style={styles.optionRow}
                                                onPress={() => handleOpenForm('error')}
                                                disabled={isSubmitting}
                                            >
                                                <View pointerEvents="none">
                                                    <FileWarning size={24} color={Colors.text} strokeWidth={1.5} />
                                                </View>
                                                <View style={styles.optionContent}>
                                                    <Text style={styles.optionTitle}>Error in Content</Text>
                                                    <Text style={styles.optionSubtitle}>Poor content, errors, etc.</Text>
                                                </View>
                                                <Text style={styles.chevron}>›</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                style={styles.optionRow}
                                                onPress={() => handleQuickAction('incorrect_id')}
                                                disabled={isSubmitting}
                                            >
                                                <View pointerEvents="none">
                                                    <ScanEye size={24} color={Colors.text} strokeWidth={1.5} />
                                                </View>
                                                <View style={styles.optionContent}>
                                                    <Text style={styles.optionTitle}>Incorrect Identification</Text>
                                                </View>
                                                {submittingType === 'incorrect_id' && <ActivityIndicator size="small" color={Colors.textTertiary} />}
                                            </TouchableOpacity>

                                            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} style={styles.optionRow} onPress={() => handleOpenForm('suggestion')}>
                                                <View pointerEvents="none">
                                                    <Edit3 size={24} color={Colors.text} strokeWidth={1.5} />
                                                </View>
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
                                                <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} onPress={() => setView('menu')} style={styles.backButton}>
                                                    <View pointerEvents="none">
                                                        <ChevronLeft size={24} color={Colors.text} />
                                                    </View>
                                                </TouchableOpacity>
                                                <Text style={styles.formTitle}>
                                                    {formType === 'error' ? 'Error in Content' : 'Suggestions'}
                                                </Text>
                                                <View style={{ width: 24 }} />
                                            </View>

                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder={getPlaceholder()}
                                                    placeholderTextColor={Colors.textTertiary}
                                                    multiline
                                                    textAlignVertical="top"
                                                    value={feedbackText}
                                                    onChangeText={setFeedbackText}
                                                    editable={!isSubmitting}
                                                />
                                            </View>

                                            <TouchableOpacity disabled={!feedbackText.trim() || isSubmitting} onPress={handleSubmitForm}>
                                                <LinearGradient
                                                    colors={(feedbackText.trim() && !isSubmitting) ? [Colors.primary, Colors.accent] : ['#E2E8F0', '#E2E8F0']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.submitButton}
                                                >
                                                    {submittingType === 'form' ? (
                                                        <ActivityIndicator color={Colors.white} />
                                                    ) : (
                                                        <Text style={[styles.submitButtonText, !feedbackText.trim() && { color: Colors.textTertiary }]}>Submit</Text>
                                                    )}
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
                                            <View pointerEvents="none">
                                                <CheckCircle2 size={64} color={Colors.success} strokeWidth={1.5} />
                                            </View>
                                            <Text style={styles.successTitle}>Thank You!</Text>
                                            <Text style={styles.successSubtitle}>Your feedback helps us improve BirdMark.</Text>
                                        </MotiView>
                                    )}

                                </View>
                            </MotiView>
                        </KeyboardAvoidingView>
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
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        width: '100%',
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
