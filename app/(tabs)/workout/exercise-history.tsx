import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Card } from '../../../components/ui';
import { getExerciseHistory, getExerciseById } from '../../../lib/database';
import { useAuthStore } from '../../../stores';
import { theme } from '../../../constants/theme';
import type { SetLog } from '../../../types';

interface SessionData {
  sessionId: string;
  date: string;
  sets: SetLog[];
  totalVolume: number;
  estimated1RM: number;
}

export default function ExerciseHistoryScreen() {
  const { exerciseId, exerciseName: paramName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
  }>();
  const { user } = useAuthStore();
  const [exerciseName, setExerciseName] = useState(paramName || 'Exercise');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentE1RM, setCurrentE1RM] = useState(0);

  useEffect(() => {
    loadHistory();
  }, [exerciseId]);

  const loadHistory = async () => {
    if (!exerciseId) {
      setIsLoading(false);
      return;
    }

    try {
      if (!paramName) {
        const ex = await getExerciseById(exerciseId);
        if (ex) setExerciseName(ex.name);
      }

      const result = await getExerciseHistory(exerciseId, user?.id, 20);
      setSessions(result.sessions);
      if (result.sessions.length > 0) {
        setCurrentE1RM(result.sessions[0].estimated1RM);
      }
    } catch (e) {
      console.error('Failed to load exercise history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTrendChart = () => {
    if (sessions.length < 2) return null;

    const chartWidth = 320;
    const chartHeight = 120;
    const padding = 20;
    const dataPoints = [...sessions].reverse().slice(-10);

    const e1rms = dataPoints.map((s) => s.estimated1RM);
    const minVal = Math.min(...e1rms) * 0.9;
    const maxVal = Math.max(...e1rms) * 1.1;
    const range = maxVal - minVal || 1;

    const points = dataPoints.map((s, i) => {
      const x = padding + (i / (dataPoints.length - 1)) * (chartWidth - padding * 2);
      const y = padding + (1 - (s.estimated1RM - minVal) / range) * (chartHeight - padding * 2);
      return { x, y };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Estimated 1RM Trend</Text>
        <Text style={styles.chartCurrent}>{currentE1RM} kg</Text>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          <Line
            x1={padding} y1={padding}
            x2={padding} y2={chartHeight - padding}
            stroke="#e2e8f0" strokeWidth={1}
          />
          <Line
            x1={padding} y1={chartHeight - padding}
            x2={chartWidth - padding} y2={chartHeight - padding}
            stroke="#e2e8f0" strokeWidth={1}
          />
          {/* Trend line */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="#4CFCAD"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Data points */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#4CFCAD"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Svg>
      </Card>
    );
  };

  const renderVolumeChart = () => {
    if (sessions.length < 2) return null;

    const chartWidth = 320;
    const chartHeight = 120;
    const padding = 20;
    const dataPoints = [...sessions].reverse().slice(-10);

    const volumes = dataPoints.map((s) => s.totalVolume);
    const minVal = Math.min(...volumes) * 0.9;
    const maxVal = Math.max(...volumes) * 1.1;
    const range = maxVal - minVal || 1;

    const points = dataPoints.map((s, i) => {
      const x = padding + (i / (dataPoints.length - 1)) * (chartWidth - padding * 2);
      const y = padding + (1 - (s.totalVolume - minVal) / range) * (chartHeight - padding * 2);
      return { x, y };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    const latestVolume = sessions[0]?.totalVolume ?? 0;

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Volume Trend</Text>
        <Text style={[styles.chartCurrent, { color: '#4CD0FC' }]}>
          {latestVolume >= 1000 ? `${(latestVolume / 1000).toFixed(1)}k` : latestVolume} kg
        </Text>
        <Svg width={chartWidth} height={chartHeight}>
          <Line
            x1={padding} y1={padding}
            x2={padding} y2={chartHeight - padding}
            stroke="#e2e8f0" strokeWidth={1}
          />
          <Line
            x1={padding} y1={chartHeight - padding}
            x2={chartWidth - padding} y2={chartHeight - padding}
            stroke="#e2e8f0" strokeWidth={1}
          />
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke="#4CD0FC"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#4CD0FC"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Svg>
      </Card>
    );
  };

  const renderSession = ({ item }: { item: SessionData }) => (
    <Card style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
        <View style={styles.sessionStats}>
          <Text style={styles.sessionE1RM}>e1RM: {item.estimated1RM} kg</Text>
          <Text style={styles.sessionVolume}>Vol: {item.totalVolume.toLocaleString()} kg</Text>
        </View>
      </View>
      <View style={styles.setsContainer}>
        {item.sets
          .filter((s) => !s.skipped)
          .map((set, idx) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={styles.setNumber}>{idx + 1}</Text>
              <Text style={styles.setText}>
                {set.weight} {set.weight_unit} × {set.reps}
                {set.rpe ? ` @${set.rpe}` : ''}
                {set.is_warmup ? ' (W)' : ''}
              </Text>
            </View>
          ))}
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.exerciseName}>{exerciseName}</Text>
            {renderTrendChart()}
            {renderVolumeChart()}
            {sessions.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No history yet</Text>
            <Text style={styles.emptySubtext}>
              Complete a workout with this exercise to start tracking your progress
            </Text>
          </Card>
        }
      />
    </SafeAreaView>
  );
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
  list: {
    padding: theme.spacing.md,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 20,
    padding: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  chartCurrent: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sessionCard: {
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionE1RM: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  sessionVolume: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  setsContainer: {
    gap: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setNumber: {
    width: 20,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  setText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
