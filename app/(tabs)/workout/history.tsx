import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui';
import { useAuthStore } from '../../../stores';
import { getRecentWorkoutSessions, getSetLogsForSession, getWeeklyStats } from '../../../lib/database';
import { formatDuration, compareWeeks } from '../../../lib/analytics';
import { theme } from '../../../constants/theme';
import type { WorkoutSession, SetLog } from '../../../types';

interface ExpandedSets {
  [sessionId: string]: { [exerciseId: string]: SetLog[] } | 'loading';
}

export default function WorkoutHistoryScreen() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSets, setExpandedSets] = useState<ExpandedSets>({});
  const [weekComparison, setWeekComparison] = useState<{
    thisWeek: { sessions: number; volume: number; duration: number };
    lastWeek: { sessions: number; volume: number; duration: number };
    changes: { volumeChange: number; durationChange: number; sessionsChange: number };
  } | null>(null);

  useEffect(() => {
    loadSessions();
    loadWeeklyComparison();
  }, []);

  const loadSessions = async () => {
    if (!user) return;
    const loadedSessions = await getRecentWorkoutSessions(user.id, 50);
    setSessions(loadedSessions);
    setIsLoading(false);
  };

  const loadWeeklyComparison = async () => {
    if (!user) return;
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);

      const thisWeekStats = await getWeeklyStats(user.id, thisWeekStart.toISOString().split('T')[0]);
      const lastWeekStats = await getWeeklyStats(user.id, lastWeekStart.toISOString().split('T')[0]);

      const changes = compareWeeks(thisWeekStats, lastWeekStats);

      setWeekComparison({
        thisWeek: {
          sessions: thisWeekStats.sessions_completed,
          volume: thisWeekStats.total_volume,
          duration: thisWeekStats.total_duration_seconds,
        },
        lastWeek: {
          sessions: lastWeekStats.sessions_completed,
          volume: lastWeekStats.total_volume,
          duration: lastWeekStats.total_duration_seconds,
        },
        changes,
      });
    } catch (e) {
      console.warn('Failed to load weekly comparison:', e);
    }
  };

  const toggleExpand = useCallback(async (sessionId: string) => {
    if (expandedSets[sessionId]) {
      setExpandedSets((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      return;
    }

    setExpandedSets((prev) => ({ ...prev, [sessionId]: 'loading' }));

    try {
      const sets = await getSetLogsForSession(sessionId);
      const grouped: { [exerciseId: string]: SetLog[] } = {};
      for (const s of sets) {
        if (!grouped[s.exercise_id]) grouped[s.exercise_id] = [];
        grouped[s.exercise_id].push(s);
      }
      setExpandedSets((prev) => ({ ...prev, [sessionId]: grouped }));
    } catch (e) {
      console.error('Failed to load session sets:', e);
      setExpandedSets((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }
  }, [expandedSets]);

  const getExerciseName = (session: WorkoutSession, exerciseId: string): string => {
    const ex = session.template_snapshot.exercises?.find(
      (e) => e.exercise_id === exerciseId
    );
    if (ex?.exercise?.name) return ex.exercise.name;
    // Fallback: check if exercise name is stored at the top level of the snapshot entry
    if ((ex as any)?.name) return (ex as any).name;
    return 'Unknown Exercise';
  };

  const renderSession = ({ item }: { item: WorkoutSession }) => {
    const isExpanded = expandedSets[item.id] && expandedSets[item.id] !== 'loading';
    const isLoadingSets = expandedSets[item.id] === 'loading';
    const groupedSets = isExpanded ? expandedSets[item.id] as { [exerciseId: string]: SetLog[] } : null;

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpand(item.id)}>
        <Card style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionName}>{item.template_snapshot.name}</Text>
              <Text style={styles.sessionDate}>{formatDate(item.started_at)}</Text>
            </View>
            <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
          <View style={styles.sessionStats}>
            {item.duration_seconds != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDuration(item.duration_seconds)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {item.template_snapshot.exercises?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            {item.rating != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{item.rating}/5</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            )}
          </View>
          {!item.completed_at && (
            <View style={styles.incompleteBadge}>
              <Text style={styles.incompleteBadgeText}>Incomplete</Text>
            </View>
          )}

          {/* Expanded set details */}
          {isLoadingSets && (
            <View style={styles.expandedLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
          {groupedSets && (
            <View style={styles.expandedSection}>
              {Object.entries(groupedSets).map(([exerciseId, sets]) => (
                <View key={exerciseId} style={styles.exerciseGroup}>
                  <Text style={styles.exerciseGroupName}>
                    {getExerciseName(item, exerciseId)}
                  </Text>
                  {sets.filter((s) => !s.skipped).map((set, idx) => (
                    <View key={set.id} style={styles.expandedSetRow}>
                      <Text style={styles.expandedSetNumber}>{idx + 1}</Text>
                      <Text style={styles.expandedSetText}>
                        {set.weight} {set.weight_unit} × {set.reps}
                        {set.rpe ? ` @RPE ${set.rpe}` : ''}
                        {set.is_warmup ? ' (W)' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderWeekComparison = () => {
    if (!weekComparison) return null;

    const changeColor = (val: number) => (val >= 0 ? '#059669' : '#ef4444');
    const changePrefix = (val: number) => (val >= 0 ? '+' : '');

    return (
      <Card style={styles.weekCard}>
        <Text style={styles.weekTitle}>This Week vs Last Week</Text>
        <View style={styles.weekStats}>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{weekComparison.thisWeek.sessions}</Text>
            <Text style={styles.weekStatLabel}>Sessions</Text>
            <Text style={[styles.weekChange, { color: changeColor(weekComparison.changes.sessionsChange) }]}>
              {changePrefix(weekComparison.changes.sessionsChange)}{weekComparison.changes.sessionsChange}%
            </Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>
              {weekComparison.thisWeek.volume >= 1000
                ? `${(weekComparison.thisWeek.volume / 1000).toFixed(1)}k`
                : weekComparison.thisWeek.volume}
            </Text>
            <Text style={styles.weekStatLabel}>Volume (kg)</Text>
            <Text style={[styles.weekChange, { color: changeColor(weekComparison.changes.volumeChange) }]}>
              {changePrefix(weekComparison.changes.volumeChange)}{weekComparison.changes.volumeChange}%
            </Text>
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>
              {formatDuration(weekComparison.thisWeek.duration)}
            </Text>
            <Text style={styles.weekStatLabel}>Time</Text>
            <Text style={[styles.weekChange, { color: changeColor(weekComparison.changes.durationChange) }]}>
              {changePrefix(weekComparison.changes.durationChange)}{weekComparison.changes.durationChange}%
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderWeekComparison}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>
              Start your first workout to see it here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  list: {
    padding: theme.spacing.md,
  },
  sessionCard: {
    marginBottom: theme.spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sessionDate: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  incompleteBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  incompleteBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  expandedLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    gap: 12,
  },
  exerciseGroup: {
    gap: 4,
  },
  exerciseGroupName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  expandedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  expandedSetNumber: {
    width: 18,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  expandedSetText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  // Week comparison card
  weekCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekStat: {
    alignItems: 'center',
    flex: 1,
  },
  weekStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  weekStatLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  weekChange: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
