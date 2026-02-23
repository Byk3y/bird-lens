import { useShareCard } from '@/hooks/useShareCard';
import { BirdResult } from '@/types/scanner';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { FieldGuideCard } from './FieldGuideCard';
import { MagazineCard, ShareCardData } from './MagazineCard';
import { WildCard } from './WildCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SCALE = (SCREEN_WIDTH - 80) / 1080;
const PREVIEW_SIZE = 1080 * PREVIEW_SCALE;

type TemplateType = 'magazine' | 'wild' | 'fieldguide';

interface ShareCardBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    bird: BirdResult;
    imageUrl?: string;
    locationName?: string;
}

const TEMPLATES: { key: TemplateType; label: string }[] = [
    { key: 'magazine', label: 'Magazine' },
    { key: 'wild', label: 'Wild' },
    { key: 'fieldguide', label: 'Field Guide' },
];

export const ShareCardBottomSheet: React.FC<ShareCardBottomSheetProps> = ({
    visible,
    onClose,
    bird,
    imageUrl,
    locationName,
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('magazine');
    const { viewShotRef, isCapturing, saveToPhotos, shareCard } = useShareCard();

    const cardData: ShareCardData = {
        name: bird.name,
        scientificName: bird.scientific_name,
        familyName: bird.taxonomy?.family || 'Unknown',
        confidence: bird.confidence,
        dateIdentified: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        locationName: locationName,
        imageUrl: imageUrl,
    };

    const renderCardTemplate = (template: TemplateType, scale: number = 1) => {
        const containerStyle = scale < 1
            ? { transform: [{ scale }], width: 1080, height: 1080 }
            : { width: 1080, height: 1080 };

        return (
            <View style={containerStyle}>
                {template === 'magazine' && <MagazineCard data={cardData} />}
                {template === 'wild' && <WildCard data={cardData} />}
                {template === 'fieldguide' && <FieldGuideCard data={cardData} />}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.sheet}>
                    {/* Handle */}
                    <View style={styles.handleRow}>
                        <View style={styles.handle} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Share your sighting</Text>

                    {/* Template Previews */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.previewScroll}
                        snapToInterval={PREVIEW_SIZE + 16}
                        decelerationRate="fast"
                    >
                        {TEMPLATES.map((tmpl) => (
                            <TouchableOpacity
                                key={tmpl.key}
                                onPress={() => setSelectedTemplate(tmpl.key)}
                                activeOpacity={0.85}
                            >
                                <View
                                    style={[
                                        styles.previewCard,
                                        selectedTemplate === tmpl.key && styles.previewCardSelected,
                                    ]}
                                >
                                    <View style={styles.previewInner}>
                                        {renderCardTemplate(tmpl.key, PREVIEW_SCALE)}
                                    </View>
                                </View>
                                <Text
                                    style={[
                                        styles.templateLabel,
                                        selectedTemplate === tmpl.key && styles.templateLabelSelected,
                                    ]}
                                >
                                    {tmpl.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={saveToPhotos}
                            disabled={isCapturing}
                        >
                            {isCapturing ? (
                                <ActivityIndicator size="small" color="#F97316" />
                            ) : (
                                <Text style={styles.secondaryBtnText}>Save to Photos</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={shareCard}
                            disabled={isCapturing}
                        >
                            {isCapturing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Share</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Off-screen full-size card for capture */}
            <View style={styles.offscreen} pointerEvents="none">
                <ViewShot
                    ref={viewShotRef}
                    options={{
                        format: 'png',
                        quality: 1,
                        width: 1080,
                        height: 1080,
                    }}
                >
                    {renderCardTemplate(selectedTemplate, 1)}
                </ViewShot>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 44,
        maxHeight: '85%',
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1a1a1a',
        paddingHorizontal: 24,
        marginBottom: 16,
        letterSpacing: -0.3,
    },
    previewScroll: {
        paddingHorizontal: 24,
        paddingBottom: 8,
        gap: 16,
    },
    previewCard: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: 'transparent',
        backgroundColor: '#F5F5F5',
    },
    previewCardSelected: {
        borderColor: '#F97316',
    },
    previewInner: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        overflow: 'hidden',
    },
    templateLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    templateLabelSelected: {
        color: '#F97316',
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#F97316',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F97316',
    },
    primaryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F97316',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    offscreen: {
        position: 'absolute',
        left: -9999,
        top: -9999,
        opacity: 0,
    },
});
