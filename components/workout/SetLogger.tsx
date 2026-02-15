import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card, Button } from '../ui';
import { rfs } from '../../constants/theme';
import type { SetLog, WeightUnit } from '../../types';

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
  const [weightText, setWeightText] = useState(String(defaultWeight));
  const [repsText, setRepsText] = useState(String(defaultReps));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);

  useEffect(() => {
    setWeight(defaultWeight);
    setReps(defaultReps);
    setWeightText(String(defaultWeight));
    setRepsText(String(defaultReps));
  }, [defaultWeight, defaultReps]);

  const updateWeight = (val: number) => {
    const clamped = Math.max(0, val);
    setWeight(clamped);
    setWeightText(String(clamped));
  };

  const updateReps = (val: number) => {
    const clamped = Math.max(1, Math.round(val));
    setReps(clamped);
    setRepsText(String(clamped));
  };

  const handleWeightTextChange = (text: string) => {
    setWeightText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) {
      setWeight(parsed);
    }
  };

  const handleWeightBlur = () => {
    const parsed = parseFloat(weightText);
    if (isNaN(parsed) || parsed < 0) {
      setWeightText(String(weight));
    } else {
      setWeight(parsed);
      setWeightText(String(parsed));
    }
  };

  const handleRepsTextChange = (text: string) => {
    setRepsText(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setReps(parsed);
    }
  };

  const handleRepsBlur = () => {
    const parsed = parseInt(repsText, 10);
    if (isNaN(parsed) || parsed < 1) {
      setRepsText(String(reps));
    } else {
      setReps(parsed);
      setRepsText(String(parsed));
    }
  };

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
        <Pressable onLongPress={onExerciseNameLongPress}>
          <Text style={styles.exerciseName} numberOfLines={2}>{exerciseName}</Text>
        </Pressable>
        <View style={styles.badgeTargetRow}>
          <View style={styles.setBadge}>
            <Text style={styles.setBadgeText}>
              Set {currentSetNumber}/{targetSets}
            </Text>
          </View>
          <Text style={styles.targetText}>Target: {targetReps} reps</Text>
        </View>
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

      {/* Input Section - TextInput with Steppers */}
      <Card style={styles.inputCard} elevated>
        <View style={styles.inputRow}>
          {/* Weight Group */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WEIGHT ({weightUnit})</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => { updateWeight(weight - 2.5); Haptics.selectionAsync(); }}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.numberInput}
                value={weightText}
                onChangeText={handleWeightTextChange}
                onBlur={handleWeightBlur}
                keyboardType="decimal-pad"
                selectTextOnFocus
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => { updateWeight(weight + 2.5); Haptics.selectionAsync(); }}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Vertical Divider */}
          <View style={styles.verticalDivider} />

          {/* Reps Group */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REPS</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => { updateReps(reps - 1); Haptics.selectionAsync(); }}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.numberInput}
                value={repsText}
                onChangeText={handleRepsTextChange}
                onBlur={handleRepsBlur}
                keyboardType="number-pad"
                selectTextOnFocus
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => { updateReps(reps + 1); Haptics.selectionAsync(); }}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  exerciseName: {
    color: '#000',
    fontSize: rfs(22),
    fontWeight: '800',
    marginBottom: 8,
  },
  badgeTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  setBadgeText: {
    color: '#000',
    fontSize: rfs(13),
    fontWeight: '700',
  },
  targetText: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: rfs(14),
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
    fontSize: rfs(13),
  },
  lastValue: {
    color: '#000',
    fontSize: rfs(13),
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
    fontSize: rfs(20),
  },
  prBannerText: {
    color: '#000',
    fontSize: rfs(16),
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputCard: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: rfs(11),
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    color: '#0f172a',
    fontSize: rfs(20),
    fontWeight: '600',
  },
  numberInput: {
    width: 72,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    textAlign: 'center',
    fontSize: rfs(20),
    fontWeight: '800',
    color: '#0f172a',
  },
  verticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  advancedToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  advancedToggleText: {
    color: '#64748b',
    fontSize: rfs(14),
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
    fontSize: rfs(14),
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
    fontSize: rfs(15),
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
    fontSize: rfs(15),
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
    fontSize: rfs(15),
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
    fontSize: rfs(14),
    fontWeight: '600',
  },
});
