import { Colors, Typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SuggestionChipsProps {
    suggestions: string[];
    onSelect: (text: string) => void;
    disabled?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
    if (suggestions.length === 0) return null;

    return (
        <View style={styles.container}>
            {suggestions.map((suggestion) => (
                <TouchableOpacity
                    key={suggestion}
                    style={styles.chip}
                    onPress={() => onSelect(suggestion)}
                    activeOpacity={0.7}
                    disabled={disabled}
                >
                    <Text style={styles.chipText}>{suggestion}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 10,
    },
    chip: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#c4c4c4',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    chipText: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.text,
    },
});
