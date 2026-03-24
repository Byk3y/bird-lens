import { Colors, Spacing, Typography } from '@/constants/theme';
import { DraftSighting } from '@/lib/draftSighting';
import { Image } from 'expo-image';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraftSightingPromptProps {
    visible: boolean;
    draft: DraftSighting;
    onSave: () => void;
    onDiscard: () => void;
    isSaving: boolean;
    onModalClosed?: () => void;
}

export const DraftSightingPrompt: React.FC<DraftSightingPromptProps> = ({
    visible,
    draft,
    onSave,
    onDiscard,
    isSaving,
    onModalClosed,
}) => {
    const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
    const wasVisible = React.useRef(false);

    React.useEffect(() => {
        if (wasVisible.current && !visible) {
            setIsAnimatingOut(true);
            const timer = setTimeout(() => {
                setIsAnimatingOut(false);
                onModalClosed?.();
            }, 350);
            return () => clearTimeout(timer);
        }
        wasVisible.current = visible;
    }, [visible]);

    const heroImage = (() => {
        const bird = draft.bird;
        const heroFromMap = draft.heroImages[bird.scientific_name];
        return heroFromMap
            || bird.inat_photos?.[0]?.url
            || bird.male_image_url
            || bird.wikipedia_image
            || null;
    })();

    const confidence = Math.round((draft.bird.confidence || 0) * 100);

    return (
        <Modal
            visible={visible || isAnimatingOut}
            transparent
            animationType="none"
            onRequestClose={onDiscard}
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
                                onPress={onDiscard}
                                disabled={isSaving}
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
                                <View style={styles.handle} />

                                <View style={styles.content}>
                                    {/* Bird info row */}
                                    <View style={styles.birdRow}>
                                        {heroImage ? (
                                            <Image
                                                source={{ uri: heroImage }}
                                                style={styles.thumbnail}
                                                contentFit="cover"
                                                transition={200}
                                            />
                                        ) : (
                                            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                                                <Text style={styles.placeholderEmoji}>🐦</Text>
                                            </View>
                                        )}
                                        <View style={styles.birdInfo}>
                                            <Text style={styles.title}>Unsaved Identification</Text>
                                            <Text style={styles.species} numberOfLines={1}>
                                                {draft.bird.name}
                                            </Text>
                                            {confidence > 0 && (
                                                <Text style={styles.confidence}>{confidence}% match</Text>
                                            )}
                                        </View>
                                    </View>

                                    <Text style={styles.message}>
                                        You identified this bird but didn't save it. Add it to your collection?
                                    </Text>

                                    {/* Actions */}
                                    <TouchableOpacity
                                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                        onPress={onSave}
                                        disabled={isSaving}
                                        activeOpacity={0.8}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color={Colors.white} />
                                        ) : (
                                            <Text style={styles.saveButtonText}>Add to Collection</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.discardButton}
                                        onPress={onDiscard}
                                        disabled={isSaving}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={styles.discardButtonText}>Discard</Text>
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
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginTop: 12,
        marginBottom: 8,
    },
    content: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    birdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: Colors.surfaceLight,
    },
    thumbnailPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 28,
    },
    birdInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    title: {
        ...Typography.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    species: {
        ...Typography.h3,
        color: Colors.text,
    },
    confidence: {
        ...Typography.caption,
        color: Colors.success,
        marginTop: 2,
    },
    message: {
        ...Typography.body,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
    discardButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    discardButtonText: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
});
