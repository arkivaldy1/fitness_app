import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays } from 'date-fns';
import { Card, Button, NumericInput, GradientBackground } from '../../../components/ui';
import WeightTrendChart from '../../../components/charts/WeightTrendChart';
import { useAuthStore, useWeightStore } from '../../../stores';

export default function WeightScreen() {
  const { user, profile, updateProfile } = useAuthStore();
  const {
    currentDate,
    todayEntry,
    history,
    firstEntry,
    goalWeightKg,
    isLoading,
    loadDay,
    setDate,
    logWeight,
    deleteEntry,
    setGoalWeight,
  } = useWeightStore();

  const isLb = profile?.weight_unit === 'lb';
  const step = isLb ? 0.5 : 0.1;
  const unitLabel = isLb ? 'lb' : 'kg';

  const toDisplay = (kg: number) => (isLb ? Math.round(kg * 2.20462 * 10) / 10 : kg);
  const toKg = (display: number) => (isLb ? Math.round((display / 2.20462) * 100) / 100 : display);

  const defaultWeight = todayEntry
    ? toDisplay(todayEntry.weight_kg)
    : profile?.weight_kg
      ? toDisplay(profile.weight_kg)
      : isLb
        ? 150
        : 70;

  const [inputWeight, setInputWeight] = useState(defaultWeight);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(goalWeightKg ? toDisplay(goalWeightKg) : defaultWeight);

  useEffect(() => {
    if (user) {
      loadDay(user.id);
    }
  }, [user]);

  // Sync input when switching dates
  useEffect(() => {
    if (todayEntry) {
      setInputWeight(toDisplay(todayEntry.weight_kg));
    } else if (profile?.weight_kg) {
      setInputWeight(toDisplay(profile.weight_kg));
    }
  }, [todayEntry, currentDate]);

  useEffect(() => {
    if (goalWeightKg !== null) {
      setGoalInput(toDisplay(goalWeightKg));
    }
  }, [goalWeightKg]);

  const handleRefresh = async () => {
    if (user) {
      await loadDay(user.id, currentDate);
    }
  };

  const handlePrevDay = () => {
    const prevDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');
    setDate(prevDate);
    if (user) loadDay(user.id, prevDate);
  };

  const handleNextDay = () => {
    const nextDate = format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    if (nextDate <= today) {
      setDate(nextDate);
      if (user) loadDay(user.id, nextDate);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const kg = toKg(inputWeight);
    await logWeight(user.id, kg);
    await updateProfile({ weight_kg: kg });
  };

  const handleDelete = () => {
    if (!user || !todayEntry) return;
    Alert.alert('Delete Entry', 'Remove this weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteEntry(user.id),
      },
    ]);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    await setGoalWeight(user.id, toKg(goalInput));
    setEditingGoal(false);
  };

  const isToday = currentDate === format(new Date(), 'yyyy-MM-dd');

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = subDays(today, 1);
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  };

  // Stats
  const currentWeight = todayEntry ? toDisplay(todayEntry.weight_kg) : null;
  const changeFromFirst =
    todayEntry && firstEntry
      ? toDisplay(todayEntry.weight_kg) - toDisplay(firstEntry.weight_kg)
      : null;

  // Chart data
  const chartData = history.map((h) => ({ date: h.date, weight: h.weight_kg }));

  // Recent entries (last 10, most recent first)
  const recentEntries = [...history].reverse().slice(0, 10);

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={[]}>
        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavButton}>
            <Text style={styles.dateNavArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formatDisplayDate(currentDate)}</Text>
          </View>
          <TouchableOpacity
            onPress={handleNextDay}
            style={styles.dateNavButton}
            disabled={isToday}
          >
            <Text style={[styles.dateNavArrow, isToday && styles.dateNavDisabled]}>→</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#4CFCAD" />
          }
        >
          {/* Weight Input Card */}
          <Card elevated style={styles.inputCard}>
            <Text style={styles.inputTitle}>
              {todayEntry ? 'Update Weight' : 'Log Weight'}
            </Text>
            <NumericInput
              value={inputWeight}
              onChange={setInputWeight}
              min={isLb ? 50 : 20}
              max={isLb ? 700 : 320}
              step={step}
              unit={unitLabel}
            />
            <View style={styles.inputActions}>
              <Button
                title={todayEntry ? 'Update' : 'Save'}
                onPress={handleSave}
                variant="gradient"
                size="md"
                fullWidth
              />
              {todayEntry && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <Card elevated style={styles.statCard}>
              <Text style={styles.statLabel}>Current</Text>
              <Text style={styles.statValue}>
                {currentWeight !== null ? `${currentWeight}` : '—'}
              </Text>
              <Text style={styles.statUnit}>{unitLabel}</Text>
            </Card>
            <Card elevated style={styles.statCard}>
              <Text style={styles.statLabel}>Goal</Text>
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={styles.statValue}>
                  {goalWeightKg ? `${toDisplay(goalWeightKg)}` : 'Set'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.statUnit}>{goalWeightKg ? unitLabel : ''}</Text>
            </Card>
            <Card elevated style={styles.statCard}>
              <Text style={styles.statLabel}>Change</Text>
              <Text
                style={[
                  styles.statValue,
                  changeFromFirst !== null && changeFromFirst < 0 && styles.statNegative,
                  changeFromFirst !== null && changeFromFirst > 0 && styles.statPositive,
                ]}
              >
                {changeFromFirst !== null
                  ? `${changeFromFirst > 0 ? '+' : ''}${changeFromFirst.toFixed(1)}`
                  : '—'}
              </Text>
              <Text style={styles.statUnit}>{changeFromFirst !== null ? unitLabel : ''}</Text>
            </Card>
          </View>

          {/* Goal Weight Editor */}
          {editingGoal && (
            <Card elevated style={styles.goalCard}>
              <Text style={styles.goalTitle}>Set Goal Weight</Text>
              <NumericInput
                value={goalInput}
                onChange={setGoalInput}
                min={isLb ? 50 : 20}
                max={isLb ? 700 : 320}
                step={step}
                unit={unitLabel}
              />
              <View style={styles.goalActions}>
                <TouchableOpacity
                  onPress={() => setEditingGoal(false)}
                  style={styles.goalCancel}
                >
                  <Text style={styles.goalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Button title="Save Goal" onPress={handleSaveGoal} variant="gradient" size="sm" />
              </View>
            </Card>
          )}

          {/* 30-Day Trend Chart */}
          {chartData.length >= 2 && (
            <Card elevated style={styles.chartCard}>
              <WeightTrendChart
                data={chartData}
                goalWeight={goalWeightKg}
                unit={profile?.weight_unit || 'kg'}
              />
            </Card>
          )}

          {/* Recent Entries */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {recentEntries.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyText}>No entries yet</Text>
                <Text style={styles.emptySubtext}>Log your weight above to start tracking</Text>
              </Card>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map((entry, index) => (
                  <LinearGradient
                    key={entry.id}
                    colors={
                      index % 2 === 0
                        ? ['rgba(76, 252, 173, 0.08)', 'rgba(76, 208, 252, 0.08)']
                        : ['rgba(76, 208, 252, 0.08)', 'rgba(76, 252, 173, 0.08)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.entryItem}
                  >
                    <Text style={styles.entryDate}>
                      {format(new Date(entry.date), 'EEE, MMM d')}
                    </Text>
                    <View style={styles.entryRight}>
                      <Text style={styles.entryWeight}>{toDisplay(entry.weight_kg)}</Text>
                      <Text style={styles.entryUnit}>{unitLabel}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  dateNavButton: {
    padding: 8,
  },
  dateNavArrow: {
    fontSize: 24,
    color: '#059669',
    fontWeight: '600',
  },
  dateNavDisabled: {
    color: '#cbd5e1',
  },
  dateBadge: {
    backgroundColor: 'rgba(76, 252, 173, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputActions: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  statUnit: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statNegative: {
    color: '#059669',
  },
  statPositive: {
    color: '#f59e0b',
  },
  goalCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  goalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  goalCancelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  entriesList: {
    gap: 10,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  entryWeight: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  entryUnit: {
    fontSize: 13,
    color: '#64748b',
  },
});
