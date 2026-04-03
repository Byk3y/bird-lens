import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { OwlAvatar } from '@/components/chat/OwlAvatar';
import { SuggestionChips } from '@/components/chat/SuggestionChips';
import { Colors, Typography } from '@/constants/theme';
import { useBirdAssistant } from '@/hooks/useBirdAssistant';
import { useChatGating } from '@/hooks/useChatGating';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WELCOME_POOL = [
    'How to get rid of pigeons',
    'What do barn owls eat',
    'What is the largest bird species?',
    'How long do cockatiels live',
    'What is the purpose of bird migration?',
    'How to attract hummingbirds',
    'What bird sings at night?',
    'Best beginner birding binoculars?',
    'Why do flamingos stand on one leg?',
    'What birds can mimic human speech?',
    'How do birds navigate during migration?',
    'What is the fastest bird?',
    'How to build a birdhouse',
    'Why do woodpeckers peck?',
    'What birds are in my area right now?',
];

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant' as const,
    content: "Hi, I'm Owlbert, your friendly bird expert. Ask me anything about birds, or browse the frequently asked questions below for inspiration.",
    timestamp: Date.now(),
};

export default function BirdAssistantScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const { isPro } = useAuth();
    const { messages, isStreaming, error, sendMessage, clearHistory, submitFeedback } =
        useBirdAssistant();
    const { isGated, remainingCredits, isLoading: isGatingLoading, incrementCount } =
        useChatGating();

    const handleSend = useCallback(
        async (text: string) => {
            if (isGated) {
                router.push('/paywall');
                return;
            }
            // Increment count for free users BEFORE sending (reserves the credit)
            if (!isPro) {
                await incrementCount();
            }
            await sendMessage(text);
        },
        [isGated, sendMessage, isPro, incrementCount, router]
    );

    const handleSuggestion = useCallback(
        (text: string) => {
            handleSend(text);
        },
        [handleSend]
    );

    const handleClearHistory = useCallback(() => {
        Alert.alert(
            'Clear conversation',
            'Are you sure you want to clear your chat with Owlbert?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => clearHistory(),
                },
            ]
        );
    }, [clearHistory]);

    const hasMessages = messages.length > 0;

    // Randomize 5 welcome suggestions (stable until remount)
    const welcomeSuggestions = useMemo(() => {
        const shuffled = [...WELCOME_POOL].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 5);
    }, []);

    // Extract suggestions from the last assistant message
    const lastAssistantSuggestions = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant' && messages[i].suggestions?.length) {
                return messages[i].suggestions!;
            }
        }
        return [];
    }, [messages]);

    // Reverse messages for inverted FlatList (newest first)
    const displayMessages = useMemo(() => {
        if (hasMessages) return [...messages].reverse();
        return [WELCOME_MESSAGE];
    }, [hasMessages, messages]);

    // Determine which suggestions to show in the footer
    const footerSuggestions = hasMessages ? lastAssistantSuggestions : welcomeSuggestions;

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <OwlAvatar size={24} />
                    <Text style={styles.headerTitle}>Owlbert</Text>
                </View>

                {hasMessages ? (
                    <TouchableOpacity onPress={handleClearHistory} hitSlop={12} style={styles.clearButton}>
                        <Trash2 size={18} color={Colors.textTertiary} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.clearButton} />
                )}
            </View>

            {/* Credit badge for free users */}
            {!isPro && !isGatingLoading && (
                <View style={styles.creditBadge}>
                    <Text style={[
                        styles.creditText,
                        remainingCredits <= 3 && styles.creditTextWarning,
                        remainingCredits === 0 && styles.creditTextDanger,
                    ]}>
                        {isGated
                            ? 'No messages left'
                            : `${remainingCredits} of 10 messages left`}
                    </Text>
                </View>
            )}

            {/* Messages (inverted FlatList — newest at bottom, no scroll on open) */}
            <FlatList
                ref={flatListRef}
                data={displayMessages}
                inverted
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ChatBubble
                        message={item}
                        onFeedback={item.id !== 'welcome' ? submitFeedback : undefined}
                    />
                )}
                ListHeaderComponent={
                    !isStreaming && footerSuggestions.length > 0 ? (
                        <SuggestionChips
                            suggestions={footerSuggestions}
                            onSelect={handleSuggestion}
                            disabled={isGated}
                        />
                    ) : null
                }
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
            />

            {/* Error message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={isStreaming || isGated} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        ...Typography.h3,
        fontSize: 18,
        color: Colors.text,
    },
    clearButton: {
        width: 40,
        alignItems: 'flex-end',
    },
    creditBadge: {
        alignItems: 'center',
        paddingVertical: 6,
        backgroundColor: Colors.surfaceLight,
    },
    creditText: {
        ...Typography.caption,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    creditTextWarning: {
        color: '#d97706',
    },
    creditTextDanger: {
        color: Colors.error,
    },
    messageList: {
        paddingTop: 16,
        paddingBottom: 8,
    },
    errorContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 10,
        backgroundColor: '#fef2f2',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        ...Typography.caption,
        color: Colors.error,
        textAlign: 'center',
    },
});
