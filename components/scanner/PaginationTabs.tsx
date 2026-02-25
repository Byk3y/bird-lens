import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { styles } from './IdentificationResult.styles';

interface PaginationTabsProps {
    length: number;
    activeIndex: number;
}

export const PaginationTabs = React.memo(({ length, activeIndex }: PaginationTabsProps) => {
    return (
        <View style={styles.pagination}>
            {Array.from({ length }).map((_, index) => {
                const isActive = index === activeIndex;
                return (
                    <View
                        key={index}
                        style={[
                            styles.tabIndicator,
                            isActive && styles.activeTab
                        ]}
                    >
                        {isActive && (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.white, borderRadius: 12 }]} />
                        )}
                        <Text style={[
                            styles.tabText,
                            isActive && styles.activeTabText
                        ]}>
                            {/* index === length - 1 is the comparison tab which shows '?' */}
                            {index === length - 1 ? '?' : index + 1}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
});
