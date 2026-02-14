import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SetLogger } from '../../../components/workout/SetLogger';
import { Button, Card, ProgressBar, GradientBackground } from '../../../components/ui';
import { useWorkoutStore, useCurrentExercise, useWorkoutProgress, useAuthStore } from '../../../stores';
import { SEED_EXERCISES } from '../../../constants/exercises';
import { calculateVolume } from '../../../lib/analytics';
import type { Exercise } from '../../../types';

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    activeSession,
    logSetComplete,
    skipSet,
    nextExercise,
    previousExercise,
    finishWorkout,
    cancelWorkout,
    clearRestTimer,
  } = useWorkoutStore();

  const currentExercise = useCurrentExercise();
  const progress = useWorkoutProgress();

  const [restTimeRemaining, setRestTimeRemaining] = useState<number | undefined>();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  // Timer for rest countdown
  useEffect(() => {
    if (!activeSession?.restTimerEnd) {
      setRestTimeRemaining(undefined);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((activeSession.restTimerEnd!.getTime() - Date.now()) / 1000));
      setRestTimeRemaining(remaining);

      if (remaining === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearRestTimer();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.restTimerEnd]);

  // Timer for workout duration
  useEffect(() => {
    if (!activeSession) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  const { addExerciseToSession } = useWorkoutStore();

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            await finishWorkout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)/workout/summary');
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure? Your logged sets will be saved as an incomplete workout.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.replace('/(tabs)/workout');
          },
        },
      ]
    );
  };

  const handleAddExercise = (exercise: Exercise) => {
    addExerciseToSession({ id: exercise.id, name: exercise.name });
    setShowExercisePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!activeSession) {
    router.replace('/(tabs)/workout');
    return null;
  }

  // Handle Quick Workout with no exercises yet - Exercise Picker
  if (!currentExercise || activeSession.exercises.length === 0) {
    return (
      <GradientBackground variant="full">
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.workoutName}>{activeSession.template.name}</Text>
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{formatElapsedTime(elapsedTime)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleFinish} style={styles.headerButton}>
              <Text style={styles.finishButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise Picker Header */}
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerEmoji}>💪</Text>
            <Text style={styles.pickerTitle}>Choose Your Exercise</Text>
            <Text style={styles.pickerSubtitle}>Tap any exercise to start logging</Text>
          </View>

          {/* Exercise List */}
          <FlatList
            data={SEED_EXERCISES as Exercise[]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => handleAddExercise(item)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={index % 2 === 0
                    ? ['rgba(76, 252, 173, 0.08)', 'rgba(76, 208, 252, 0.08)']
                    : ['rgba(76, 208, 252, 0.08)', 'rgba(76, 252, 173, 0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.exerciseGradient}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <View style={styles.exerciseTags}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>
                          {item.primary_muscle.charAt(0).toUpperCase() + item.primary_muscle.slice(1)}
                        </Text>
                      </View>
                      <View style={[styles.tag, styles.tagSecondary]}>
                        <Text style={styles.tagTextSecondary}>{item.equipment}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.addButton}>
                    <Text style={styles.addIcon}>+</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const currentSetNumber = currentExercise.completedSets.length + 1;
  const isExerciseComplete = currentSetNumber > currentExercise.targetSets;

  const handleLogSet = (
    reps: number,
    weight: number,
    options?: { rpe?: number; isWarmup?: boolean }
  ) => {
    const exerciseIndex = activeSession.currentExerciseIndex;
    logSetComplete(
      exerciseIndex,
      reps,
      weight,
      profile?.weight_unit || 'kg',
      options
    );
  };

  const handleSkipSet = () => {
    skipSet(activeSession.currentExerciseIndex);
  };

  const lastSet = currentExercise.lastSessionSets[currentSetNumber - 1];
  const defaultWeight = lastSet?.weight || 0;
  const defaultReps = lastSet?.reps || parseInt(currentExercise.targetReps.split('-')[0]) || 10;

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.workoutName}>{activeSession.template.name}</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatElapsedTime(elapsedTime)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleFinish} style={styles.headerButton}>
            <Text style={styles.finishButton}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress.percentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completed} / {progress.total} sets completed
          </Text>
        </View>

        {/* Exercise Navigation */}
        <View style={styles.exerciseNav}>
          <TouchableOpacity
            onPress={previousExercise}
            disabled={activeSession.currentExerciseIndex === 0}
            style={styles.navButton}
          >
            <Text style={[
              styles.navButtonText,
              activeSession.currentExerciseIndex === 0 && styles.navButtonDisabled
            ]}>
              ← Prev
            </Text>
          </TouchableOpacity>

          <View style={styles.exerciseCounter}>
            <Text style={styles.exerciseCounterText}>
              {activeSession.currentExerciseIndex + 1} / {activeSession.exercises.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowExercisePicker(true)}
            style={styles.addExerciseNavButton}
          >
            <Text style={styles.addExerciseNavText}>+ Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextExercise}
            disabled={activeSession.currentExerciseIndex === activeSession.exercises.length - 1}
            style={styles.navButton}
          >
            <Text style={[
              styles.navButtonText,
              activeSession.currentExerciseIndex === activeSession.exercises.length - 1 && styles.navButtonDisabled
            ]}>
              Next →
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isExerciseComplete ? (
            <View style={styles.completeContainer}>
              <LinearGradient
                colors={['#4CFCAD', '#4CD0FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.completeGradient}
              >
                <Text style={styles.completeCheckmark}>✓</Text>
              </LinearGradient>
              <Text style={styles.completeTitle}>Exercise Complete!</Text>
              <Text style={styles.completeSubtitle}>
                {currentExercise.completedSets.filter((s) => !s.skipped).length} sets logged
              </Text>
              {activeSession.currentExerciseIndex < activeSession.exercises.length - 1 ? (
                <Button
                  title="Next Exercise →"
                  onPress={nextExercise}
                  variant="gradient"
                  size="lg"
                />
              ) : (
                <Button
                  title="Finish Workout 🎉"
                  onPress={handleFinish}
                  variant="gradient"
                  size="lg"
                />
              )}
            </View>
          ) : (
            <SetLogger
              exerciseName={currentExercise.exerciseName}
              currentSetNumber={currentSetNumber}
              targetSets={currentExercise.targetSets}
              targetReps={currentExercise.targetReps}
              lastSessionSet={currentExercise.lastSessionSets[currentSetNumber - 1]}
              defaultWeight={defaultWeight}
              defaultReps={defaultReps}
              weightUnit={profile?.weight_unit || 'kg'}
              onLogSet={handleLogSet}
              onSkipSet={handleSkipSet}
              onExerciseNameLongPress={() => {
                router.push({
                  pathname: '/(tabs)/workout/exercise-history',
                  params: {
                    exerciseId: currentExercise.exerciseId,
                    exerciseName: currentExercise.exerciseName,
                  },
                });
              }}
              restTimeRemaining={restTimeRemaining}
              restTimerTotal={currentExercise.restSeconds}
              prAchieved={activeSession.latestPrExerciseIndex === activeSession.currentExerciseIndex}
            />
          )}

          {/* Completed Sets */}
          {currentExercise.completedSets.length > 0 && (
            <View style={styles.completedSets}>
              <Text style={styles.completedTitle}>Completed Sets</Text>
              {currentExercise.completedSets.map((set, index) => (
                <View key={set.id} style={styles.completedSet}>
                  <View style={styles.setNumberBadge}>
                    <Text style={styles.setNumberText}>{index + 1}</Text>
                  </View>
                  {set.skipped ? (
                    <Text style={styles.skippedText}>Skipped</Text>
                  ) : (
                    <Text style={styles.setDetails}>
                      {set.weight} {set.weight_unit} × {set.reps} reps
                      {set.rpe && ` @ RPE ${set.rpe}`}
                      {set.is_warmup && ' (warm-up)'}
                    </Text>
                  )}
                </View>
              ))}
              {/* Volume subtotal */}
              {currentExercise.completedSets.some((s) => !s.skipped) && (
                <View style={styles.volumeRow}>
                  <Text style={styles.volumeLabel}>Volume</Text>
                  <Text style={styles.volumeValue}>
                    {calculateVolume(currentExercise.completedSets).toLocaleString()} kg
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Add Exercise Overlay */}
        <Modal
          visible={showExercisePicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowExercisePicker(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <View style={{ width: 50 }} />
            </View>
            <FlatList
              data={SEED_EXERCISES as Exercise[]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.exerciseList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.exerciseItem}
                  onPress={() => handleAddExercise(item)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={index % 2 === 0
                      ? ['rgba(76, 252, 173, 0.08)', 'rgba(76, 208, 252, 0.08)']
                      : ['rgba(76, 208, 252, 0.08)', 'rgba(76, 252, 173, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.exerciseGradient}
                  >
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseItemName}>{item.name}</Text>
                      <View style={styles.exerciseTags}>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>
                            {item.primary_muscle.charAt(0).toUpperCase() + item.primary_muscle.slice(1)}
                          </Text>
                        </View>
                        <View style={[styles.tag, styles.tagSecondary]}>
                          <Text style={styles.tagTextSecondary}>{item.equipment}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.addButton}>
                      <Text style={styles.addIcon}>+</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
  },
  cancelButton: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  timerBadge: {
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  timerText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  exerciseNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 252, 173, 0.2)',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '600',
  },
  navButtonDisabled: {
    color: '#cbd5e1',
  },
  exerciseCounter: {
    backgroundColor: 'rgba(76, 252, 173, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exerciseCounterText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseNavButton: {
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addExerciseNavText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  completeContainer: {
    alignItems: 'center',
    padding: 24,
  },
  completeGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completeCheckmark: {
    fontSize: 40,
    color: '#000',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  completedSets: {
    marginTop: 24,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  completedSet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CFCAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setNumberText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  setDetails: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
  },
  skippedText: {
    color: '#94a3b8',
    fontSize: 15,
    fontStyle: 'italic',
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 252, 173, 0.2)',
  },
  volumeLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  volumeValue: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
  },
  // Exercise Picker Styles
  pickerHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 252, 173, 0.2)',
  },
  pickerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  exerciseList: {
    padding: 16,
  },
  exerciseItem: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  exerciseTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  tagSecondary: {
    backgroundColor: 'rgba(76, 208, 252, 0.2)',
  },
  tagTextSecondary: {
    color: '#0891b2',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CFCAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    color: '#000',
    fontSize: 24,
    fontWeight: '600',
  },
  exerciseItemName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 252, 173, 0.2)',
  },
  modalClose: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
});
