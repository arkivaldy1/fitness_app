import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addDays, subDays } from 'date-fns';
import { Card, Button, GradientBackground } from '../../../components/ui';
import { useAuthStore, useNutritionStore, calculateAdherence } from '../../../stores';

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentDate,
    totals,
    targets,
    entries,
    waterTotal,
    isLoading,
    loadDay,
    setDate,
    addWater,
  } = useNutritionStore();

  useEffect(() => {
    if (user) {
      loadDay(user.id);
    }
  }, [user]);

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

  const handleAddWater = async (amount: number) => {
    if (user) {
      await addWater(user.id, amount);
    }
  };

  const adherence = calculateAdherence(totals, targets);
  const isToday = currentDate === format(new Date(), 'yyyy-MM-dd');

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = subDays(today, 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(date, 'EEE, MMM d');
  };

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
        </View>

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
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor="#4CFCAD"
            />
          }
        >
          {/* Calories Card */}
          {targets ? (
            <Card gradient elevated style={styles.caloriesCard}>
              <Text style={styles.caloriesLabel}>CALORIES</Text>
              <View style={styles.caloriesRow}>
                <Text style={styles.caloriesCurrent}>{totals.calories}</Text>
                <Text style={styles.caloriesTarget}>/ {targets.calories}</Text>
              </View>
              <View style={styles.caloriesBar}>
                <View style={[styles.caloriesFill, { width: `${Math.min(adherence.calories, 100)}%` }]} />
              </View>
              <Text style={styles.caloriesRemaining}>
                {targets.calories - totals.calories > 0
                  ? `${targets.calories - totals.calories} kcal remaining`
                  : 'Goal reached!'}
              </Text>
            </Card>
          ) : (
            <Card style={styles.setupCard} elevated>
              <Text style={styles.setupEmoji}>🎯</Text>
              <Text style={styles.setupTitle}>Set Your Goals</Text>
              <Text style={styles.setupText}>Configure your daily calorie and macro targets</Text>
              <Button
                title="Set Targets"
                onPress={() => router.push('/(tabs)/nutrition/targets')}
                variant="gradient"
              />
            </Card>
          )}

          {/* Macros */}
          {targets && (
            <View style={styles.macrosGrid}>
              <MacroCard
                label="Protein"
                current={Math.round(totals.protein)}
                target={targets.protein}
                unit="g"
                color="#4CFCAD"
                emoji="🥩"
              />
              <MacroCard
                label="Carbs"
                current={Math.round(totals.carbs)}
                target={targets.carbs}
                unit="g"
                color="#4CD0FC"
                emoji="🍞"
              />
              <MacroCard
                label="Fat"
                current={Math.round(totals.fat)}
                target={targets.fat}
                unit="g"
                color="#f59e0b"
                emoji="🥑"
              />
            </View>
          )}

          {/* Water Tracking */}
          <Card style={styles.waterCard} elevated>
            <View style={styles.waterHeader}>
              <View style={styles.waterTitleRow}>
                <Text style={styles.waterEmoji}>💧</Text>
                <Text style={styles.waterTitle}>Hydration</Text>
              </View>
              <Text style={styles.waterTotal}>
                {(waterTotal / 1000).toFixed(1)}L / {targets ? (targets.water_ml / 1000).toFixed(1) : '3.0'}L
              </Text>
            </View>
            <View style={styles.waterBar}>
              <LinearGradient
                colors={['#4CFCAD', '#4CD0FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.waterFill,
                  { width: `${Math.min((waterTotal / (targets?.water_ml || 3000)) * 100, 100)}%` }
                ]}
              />
            </View>
            <View style={styles.waterButtons}>
              {[250, 500, 750].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.waterButton}
                  onPress={() => handleAddWater(amount)}
                >
                  <LinearGradient
                    colors={['rgba(76, 252, 173, 0.15)', 'rgba(76, 208, 252, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.waterButtonGradient}
                  >
                    <Text style={styles.waterButtonText}>+{amount}ml</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Food Log */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Food Log</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition/add')}>
                <Text style={styles.sectionAction}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {entries.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🍽️</Text>
                <Text style={styles.emptyText}>No meals logged yet</Text>
                <Text style={styles.emptySubtext}>Tap the button below to add food</Text>
              </Card>
            ) : (
              <View style={styles.entriesList}>
                {entries.map((entry, index) => (
                  <TouchableOpacity key={entry.id} activeOpacity={0.7}>
                    <LinearGradient
                      colors={index % 2 === 0
                        ? ['rgba(76, 252, 173, 0.08)', 'rgba(76, 208, 252, 0.08)']
                        : ['rgba(76, 208, 252, 0.08)', 'rgba(76, 252, 173, 0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.entryItem}
                    >
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryLabel}>{entry.label || 'Food Entry'}</Text>
                        <Text style={styles.entryMacros}>
                          P: {entry.protein || 0}g · C: {entry.carbs || 0}g · F: {entry.fat || 0}g
                        </Text>
                      </View>
                      <View style={styles.entryCaloriesBadge}>
                        <Text style={styles.entryCalories}>{entry.calories}</Text>
                        <Text style={styles.entryKcal}>kcal</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Button */}
        <View style={styles.addButtonContainer}>
          <Button
            title="+ Log Food"
            onPress={() => router.push('/(tabs)/nutrition/add')}
            variant="gradient"
            size="lg"
            fullWidth
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

// Macro Card Component
const MacroCard = ({ label, current, target, unit, color, emoji }: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  emoji: string;
}) => {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <Card style={styles.macroCard} elevated>
      <Text style={styles.macroEmoji}>{emoji}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroCurrent}>
        {current}<Text style={styles.macroUnit}>{unit}</Text>
      </Text>
      <View style={styles.macroBar}>
        <View style={[styles.macroFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroTarget}>/ {target}{unit}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
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
    paddingBottom: 100,
  },
  caloriesCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  caloriesCurrent: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000',
  },
  caloriesTarget: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.4)',
    marginLeft: 8,
  },
  caloriesBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  caloriesFill: {
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
  },
  caloriesRemaining: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 12,
    fontWeight: '500',
  },
  setupCard: {
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  setupEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  setupText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  macroEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  macroCurrent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  macroUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroTarget: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  waterCard: {
    padding: 20,
    marginBottom: 24,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterEmoji: {
    fontSize: 24,
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  waterTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  waterBar: {
    height: 12,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    borderRadius: 6,
  },
  waterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  waterButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  waterButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.3)',
  },
  waterButtonText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionAction: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '600',
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
  entryInfo: {
    flex: 1,
  },
  entryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  entryMacros: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  entryCaloriesBadge: {
    alignItems: 'flex-end',
  },
  entryCalories: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  entryKcal: {
    fontSize: 12,
    color: '#64748b',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
