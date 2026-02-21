import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, GradientBackground } from '../../../components/ui';
import CalorieTrendChart from '../../../components/charts/CalorieTrendChart';
import { useAuthStore, useNutritionStore } from '../../../stores';
import { getNutritionHistory } from '../../../lib/database';
import { theme } from '../../../constants/theme';

type Period = 7 | 14 | 30;

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function NutritionAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { targets } = useNutritionStore();

  const [period, setPeriod] = useState<Period>(7);
  const [data, setData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user, period]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const history = await getNutritionHistory(user.id, period);
    setData(history);
    setIsLoading(false);
  };

  // Averages
  const daysWithData = data.filter((d) => d.calories > 0);
  const count = daysWithData.length || 1;
  const avg = {
    calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / count),
    protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / count),
    carbs: Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / count),
    fat: Math.round(daysWithData.reduce((s, d) => s + d.fat, 0) / count),
  };

  // Adherence: % of days hitting targets (within 10% of target)
  const adherence = targets
    ? {
        calories: Math.round(
          (daysWithData.filter((d) => d.calories >= targets.calories * 0.9 && d.calories <= targets.calories * 1.1).length /
            count) *
            100
        ),
        protein: Math.round(
          (daysWithData.filter((d) => d.protein >= targets.protein * 0.9).length / count) * 100
        ),
        carbs: Math.round(
          (daysWithData.filter((d) => d.carbs >= targets.carbs * 0.9 && d.carbs <= targets.carbs * 1.1).length / count) *
            100
        ),
        fat: Math.round(
          (daysWithData.filter((d) => d.fat >= targets.fat * 0.9 && d.fat <= targets.fat * 1.1).length / count) * 100
        ),
      }
    : null;

  // Best/worst days
  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((best, d) => (d.protein > best.protein ? d : best))
    : null;
  const highestCal = daysWithData.length > 0
    ? daysWithData.reduce((h, d) => (d.calories > h.calories ? d : h))
    : null;
  const lowestCal = daysWithData.length > 0
    ? daysWithData.reduce((l, d) => (d.calories < l.calories ? d : l))
    : null;

  const chartData = data.map((d) => ({ date: d.date, calories: d.calories }));

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Period selector */}
          <View style={styles.periodRow}>
            {([7, 14, 30] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p}D
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Calorie Trend Chart */}
          <Card style={styles.chartCard} elevated>
            {chartData.length >= 2 ? (
              <CalorieTrendChart
                data={chartData}
                targetCalories={targets?.calories}
                title={`${period}-Day Calorie Trend`}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartEmoji}>📊</Text>
                <Text style={styles.emptyChartText}>
                  Not enough data yet. Log meals for at least 2 days.
                </Text>
                <Button
                  title="Log a Meal"
                  variant="outline"
                  onPress={() => router.back()}
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </Card>

          {/* Weekly Averages */}
          <Card style={styles.section} elevated>
            <Text style={styles.sectionTitle}>Daily Averages</Text>
            <View style={styles.avgGrid}>
              <AvgItem label="Calories" value={`${avg.calories}`} unit="kcal" color="#059669" />
              <AvgItem label="Protein" value={`${avg.protein}`} unit="g" color="#4CFCAD" />
              <AvgItem label="Carbs" value={`${avg.carbs}`} unit="g" color="#4CD0FC" />
              <AvgItem label="Fat" value={`${avg.fat}`} unit="g" color="#f59e0b" />
            </View>
          </Card>

          {/* Adherence */}
          {adherence && (
            <Card style={styles.section} elevated>
              <Text style={styles.sectionTitle}>Target Adherence</Text>
              <Text style={styles.adherenceSubtitle}>% of days within 10% of target</Text>
              <View style={styles.adherenceGrid}>
                <AdherenceBar label="Calories" pct={adherence.calories} color="#059669" />
                <AdherenceBar label="Protein" pct={adherence.protein} color="#4CFCAD" />
                <AdherenceBar label="Carbs" pct={adherence.carbs} color="#4CD0FC" />
                <AdherenceBar label="Fat" pct={adherence.fat} color="#f59e0b" />
              </View>
            </Card>
          )}

          {/* Highlights */}
          {daysWithData.length > 0 && (
            <Card style={styles.section} elevated>
              <Text style={styles.sectionTitle}>Highlights</Text>
              <View style={styles.highlights}>
                {bestDay && (
                  <HighlightItem
                    label="Highest Protein"
                    value={`${bestDay.protein}g`}
                    sub={formatShortDate(bestDay.date)}
                  />
                )}
                {highestCal && (
                  <HighlightItem
                    label="Highest Calories"
                    value={`${highestCal.calories} kcal`}
                    sub={formatShortDate(highestCal.date)}
                  />
                )}
                {lowestCal && (
                  <HighlightItem
                    label="Lowest Calories"
                    value={`${lowestCal.calories} kcal`}
                    sub={formatShortDate(lowestCal.date)}
                  />
                )}
                <HighlightItem
                  label="Days Tracked"
                  value={`${daysWithData.length}`}
                  sub={`of ${period} days`}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const AvgItem = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
  <View style={styles.avgItem}>
    <View style={[styles.avgDot, { backgroundColor: color }]} />
    <Text style={styles.avgLabel}>{label}</Text>
    <Text style={styles.avgValue}>
      {value}<Text style={styles.avgUnit}> {unit}</Text>
    </Text>
  </View>
);

const AdherenceBar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <View style={styles.adherenceItem}>
    <View style={styles.adherenceLabel}>
      <Text style={styles.adherenceName}>{label}</Text>
      <Text style={styles.adherencePct}>{pct}%</Text>
    </View>
    <View style={styles.adherenceBar}>
      <View style={[styles.adherenceFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const HighlightItem = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <View style={styles.highlightItem}>
    <Text style={styles.highlightLabel}>{label}</Text>
    <Text style={styles.highlightValue}>{value}</Text>
    <Text style={styles.highlightSub}>{sub}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 252, 173, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  periodBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  periodTextActive: {
    color: '#fff',
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  emptyChart: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyChartEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyChartText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  avgGrid: {
    gap: 12,
  },
  avgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avgDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  avgLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  avgValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  avgUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  adherenceSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 16,
    marginTop: -8,
  },
  adherenceGrid: {
    gap: 14,
  },
  adherenceItem: {
    gap: 6,
  },
  adherenceLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adherenceName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  adherencePct: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  adherenceBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightItem: {
    width: '47%',
    backgroundColor: 'rgba(76, 252, 173, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.15)',
  },
  highlightLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  highlightSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
