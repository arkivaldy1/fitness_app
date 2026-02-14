import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card, Button } from '../ui';
import type { SetLog, WeightUnit } from '../../types';

const WEIGHT_VALUES = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
const REPS_VALUES = Array.from({ length: 30 }, (_, i) => i + 1);

interface SetLoggerProps {
  exerciseName: string;
  currentSetNumber: number;
  targetSets: number;
  targetReps: string;
  lastSessionSet?: SetLog;
  defaultWeight: number;
  defaultReps: number;
  weightUnit: WeightUnit;
  onLogSet: (reps: number, weight: number, options?: { rpe?: number; isWarmup?: boolean }) => void;
  onSkipSet: () => void;
  onExerciseNameLongPress?: () => void;
  prAchieved?: boolean;
}

const PillPicker: React.FC<{
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  formatLabel?: (value: number) => string;
  onFineTuneMinus: () => void;
  onFineTunePlus: () => void;
}> = ({ values, selected, onSelect, formatLabel, onFineTuneMinus, onFineTunePlus }) => {
  const flatListRef = useRef<FlatList>(null);

  const scrollToSelected = useCallback(() => {
    const idx = values.indexOf(selected);
    // If exact value isn't in the list, find the closest
    const closestIdx = idx >= 0 ? idx : values.reduce((best, v, i) =>
      Math.abs(v - selected) < Math.abs(values[best] - selected) ? i : best, 0);
    if (closestIdx >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: closestIdx, animated: true, viewPosition: 0.5 });
    }
  }, [selected, values]);

  useEffect(() => {
    // Small delay to ensure FlatList is laid out
    const timeout = setTimeout(scrollToSelected, 100);
    return () => clearTimeout(timeout);
  }, [scrollToSelected]);

  const renderPill = useCallback(({ item }: { item: number }) => {
    const isSelected = item === selected;
    const label = formatLabel ? formatLabel(item) : `${item}`;
    return (
      <TouchableOpacity
        onPress={() => {
          onSelect(item);
          Haptics.selectionAsync();
        }}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <LinearGradient
            colors={['#4CFCAD', '#4CD0FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={pillStyles.pillSelected}
          >
            <Text style={pillStyles.pillTextSelected}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={pillStyles.pill}>
            <Text style={pillStyles.pillText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selected, onSelect, formatLabel]);

  return (
    <View style={pillStyles.container}>
      <TouchableOpacity style={pillStyles.fineButton} onPress={onFineTuneMinus}>
        <Text style={pillStyles.fineButtonText}>-</Text>
      </TouchableOpacity>
      <FlatList
        ref={flatListRef}
        data={values}
        renderItem={renderPill}
        keyExtractor={(item) => `${item}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pillStyles.listContent}
        getItemLayout={(_, index) => ({ length: 56, offset: 56 * index, index })}
        onScrollToIndexFailed={() => {}}
      />
      <TouchableOpacity style={pillStyles.fineButton} onPress={onFineTunePlus}>
        <Text style={pillStyles.fineButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const pillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fineButtonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 4,
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    height: 38,
    minWidth: 50,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    height: 38,
    minWidth: 50,
    paddingHorizontal: 12,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});

export const SetLogger: React.FC<SetLoggerProps> = ({
  exerciseName,
  currentSetNumber,
  targetSets,
  targetReps,
  lastSessionSet,
  defaultWeight,
  defaultReps,
  weightUnit,
  onLogSet,
  onSkipSet,
  onExerciseNameLongPress,
  prAchieved,
}) => {
  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);

  useEffect(() => {
    setWeight(defaultWeight);
    setReps(defaultReps);
  }, [defaultWeight, defaultReps]);

  const handleLogSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLogSet(reps, weight, { rpe: rpe || undefined, isWarmup });
  };

  const handleQuickLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLogSet(defaultReps, defaultWeight);
  };

  return (
    <View style={styles.container}>
      {/* Exercise Name Card */}
      <Card gradient elevated style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <Pressable onLongPress={onExerciseNameLongPress}>
            <Text style={styles.exerciseName}>{exerciseName}</Text>
          </Pressable>
          <View style={styles.setBadge}>
            <Text style={styles.setBadgeText}>
              {currentSetNumber}/{targetSets}
            </Text>
          </View>
        </View>
        <Text style={styles.targetText}>Target: {targetReps} reps</Text>
        {lastSessionSet && (
          <View style={styles.lastSession}>
            <Text style={styles.lastLabel}>Last time: </Text>
            <Text style={styles.lastValue}>
              {lastSessionSet.weight}{weightUnit} x {lastSessionSet.reps}
            </Text>
          </View>
        )}
      </Card>

      {/* PR Badge */}
      {prAchieved && (
        <LinearGradient
          colors={['#facc15', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.prBanner}
        >
          <Text style={styles.prBannerEmoji}>🏆</Text>
          <Text style={styles.prBannerText}>NEW PERSONAL RECORD!</Text>
        </LinearGradient>
      )}

      {/* Input Section - Scrollable Pickers */}
      <Card style={styles.inputCard} elevated>
        <View style={styles.pickerSection}>
          <View style={styles.pickerRow}>
            <Text style={styles.inputLabel}>WEIGHT ({weightUnit})</Text>
            <Text style={styles.selectedValue}>{weight}</Text>
          </View>
          <PillPicker
            values={WEIGHT_VALUES}
            selected={weight}
            onSelect={setWeight}
            onFineTuneMinus={() => setWeight(Math.max(0, weight - 2.5))}
            onFineTunePlus={() => setWeight(weight + 2.5)}
          />
        </View>

        <View style={styles.pickerDivider} />

        <View style={styles.pickerSection}>
          <View style={styles.pickerRow}>
            <Text style={styles.inputLabel}>REPS</Text>
            <Text style={styles.selectedValue}>{reps}</Text>
          </View>
          <PillPicker
            values={REPS_VALUES}
            selected={reps}
            onSelect={setReps}
            onFineTuneMinus={() => setReps(Math.max(1, reps - 1))}
            onFineTunePlus={() => setReps(reps + 1)}
          />
        </View>

        {/* Advanced Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '- Hide options' : '+ More options'}
          </Text>
        </TouchableOpacity>

        {/* Advanced Options */}
        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* RPE */}
            <View style={styles.rpeRow}>
              <Text style={styles.rpeLabel}>RPE</Text>
              <View style={styles.rpeButtons}>
                {[6, 7, 8, 9, 10].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.rpeButton, rpe === value && styles.rpeButtonActive]}
                    onPress={() => setRpe(rpe === value ? null : value)}
                  >
                    <Text style={[styles.rpeButtonText, rpe === value && styles.rpeButtonTextActive]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Warmup Toggle */}
            <TouchableOpacity
              style={styles.warmupToggle}
              onPress={() => setIsWarmup(!isWarmup)}
            >
              <View style={[styles.checkbox, isWarmup && styles.checkboxActive]}>
                {isWarmup && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.warmupLabel}>Warm-up set</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Complete Set"
          onPress={handleLogSet}
          variant="gradient"
          size="lg"
          fullWidth
        />

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkipSet}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickButton} onPress={handleQuickLog}>
            <LinearGradient
              colors={['rgba(76, 252, 173, 0.15)', 'rgba(76, 208, 252, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quickButtonGradient}
            >
              <Text style={styles.quickText}>
                Quick: {defaultWeight}{weightUnit} x {defaultReps}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  exerciseCard: {
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    color: '#000',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  setBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  setBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  targetText: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  lastSession: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  lastLabel: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 13,
  },
  lastValue: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  prBannerEmoji: {
    fontSize: 20,
  },
  prBannerText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputCard: {
    padding: 16,
  },
  pickerSection: {
    gap: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  selectedValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  pickerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  advancedToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  advancedToggleText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  advancedSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    gap: 16,
  },
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rpeLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  rpeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rpeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeButtonActive: {
    backgroundColor: '#4CFCAD',
  },
  rpeButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  rpeButtonTextActive: {
    color: '#000',
  },
  warmupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#4CFCAD',
    borderColor: '#4CFCAD',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  warmupLabel: {
    color: '#64748b',
    fontSize: 15,
  },
  actions: {
    gap: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
  quickButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
});
