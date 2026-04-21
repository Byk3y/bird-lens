import { Colors, Spacing, Typography } from '@/constants/theme';
import { analytics, Events } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatePresence, MotiView } from 'moti';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ATTRIBUTION_KEY = '@attribution_survey_completed';

const SOURCES = [
    'App Store Search',
    'Facebook / Instagram',
    'Reddit',
    'YouTube',
    'A friend told me',
    'TikTok',
    'Other',
] as const;

interface AttributionSurveySheetProps {
    visible: boolean;
    onDismiss: () => void;
}

export const AttributionSurveySheet: React.FC<AttributionSurveySheetProps> = ({
    visible,
    onDismiss,
}) => {
    const { user } = useAuth();
    const [selected, setSelected] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const wasVisible = React.useRef(false);

    React.useEffect(() => {
        if (visible && !wasVisible.current) {
            analytics.capture(Events.ATTRIBUTION_SURVEY_SHOWN);
        }
        if (wasVisible.current && !visible) {
            setIsAnimatingOut(true);
            const timer = setTimeout(() => setIsAnimatingOut(false), 350);
            return () => clearTimeout(timer);
        }
        wasVisible.current = visible;
    }, [visible]);

    const dismiss = async () => {
        analytics.capture(Events.ATTRIBUTION_SURVEY_SKIPPED);
        await AsyncStorage.setItem(ATTRIBUTION_KEY, 'true');
        onDismiss();
    };

    const handleSubmit = async () => {
        if (!selected || !user?.id) return;
        setIsSubmitting(true);
        try {
            await supabase.from('attribution_survey').insert({
                user_id: user.id,
                source: selected,
            });
            analytics.capture(Events.ATTRIBUTION_SURVEY_SUBMITTED, { source: selected });
            await AsyncStorage.setItem(ATTRIBUTION_KEY, 'true');
            onDismiss();
        } catch {
            // Still dismiss on error — don't block the user
            await AsyncStorage.setItem(ATTRIBUTION_KEY, 'true');
            onDismiss();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible || isAnimatingOut}
            transparent
            animationType="none"
            onRequestClose={dismiss}
        >
            <AnimatePresence>
                {(visible || isAnimatingOut) && (
                    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents="box-none">
                        {/* Backdrop */}
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
                                onPress={dismiss}
                            />
                        </MotiView>

                        {/* Sheet */}
                        <MotiView
                            from={{ translateY: SCREEN_HEIGHT }}
                            animate={{ translateY: 0 }}
                            exit={{ translateY: SCREEN_HEIGHT }}
                            transition={{ type: 'timing', duration: 350 }}
                            style={styles.sheetContainer}
                        >
                            <View style={styles.sheet}>
                                <View style={styles.content}>
                                    <Text style={styles.headline}>How did you find BirdMark?</Text>
                                    <Text style={styles.subtitle}>
                                        This helps us understand where birders discover us.
                                    </Text>

                                    {/* Options */}
                                    <View
                                        style={styles.optionsList}
                                        accessibilityRole="radiogroup"
                                        accessibilityLabel="How did you find BirdMark"
                                    >
                                        {SOURCES.map((source) => {
                                            const isSelected = selected === source;
                                            return (
                                                <TouchableOpacity
                                                    key={source}
                                                    style={styles.optionRow}
                                                    onPress={() => {
                                                        setSelected(source);
                                                        Haptics.selectionAsync();
                                                    }}
                                                    activeOpacity={0.7}
                                                    accessibilityRole="radio"
                                                    accessibilityState={{ checked: isSelected }}
                                                    accessibilityLabel={source}
                                                >
                                                    <View style={[
                                                        styles.radio,
                                                        isSelected && styles.radioSelected,
                                                    ]}>
                                                        {isSelected && <View style={styles.radioInner} />}
                                                    </View>
                                                    <Text style={[
                                                        styles.optionText,
                                                        isSelected && styles.optionTextSelected,
                                                    ]}>
                                                        {source}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Submit */}
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            (!selected || isSubmitting) && styles.submitButtonDisabled,
                                        ]}
                                        onPress={handleSubmit}
                                        disabled={!selected || isSubmitting}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={isSubmitting ? 'Submitting survey' : 'Submit survey'}
                                        accessibilityState={{ disabled: !selected || isSubmitting }}
                                    >
                                        <Text style={styles.submitButtonText}>
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Skip */}
                                    <TouchableOpacity
                                        style={styles.skipButton}
                                        onPress={dismiss}
                                        activeOpacity={0.6}
                                        accessibilityRole="button"
                                        accessibilityLabel="Skip survey"
                                    >
                                        <Text style={styles.skipButtonText}>Skip</Text>
                                    </TouchableOpacity>
                                </View>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheetContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        pointerEvents: 'box-none',
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 44,
        alignItems: 'center',
    },
    content: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    headline: {
        ...Typography.h2,
        color: Colors.text,
        marginBottom: 6,
    },
    subtitle: {
        ...Typography.body,
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: Spacing.lg,
    },
    optionsList: {
        marginBottom: Spacing.lg,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    radioSelected: {
        borderColor: Colors.secondary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.secondary,
    },
    optionText: {
        ...Typography.body,
        color: Colors.text,
    },
    optionTextSelected: {
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: Colors.secondary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    submitButtonDisabled: {
        opacity: 0.4,
    },
    submitButtonText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        ...Typography.body,
        color: Colors.textTertiary,
    },
});
