import { Colors, Typography } from '@/constants/theme';
import { ChatMessage } from '@/hooks/useBirdAssistant';
import { ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OwlAvatar } from './OwlAvatar';

interface ChatBubbleProps {
    message: ChatMessage;
    onFeedback?: (messageId: string, feedback: 'up' | 'down') => void;
}

/**
 * Parses simple markdown bold (**text**) and italic (*text*) into
 * React Native Text elements with appropriate styling.
 */
function renderFormattedText(text: string, isUser: boolean) {
    const parts: React.ReactNode[] = [];
    // Match **bold** first, then *italic* (require word char after opening and before closing *)
    const regex = /\*\*(.+?)\*\*|\*([^*\n]+?)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            // Add plain text before match, stripping any stray asterisks
            parts.push(text.slice(lastIndex, match.index).replace(/\*/g, ''));
        }

        if (match[1]) {
            // **bold**
            parts.push(
                <Text key={key++} style={{ fontWeight: '700' }}>
                    {match[1]}
                </Text>
            );
        } else if (match[2]) {
            // *italic*
            parts.push(
                <Text key={key++} style={{ fontStyle: 'italic' }}>
                    {match[2]}
                </Text>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        // Strip any remaining stray asterisks from trailing text
        parts.push(text.slice(lastIndex).replace(/\*/g, ''));
    }

    return (
        <Text style={[styles.messageText, isUser && styles.userText]}>
            {parts}
        </Text>
    );
}

function TypingIndicator() {
    return (
        <View style={styles.typingRow}>
            {[0, 1, 2].map((i) => (
                <MotiView
                    key={i}
                    from={{ opacity: 0.3, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        type: 'timing',
                        duration: 500,
                        delay: i * 200,
                        loop: true,
                    }}
                    style={styles.typingDot}
                />
            ))}
        </View>
    );
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatBubble({ message, onFeedback }: ChatBubbleProps) {
    const isUser = message.role === 'user';
    const isTyping = message.role === 'assistant' && !message.content;

    return (
        <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
            {!isUser && (
                <View style={styles.avatarWrapper}>
                    <OwlAvatar size={28} />
                </View>
            )}

            <View style={[styles.bubbleColumn, !isUser && styles.assistantBubbleColumn]}>
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                    {isTyping ? (
                        <TypingIndicator />
                    ) : (
                        <>
                            {renderFormattedText(message.content, isUser)}
                            {/* Timestamp inside bubble, bottom-right */}
                            <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                                {formatTime(message.timestamp)}
                            </Text>
                        </>
                    )}
                </View>

                {/* Feedback buttons on their own row below the bubble */}
                {!isUser && !isTyping && onFeedback && (
                    <View style={styles.feedbackRow}>
                        <TouchableOpacity
                            onPress={() => onFeedback(message.id, 'up')}
                            hitSlop={12}
                            style={styles.feedbackButton}
                        >
                            <ThumbsUp
                                size={16}
                                color={message.feedback === 'up' ? Colors.primary : Colors.textTertiary}
                                fill={message.feedback === 'up' ? Colors.primary : 'none'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onFeedback(message.id, 'down')}
                            hitSlop={12}
                            style={styles.feedbackButton}
                        >
                            <ThumbsDown
                                size={16}
                                color={message.feedback === 'down' ? Colors.error : Colors.textTertiary}
                                fill={message.feedback === 'down' ? Colors.error : 'none'}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    userContainer: {
        justifyContent: 'flex-end',
    },
    assistantContainer: {
        justifyContent: 'flex-start',
    },
    avatarWrapper: {
        marginRight: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    bubbleColumn: {
        maxWidth: '75%',
    },
    assistantBubbleColumn: {
        maxWidth: '85%',
    },
    bubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 6,
    },
    userBubble: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: Colors.white,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    messageText: {
        ...Typography.body,
        fontSize: 15,
        lineHeight: 22,
        color: Colors.text,
    },
    userText: {
        color: Colors.white,
    },
    timestamp: {
        ...Typography.caption,
        fontSize: 11,
        color: Colors.textTertiary,
        textAlign: 'right',
        marginTop: 4,
    },
    timestampUser: {
        color: 'rgba(255,255,255,0.7)',
    },
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginLeft: 4,
        gap: 14,
    },
    feedbackButton: {
        padding: 4,
    },
    typingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.textTertiary,
    },
});
