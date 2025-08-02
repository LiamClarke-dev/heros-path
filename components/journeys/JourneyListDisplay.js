/**
 * JourneyListDisplay - Main component for displaying journey list
 * 
 * Single Responsibility: Journey list rendering and interaction handling
 * Requirements: 3.1, 3.2
 */

import React, { useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StyleSheet
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JourneyListItem } from './JourneyListItem';
import { JourneyListHeader } from './JourneyListHeader';
import { JourneyListEmpty } from './JourneyListEmpty';
import { JourneyListError } from './JourneyListError';
import LoadingSpinner from '../ui/LoadingSpinner';

export const JourneyListDisplay = React.memo(({
    journeys,
    loading,
    refreshing,
    error,
    sortBy,
    sortOrder,
    refreshJourneys,
    deleteJourney,
    updateSort,
    getJourneyCompletionStatus,
    formatJourneyMetadata,
    hasJourneys,
    isEmpty,
    onNavigateToDiscoveries,
}) => {
    const { theme } = useTheme();

    /**
     * Handle journey item press - navigate to discoveries
     */
    const handleJourneyPress = useCallback((journey) => {
        // Navigate to discoveries screen with journey context
        // Using React Navigation's navigate function
        // This will be handled by the parent screen's navigation prop
        if (onNavigateToDiscoveries) {
            onNavigateToDiscoveries(journey);
        } else {
            console.log('Navigate to journey discoveries:', journey.id);
        }
    }, [onNavigateToDiscoveries]);

    /**
     * Handle journey deletion
     */
    const handleDeleteJourney = useCallback(async (journeyId) => {
        const success = await deleteJourney(journeyId);
        if (success) {
            console.log('Journey deleted successfully');
        }
    }, [deleteJourney]);

    /**
     * Render journey list item
     */
    const renderJourneyItem = useCallback(({ item: journey }) => {
        const metadata = formatJourneyMetadata(journey);
        const completionStatus = getJourneyCompletionStatus(journey);

        return (
            <JourneyListItem
                journey={journey}
                metadata={metadata}
                completionStatus={completionStatus}
                onPress={() => handleJourneyPress(journey)}
                onDelete={() => handleDeleteJourney(journey.id)}
            />
        );
    }, [formatJourneyMetadata, getJourneyCompletionStatus, handleJourneyPress, handleDeleteJourney]);

    /**
     * Get item key for FlatList
     */
    const getItemKey = useCallback((item) => item.id, []);

    // Show loading spinner on initial load
    if (loading && !refreshing) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <LoadingSpinner size="large" />
            </View>
        );
    }

    // Show error state
    if (error && !refreshing) {
        return (
            <JourneyListError
                error={error}
                onRetry={refreshJourneys}
            />
        );
    }

    // Show empty state
    if (isEmpty) {
        return <JourneyListEmpty />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <FlatList
                data={journeys}
                renderItem={renderJourneyItem}
                keyExtractor={getItemKey}
                testID="journey-list"
                ListHeaderComponent={
                    <JourneyListHeader
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortChange={updateSort}
                        journeyCount={journeys.length}
                    />
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshJourneys}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                    length: 120, // Approximate item height
                    offset: 120 * index,
                    index,
                })}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
});

JourneyListDisplay.displayName = 'JourneyListDisplay';