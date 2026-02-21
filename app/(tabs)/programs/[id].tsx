import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, GradientBackground } from '../../../components/ui';
import { getProgramWithWorkouts, deleteProgram } from '../../../lib/programs';
import { getWorkoutTemplateWithExercises } from '../../../lib/database';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { useAuthStore } from '../../../stores/authStore';

interface ProgramDetail {
  id: string;
  name: string;
  description: string | null;
  weekly_schedule: string | null;
  is_ai_generated: boolean;
  tips: string[] | null;
  workouts: {
    id: string;
    name: string;
    day_of_week: number | null;
    target_duration_minutes: number | null;
    exercise_count: number;
    completion_count: number;
    last_completed_at: string | null;
  }[];
}

interface WorkoutDetail {
  id: string;
  name: string;
  exercises: {
    id: string;
    exercise_id: string;
    order_index: number;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    notes: string | null;
    exercise?: {
      id: string;
      name: string;
      primary_muscle?: string;
      equipment?: string;
    };
  }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const isCompletedThisWeek = (lastCompleted: string | null): boolean => {
  if (!lastCompleted) return false;
  return lastCompleted >= getWeekStart();
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = d.toLocaleString('default', { month: 'short' });
  return `${month} ${d.getDate()}`;
};

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeSession, startWorkout, cancelWorkout } = useWorkoutStore();
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<Record<string, WorkoutDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgram();
  }, [id]);

  const loadProgram = async () => {
    if (!id) return;
    try {
      const data = await getProgramWithWorkouts(id);
      setProgram(data);
    } catch (err) {
      console.error('Failed to load program:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutDetails = async (workoutId: string) => {
    if (workoutDetails[workoutId]) return;
    try {
      const details = await getWorkoutTemplateWithExercises(workoutId);
      if (details) {
        setWorkoutDetails(prev => ({ ...prev, [workoutId]: details }));
      }
    } catch (err) {
      console.error('Failed to load workout details:', err);
    }
  };

  const toggleWorkout = (workoutId: string) => {
    if (expandedWorkout === workoutId) {
      setExpandedWorkout(null);
    } else {
      setExpandedWorkout(workoutId);
      loadWorkoutDetails(workoutId);
    }
  };

  const handleDelete = () => {
    if (!program) return;
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgram(program.id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete program');
            }
          },
        },
      ]
    );
  };

  const handleStartWorkout = async (workoutId: string) => {
    if (!user) return;
    if (activeSession) {
      Alert.alert(
        'Active Workout',
        'You already have a workout in progress.',
        [
          {
            text: 'Resume Current',
            onPress: () => router.push('/(tabs)/workout/log'),
          },
          {
            text: 'Discard & Start New',
            style: 'destructive',
            onPress: async () => {
              try {
                cancelWorkout();
                await startWorkout(workoutId, user.id);
                router.push('/(tabs)/workout/log');
              } catch (err) {
                Alert.alert('Error', 'Failed to start workout');
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    try {
      await startWorkout(workoutId, user.id);
      router.push('/(tabs)/workout/log');
    } catch (err) {
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  if (loading || !program) {
    return (
      <GradientBackground variant="full">
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Program Header */}
          <Card gradient elevated style={styles.programCard}>
            <View style={styles.programHeader}>
              {program.is_ai_generated && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>✨ AI Generated</Text>
                </View>
              )}
            </View>
            <Text style={styles.programName}>{program.name}</Text>
            {program.description && (
              <Text style={styles.programDescription}>{program.description}</Text>
            )}
            {program.weekly_schedule && (
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleIcon}>📅</Text>
                <Text style={styles.scheduleText}>{program.weekly_schedule}</Text>
              </View>
            )}
          </Card>

          {/* Weekly Progress */}
          {(() => {
            const completedThisWeek = program.workouts.filter(
              (w) => isCompletedThisWeek(w.last_completed_at)
            ).length;
            const total = program.workouts.length;
            return (
              <Card style={styles.progressCard} elevated>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>This Week</Text>
                  <Text style={styles.progressCount}>
                    {completedThisWeek}/{total}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: total > 0 ? `${(completedThisWeek / total) * 100}%` : '0%' },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {completedThisWeek === 0
                    ? 'No workouts completed yet'
                    : completedThisWeek === total
                      ? 'All workouts completed!'
                      : `${total - completedThisWeek} workout${total - completedThisWeek > 1 ? 's' : ''} remaining`}
                </Text>
              </Card>
            );
          })()}

          {/* Workouts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Workouts ({program.workouts.length})
            </Text>

            {program.workouts.map((workout, index) => {
              const isExpanded = expandedWorkout === workout.id;
              const details = workoutDetails[workout.id];
              const doneThisWeek = isCompletedThisWeek(workout.last_completed_at);

              return (
                <Card key={workout.id} style={styles.workoutCard} elevated>
                  <View style={styles.workoutHeader}>
                    <TouchableOpacity
                      style={styles.workoutHeaderLeft}
                      activeOpacity={0.7}
                      onPress={() => toggleWorkout(workout.id)}
                    >
                      <View style={[styles.workoutIndex, doneThisWeek && styles.workoutIndexDone]}>
                        {doneThisWeek ? (
                          <Text style={styles.workoutIndexCheckText}>✓</Text>
                        ) : (
                          <Text style={styles.workoutIndexText}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>{workout.name}</Text>
                        <Text style={styles.workoutMeta}>
                          {workout.day_of_week !== null && `${DAYS[workout.day_of_week]} · `}
                          {workout.exercise_count} exercises
                          {workout.target_duration_minutes && ` · ~${workout.target_duration_minutes} min`}
                        </Text>
                        {workout.completion_count > 0 && (
                          <Text style={styles.workoutCompletionMeta}>
                            Completed {workout.completion_count} time{workout.completion_count !== 1 ? 's' : ''}
                            {workout.last_completed_at && ` · Last: ${formatDate(workout.last_completed_at)}`}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.startButton}
                      activeOpacity={0.7}
                      onPress={() => handleStartWorkout(workout.id)}
                    >
                      <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                  </View>

                  {isExpanded && details && (
                    <View style={styles.exerciseList}>
                      {details.exercises.map((exercise, i) => (
                        <View key={exercise.id} style={styles.exerciseItem}>
                          <View style={styles.exerciseNumber}>
                            <Text style={styles.exerciseNumberText}>{i + 1}</Text>
                          </View>
                          <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName}>
                              {exercise.exercise?.name || 'Unknown Exercise'}
                            </Text>
                            <Text style={styles.exerciseDetails}>
                              {exercise.target_sets} × {exercise.target_reps}
                              {exercise.rest_seconds > 0 && ` · ${exercise.rest_seconds}s rest`}
                            </Text>
                            {exercise.notes && (
                              <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>

          {/* Tips */}
          {program.tips && program.tips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Success</Text>
              <Card style={styles.tipsCard}>
                {program.tips.map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    <Text style={styles.tipBullet}>💡</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </Card>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  programCard: {
    padding: 24,
    marginBottom: 24,
  },
  programHeader: {
    marginBottom: 12,
  },
  aiBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  programName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  programDescription: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 22,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleIcon: {
    fontSize: 16,
  },
  scheduleText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '500',
  },
  progressCard: {
    padding: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  workoutCard: {
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CFCAD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  workoutIndex: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#4CFCAD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutIndexDone: {
    backgroundColor: '#059669',
  },
  workoutIndexText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  workoutIndexCheckText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  workoutMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  workoutCompletionMeta: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
  exerciseList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 252, 173, 0.08)',
    padding: 12,
    borderRadius: 12,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 252, 173, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  exerciseDetails: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  exerciseNotes: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  tipsCard: {
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
});
