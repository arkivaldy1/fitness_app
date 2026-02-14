import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card, Button, NumericInput } from '../ui';
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
  restTimeRemaining?: number;
  restTimerTotal?: number;
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
  restTimeRemaining,
  restTimerTotal,
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

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              {lastSessionSet.weight}{weightUnit} × {lastSessionSet.reps}
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

      {/* Rest Timer */}
      {restTimeRemaining !== undefined && restTimeRemaining > 0 && (
        <View style={styles.restTimerContainer}>
          <LinearGradient
            colors={['rgba(76, 252, 173, 0.15)', 'rgba(76, 208, 252, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.restTimer}
          >
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.restTime}>{formatRestTime(restTimeRemaining)}</Text>
            <View style={styles.restProgressBar}>
              <View style={[styles.restProgressFill, { width: `${(restTimeRemaining / (restTimerTotal || 90)) * 100}%` }]} />
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Input Section */}
      <Card style={styles.inputCard} elevated>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WEIGHT</Text>
            <View style={styles.inputControl}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setWeight(Math.max(0, weight - 2.5))}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.inputDisplay}>
                <Text style={styles.inputValue}>{weight}</Text>
                <Text style={styles.inputUnit}>{weightUnit}</Text>
              </View>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setWeight(weight + 2.5)}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputDivider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REPS</Text>
            <View style={styles.inputControl}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setReps(Math.max(0, reps - 1))}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.inputDisplay}>
                <Text style={styles.inputValue}>{reps}</Text>
              </View>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setReps(reps + 1)}
              >
                <Text style={styles.stepButtonText}>+</Text>
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
            {showAdvanced ? '− Hide options' : '+ More options'}
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
          title="Complete Set ✓"
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
                Quick: {defaultWeight}{weightUnit} × {defaultReps}
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
    gap: 16,
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
  restTimerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  restTimer: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.3)',
  },
  restLabel: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  restTime: {
    color: '#059669',
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  restProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    borderRadius: 2,
    marginTop: 12,
  },
  restProgressFill: {
    height: '100%',
    backgroundColor: '#4CFCAD',
    borderRadius: 2,
  },
  inputCard: {
    padding: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '500',
  },
  inputDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  inputValue: {
    color: '#0f172a',
    fontSize: 32,
    fontWeight: '800',
  },
  inputUnit: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  inputDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  advancedToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
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
