import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Modal, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SetLogger } from '../../../components/workout/SetLogger';
import { Button, Card, ProgressBar, GradientBackground } from '../../../components/ui';
import { useWorkoutStore, useCurrentExercise, useWorkoutProgress, useAuthStore } from '../../../stores';
import { SEED_EXERCISES } from '../../../constants/exercises';
import { calculateVolume } from '../../../lib/analytics';
import { rfs } from '../../../constants/theme';
import type { Exercise } from '../../../types';
import type { PRRecord } from '../../../stores/workoutStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getVolumeComparison = (volumeKg: number): { emoji: string; label: string } => {
  if (volumeKg < 100) return { emoji: '🐕', label: 'a large dog' };
  if (volumeKg < 500) return { emoji: '🎹', label: 'a grand piano' };
  if (volumeKg < 1000) return { emoji: '🐴', label: 'a horse' };
  if (volumeKg < 2000) return { emoji: '🚗', label: 'a car' };
  if (volumeKg < 5000) return { emoji: '🐘', label: 'an elephant' };
  if (volumeKg < 10000) return { emoji: '🚚', label: 'a truck' };
  return { emoji: '🚌', label: 'a school bus' };
};

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
  const tabScrollRef = useRef<FlatList>(null);

  const [restTimeRemaining, setRestTimeRemaining] = useState<number | undefined>();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isRestTimerMinimized, setIsRestTimerMinimized] = useState(false);
  const [showPrCelebration, setShowPrCelebration] = useState(false);
  const [celebratedPr, setCelebratedPr] = useState<PRRecord | null>(null);
  const [showFinishOverlay, setShowFinishOverlay] = useState(false);
  const [finishStats, setFinishStats] = useState<{ volume: number; prCount: number } | null>(null);
  const prevPrCountRef = useRef(0);

  // Watch for new PRs
  useEffect(() => {
    if (!activeSession) {
      prevPrCountRef.current = 0;
      return;
    }
    const currentCount = activeSession.prsHit.length;
    if (currentCount > prevPrCountRef.current && currentCount > 0) {
      const latestPr = activeSession.prsHit[currentCount - 1];
      setCelebratedPr(latestPr);
      setShowPrCelebration(true);
    }
    prevPrCountRef.current = currentCount;
  }, [activeSession?.prsHit.length]);

  // Timer for rest countdown
  useEffect(() => {
    if (!activeSession?.restTimerEnd) {
      setRestTimeRemaining(undefined);
      setIsRestTimerMinimized(false);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((activeSession.restTimerEnd!.getTime() - Date.now()) / 1000));
      setRestTimeRemaining(remaining);

      if (remaining === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearRestTimer();
        setIsRestTimerMinimized(false);
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

  // Auto-scroll tab bar to active exercise
  useEffect(() => {
    if (activeSession && tabScrollRef.current && activeSession.exercises.length > 0) {
      const timeout = setTimeout(() => {
        tabScrollRef.current?.scrollToIndex({
          index: activeSession.currentExerciseIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [activeSession?.currentExerciseIndex, activeSession?.exercises.length]);

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

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
          onPress: () => {
            // Calculate stats for the finish overlay
            const session = useWorkoutStore.getState().activeSession;
            if (!session) return;
            const allSets = session.exercises.flatMap((e) => e.completedSets);
            const volume = calculateVolume(allSets);
            const prCount = session.prsHit.length;
            setFinishStats({ volume, prCount });
            setShowFinishOverlay(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleFinishOverlayDismiss = async () => {
    await finishWorkout();
    setShowFinishOverlay(false);
    router.replace('/(tabs)/workout/summary');
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

  const handleSkipRest = () => {
    clearRestTimer();
    setIsRestTimerMinimized(false);
  };

  const setCurrentExerciseIndex = (index: number) => {
    const store = useWorkoutStore.getState();
    if (!store.activeSession) return;
    // Navigate to the target exercise
    const current = store.activeSession.currentExerciseIndex;
    if (index > current) {
      for (let i = 0; i < index - current; i++) nextExercise();
    } else if (index < current) {
      for (let i = 0; i < current - index; i++) previousExercise();
    }
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

  const restTimerActive = restTimeRemaining !== undefined && restTimeRemaining > 0;
  const restTimerTotal = currentExercise.restSeconds || 90;

  // Tab bar data: exercises + add button
  const tabData = [
    ...activeSession.exercises.map((ex, idx) => ({ type: 'exercise' as const, index: idx, name: ex.exerciseName })),
    { type: 'add' as const, index: -1, name: '+ Add' },
  ];

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

        {/* Minimized Rest Timer Bar */}
        {restTimerActive && isRestTimerMinimized && (
          <TouchableOpacity
            style={styles.miniRestBar}
            onPress={() => setIsRestTimerMinimized(false)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.miniRestGradient}
            >
              <Text style={styles.miniRestLabel}>REST</Text>
              <Text style={styles.miniRestTime}>{formatRestTime(restTimeRemaining)}</Text>
              <TouchableOpacity onPress={handleSkipRest}>
                <Text style={styles.miniRestSkip}>Skip</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Exercise Navigation — Scrollable Tab Bar */}
        <View style={styles.tabBarContainer}>
          <FlatList
            ref={tabScrollRef}
            data={tabData}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            keyExtractor={(item) => item.type === 'add' ? 'add' : `ex-${item.index}`}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              if (item.type === 'add') {
                return (
                  <TouchableOpacity
                    style={styles.tabPillAdd}
                    onPress={() => setShowExercisePicker(true)}
                  >
                    <Text style={styles.tabPillAddText}>+ Add</Text>
                  </TouchableOpacity>
                );
              }

              const isActive = item.index === activeSession.currentExerciseIndex;
              const exerciseState = activeSession.exercises[item.index];
              const isComplete = exerciseState.completedSets.filter(s => !s.skipped).length >= exerciseState.targetSets;

              return (
                <TouchableOpacity
                  onPress={() => setCurrentExerciseIndex(item.index)}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#4CFCAD', '#4CD0FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabPillActive}
                    >
                      <Text style={styles.tabPillActiveText} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.tabPill, isComplete && styles.tabPillComplete]}>
                      <Text style={[styles.tabPillText, isComplete && styles.tabPillCompleteText]} numberOfLines={1}>
                        {isComplete ? `${item.name} ✓` : item.name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
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
                  title="Next Exercise"
                  onPress={nextExercise}
                  variant="gradient"
                  size="lg"
                />
              ) : (
                <Button
                  title="Finish Workout"
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
                      {set.weight} {set.weight_unit} x {set.reps} reps
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

        {/* Full-Screen Rest Timer Overlay */}
        {restTimerActive && !isRestTimerMinimized && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsRestTimerMinimized(true)}
          >
            <LinearGradient
              colors={['rgba(4, 120, 87, 0.95)', 'rgba(6, 95, 70, 0.97)']}
              style={styles.restOverlay}
            >
              <Text style={styles.restOverlayLabel}>REST</Text>
              <Text style={styles.restOverlayTime}>{formatRestTime(restTimeRemaining)}</Text>

              {/* Progress bar */}
              <View style={styles.restOverlayProgressBar}>
                <View
                  style={[
                    styles.restOverlayProgressFill,
                    { width: `${(restTimeRemaining / restTimerTotal) * 100}%` },
                  ]}
                />
              </View>

              <Text style={styles.restOverlayExercise}>
                {currentExercise.exerciseName}
              </Text>

              <TouchableOpacity
                style={styles.restOverlaySkip}
                onPress={handleSkipRest}
              >
                <Text style={styles.restOverlaySkipText}>Skip Rest</Text>
              </TouchableOpacity>

              <Text style={styles.restOverlayHint}>Tap anywhere to minimize</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Full-Screen PR Celebration Overlay */}
        {showPrCelebration && celebratedPr && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPrCelebration(false)}
          >
            <LinearGradient
              colors={['rgba(250, 204, 21, 0.97)', 'rgba(245, 158, 11, 0.97)']}
              style={styles.prOverlay}
            >
              <Text style={styles.prOverlayEmoji}>🏆</Text>
              <Text style={styles.prOverlayTitle}>NEW PR!</Text>
              <Text style={styles.prOverlayExercise}>{celebratedPr.exerciseName}</Text>
              <Text style={styles.prOverlayDetail}>
                {celebratedPr.type === 'weight'
                  ? `${celebratedPr.value} kg — New max weight!`
                  : `${celebratedPr.value} reps — New max reps!`}
              </Text>
              <Text style={styles.prOverlayHint}>Tap anywhere to continue</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Full-Screen Motivational Finish Overlay */}
        {showFinishOverlay && finishStats && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleFinishOverlayDismiss}
          >
            <LinearGradient
              colors={['rgba(4, 120, 87, 0.97)', 'rgba(5, 150, 105, 0.97)']}
              style={styles.finishOverlay}
            >
              <Text style={styles.finishOverlayEmoji}>
                {getVolumeComparison(finishStats.volume).emoji}
              </Text>
              <Text style={styles.finishOverlayTitle}>WORKOUT COMPLETE!</Text>
              <Text style={styles.finishOverlayVolume}>
                {finishStats.volume.toLocaleString()} kg
              </Text>
              <Text style={styles.finishOverlayComparison}>
                That's the weight of {getVolumeComparison(finishStats.volume).label}!
              </Text>
              {finishStats.prCount > 0 && (
                <View style={styles.finishOverlayPrBadge}>
                  <Text style={styles.finishOverlayPrText}>
                    🏆 {finishStats.prCount} PR{finishStats.prCount > 1 ? 's' : ''} hit today!
                  </Text>
                </View>
              )}
              <Text style={styles.finishOverlayHint}>Tap anywhere to continue</Text>
            </LinearGradient>
          </Pressable>
        )}

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
    fontSize: rfs(16),
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutName: {
    color: '#0f172a',
    fontSize: rfs(18),
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
    fontSize: rfs(14),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    color: '#059669',
    fontSize: rfs(16),
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    fontSize: rfs(13),
    textAlign: 'center',
    marginTop: 6,
  },
  // Mini Rest Timer Bar
  miniRestBar: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniRestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  miniRestLabel: {
    color: '#000',
    fontSize: rfs(12),
    fontWeight: '700',
    letterSpacing: 1,
  },
  miniRestTime: {
    color: '#000',
    fontSize: rfs(18),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  miniRestSkip: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: rfs(14),
    fontWeight: '600',
  },
  // Scrollable Tab Bar
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 252, 173, 0.2)',
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    maxWidth: 140,
  },
  tabPillActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 140,
  },
  tabPillComplete: {
    backgroundColor: 'rgba(76, 252, 173, 0.15)',
  },
  tabPillText: {
    color: '#64748b',
    fontSize: rfs(13),
    fontWeight: '600',
  },
  tabPillActiveText: {
    color: '#000',
    fontSize: rfs(13),
    fontWeight: '700',
  },
  tabPillCompleteText: {
    color: '#059669',
  },
  tabPillAdd: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.3)',
    borderStyle: 'dashed',
  },
  tabPillAddText: {
    color: '#059669',
    fontSize: rfs(13),
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
    fontSize: rfs(40),
    color: '#000',
  },
  completeTitle: {
    fontSize: rfs(24),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: rfs(16),
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  completedSets: {
    marginTop: 24,
  },
  completedTitle: {
    fontSize: rfs(16),
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
    fontSize: rfs(14),
    fontWeight: '700',
  },
  setDetails: {
    color: '#0f172a',
    fontSize: rfs(15),
    fontWeight: '500',
  },
  skippedText: {
    color: '#94a3b8',
    fontSize: rfs(15),
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
    fontSize: rfs(14),
    fontWeight: '600',
  },
  volumeValue: {
    color: '#059669',
    fontSize: rfs(15),
    fontWeight: '700',
  },
  // Full-Screen Rest Timer Overlay
  restOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  restOverlayLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: rfs(16),
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 8,
  },
  restOverlayTime: {
    color: '#fff',
    fontSize: rfs(80),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  restOverlayProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 20,
  },
  restOverlayProgressFill: {
    height: '100%',
    backgroundColor: '#4CFCAD',
    borderRadius: 3,
  },
  restOverlayExercise: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: rfs(16),
    fontWeight: '600',
    marginBottom: 32,
  },
  restOverlaySkip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 24,
  },
  restOverlaySkipText: {
    color: '#fff',
    fontSize: rfs(16),
    fontWeight: '700',
  },
  restOverlayHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: rfs(13),
    fontWeight: '500',
  },
  // PR Celebration Overlay
  prOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  prOverlayEmoji: {
    fontSize: rfs(80),
    marginBottom: 16,
  },
  prOverlayTitle: {
    color: '#000',
    fontSize: rfs(36),
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  prOverlayExercise: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: rfs(20),
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  prOverlayDetail: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: rfs(16),
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  prOverlayHint: {
    color: 'rgba(0,0,0,0.3)',
    fontSize: rfs(13),
    fontWeight: '500',
  },
  // Motivational Finish Overlay
  finishOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  finishOverlayEmoji: {
    fontSize: rfs(80),
    marginBottom: 16,
  },
  finishOverlayTitle: {
    color: '#fff',
    fontSize: rfs(32),
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  finishOverlayVolume: {
    color: '#4CFCAD',
    fontSize: rfs(48),
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  finishOverlayComparison: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: rfs(18),
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  finishOverlayPrBadge: {
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 24,
  },
  finishOverlayPrText: {
    color: '#fef08a',
    fontSize: rfs(16),
    fontWeight: '700',
    textAlign: 'center',
  },
  finishOverlayHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: rfs(13),
    fontWeight: '500',
  },
  // Exercise Picker Styles
  pickerHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 252, 173, 0.2)',
  },
  pickerTitle: {
    fontSize: rfs(24),
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: rfs(15),
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
    fontSize: rfs(16),
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
    fontSize: rfs(12),
    fontWeight: '600',
  },
  tagSecondary: {
    backgroundColor: 'rgba(76, 208, 252, 0.2)',
  },
  tagTextSecondary: {
    color: '#0891b2',
    fontSize: rfs(12),
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
    fontSize: rfs(16),
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
    fontSize: rfs(16),
    fontWeight: '600',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: rfs(18),
    fontWeight: '700',
  },
});
