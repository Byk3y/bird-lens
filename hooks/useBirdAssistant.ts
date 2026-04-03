import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseNDJSONLine } from '@/lib/utils';
import { fetch } from 'expo/fetch';
import { useCallback, useEffect, useRef, useState } from 'react';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const STORAGE_KEY = '@owlbert_chat_history';
const MAX_STORED_MESSAGES = 100;
const MAX_CONTEXT_MESSAGES = 20;

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    feedback?: 'up' | 'down' | null;
    suggestions?: string[];
}

/** Parse the SUGGESTIONS: line from the end of Owlbert's response */
function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
    const lines = content.trimEnd().split('\n');
    const lastLine = lines[lines.length - 1];

    if (lastLine.startsWith('SUGGESTIONS:')) {
        const suggestions = lastLine
            .replace('SUGGESTIONS:', '')
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        const cleanContent = lines.slice(0, -1).join('\n').trimEnd();
        return { cleanContent, suggestions };
    }

    return { cleanContent: content, suggestions: [] };
}

interface UseBirdAssistantReturn {
    messages: ChatMessage[];
    isStreaming: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    submitFeedback: (messageId: string, feedback: 'up' | 'down') => void;
}

export function useBirdAssistant(): UseBirdAssistantReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Abort any in-flight request on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    // Load chat history on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as ChatMessage[];
                    setMessages(parsed);
                } catch {
                    console.warn('[useBirdAssistant] Failed to parse stored chat history');
                }
            }
        });
    }, []);

    // Persist messages to AsyncStorage
    const persistMessages = useCallback(async (msgs: ChatMessage[]) => {
        // Cap stored messages
        const toStore = msgs.slice(-MAX_STORED_MESSAGES);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (err) {
            console.error('[useBirdAssistant] Failed to persist messages:', err);
        }
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isStreaming) return;

        setError(null);

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
        };

        const assistantPlaceholder: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
        };

        // Add user message + assistant placeholder
        const updatedWithUser = [...messages, userMessage, assistantPlaceholder];
        setMessages(updatedWithUser);
        setIsStreaming(true);

        // Abort any previous request
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Build context: only send role + content for the API
            const contextMessages = [...messages, userMessage]
                .slice(-MAX_CONTEXT_MESSAGES)
                .map((m) => ({ role: m.role, content: m.content }));

            const url = `${SUPABASE_URL}/functions/v1/bird-assistant`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'x-client-info': 'supabase-js-expo',
                },
                signal: controller.signal,
                body: JSON.stringify({ messages: contextMessages }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Request failed with status ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body to read');

            const decoder = new TextDecoder();
            let buffer = '';
            let assistantContent = '';

            while (true) {
                if (controller.signal.aborted) break;

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const chunk = parseNDJSONLine(line);
                    if (!chunk) continue;

                    switch (chunk.type) {
                        case 'message': {
                            assistantContent = chunk.content;
                            const { cleanContent, suggestions } = parseSuggestions(assistantContent);
                            setMessages((prev) => {
                                const updated = [...prev];
                                const lastIdx = updated.length - 1;
                                if (updated[lastIdx]?.role === 'assistant') {
                                    updated[lastIdx] = {
                                        ...updated[lastIdx],
                                        content: cleanContent,
                                        suggestions: suggestions.length > 0 ? suggestions : undefined,
                                        timestamp: Date.now(),
                                    };
                                }
                                return updated;
                            });
                            break;
                        }

                        case 'error':
                            setError(chunk.message);
                            // Remove the empty placeholder
                            setMessages((prev) => {
                                const updated = [...prev];
                                const lastIdx = updated.length - 1;
                                if (updated[lastIdx]?.role === 'assistant' && !updated[lastIdx].content) {
                                    updated.pop();
                                }
                                return updated;
                            });
                            break;

                        case 'done':
                            break;
                    }
                }
            }

            // Handle remaining buffer
            if (buffer.trim()) {
                const chunk = parseNDJSONLine(buffer);
                if (chunk?.type === 'message') {
                    assistantContent = chunk.content;
                    const { cleanContent, suggestions } = parseSuggestions(assistantContent);
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (updated[lastIdx]?.role === 'assistant') {
                            updated[lastIdx] = {
                                ...updated[lastIdx],
                                content: cleanContent,
                                suggestions: suggestions.length > 0 ? suggestions : undefined,
                                timestamp: Date.now(),
                            };
                        }
                        return updated;
                    });
                }
            }

            reader.releaseLock();

            // Persist final messages
            setMessages((prev) => {
                // Remove placeholder if still empty (edge case)
                const final = prev.filter((m) => !(m.role === 'assistant' && !m.content));
                persistMessages(final);
                return final;
            });
        } catch (err: any) {
            if (err.name === 'AbortError') return;

            console.error('[useBirdAssistant] Send error:', err);
            setError(err.message || 'Failed to get a response from Owlbert');

            // Remove empty placeholder
            setMessages((prev) => {
                const updated = prev.filter((m) => !(m.role === 'assistant' && !m.content));
                persistMessages(updated);
                return updated;
            });
        } finally {
            setIsStreaming(false);
        }
    }, [messages, isStreaming, persistMessages]);

    const clearHistory = useCallback(async () => {
        setMessages([]);
        setError(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
    }, []);

    const submitFeedback = useCallback((messageId: string, feedback: 'up' | 'down') => {
        setMessages((prev) => {
            const updated = prev.map((m) =>
                m.id === messageId
                    ? { ...m, feedback: m.feedback === feedback ? null : feedback }
                    : m
            );
            persistMessages(updated);
            return updated;
        });
    }, [persistMessages]);

    return {
        messages,
        isStreaming,
        error,
        sendMessage,
        clearHistory,
        submitFeedback,
    };
}
