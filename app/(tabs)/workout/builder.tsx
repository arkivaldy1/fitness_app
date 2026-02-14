import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input, NumericInput } from '../../../components/ui';
import { ExerciseList, ExerciseCard } from '../../../components/workout/ExerciseList';
import { useAuthStore } from '../../../stores';
import { getAllExercises, searchExercises, createWorkoutTemplate, addExerciseToTemplate } from '../../../lib/database';
import { theme } from '../../../constants/theme';
import type { Exercise } from '../../../types';

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showExerciseConfig, setShowExerciseConfig] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Config state
  const [configSets, setConfigSets] = useState(3);
  const [configReps, setConfigReps] = useState('8-12');
  const [configRest, setConfigRest] = useState(90);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchExercises(searchQuery).then(setFilteredExercises);
    } else {
      setFilteredExercises(allExercises);
    }
  }, [searchQuery, allExercises]);

  const loadExercises = async () => {
    const exercises = await getAllExercises();
    setAllExercises(exercises);
    setFilteredExercises(exercises);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExercisePicker(false);
    setShowExerciseConfig(true);

    // Set defaults based on experience
    const isCompound = exercise.is_compound;
    if (profile?.experience_level === 'beginner') {
      setConfigSets(3);
      setConfigRest(isCompound ? 120 : 90);
    } else {
      setConfigSets(isCompound ? 4 : 3);
      setConfigRest(isCompound ? 90 : 60);
    }
    setConfigReps('8-12');
  };

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    const newExercise: WorkoutExercise = {
      id: `${selectedExercise.id}_${Date.now()}`,
      exercise: selectedExercise,
      sets: configSets,
      reps: configReps,
      restSeconds: configRest,
    };

    setExercises([...exercises, newExercise]);
    setShowExerciseConfig(false);
    setSelectedExercise(null);
    setSearchQuery('');
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    const newExercises = [...exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];
    setExercises(newExercises);
  };

  const handleSave = async () => {
    if (!user || !workoutName.trim() || exercises.length === 0) return;

    setIsSaving(true);

    try {
      const templateId = await createWorkoutTemplate({
        user_id: user.id,
        program_id: null,
        name: workoutName.trim(),
        day_of_week: null,
        order_index: 0,
        target_duration_minutes: null,
      });

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await addExerciseToTemplate({
          workout_template_id: templateId,
          exercise_id: ex.exercise.id,
          order_index: i,
          superset_group: null,
          target_sets: ex.sets,
          target_reps: ex.reps,
          target_rpe: null,
          rest_seconds: ex.restSeconds,
          tempo: null,
          notes: null,
        });
      }

      router.back();
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = workoutName.trim() && exercises.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Workout Name"
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="e.g., Push Day A"
          containerStyle={styles.nameInput}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <Text style={styles.exerciseCount}>{exercises.length} exercises</Text>
          </View>

          {exercises.map((ex, index) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex.exercise}
              sets={ex.sets}
              reps={ex.reps}
              restSeconds={ex.restSeconds}
              orderIndex={index}
              onRemove={() => handleRemoveExercise(ex.id)}
              onReorder={(direction) => handleReorder(index, direction)}
            />
          ))}

          <Button
            title="+ Add Exercise"
            onPress={() => setShowExercisePicker(true)}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Save Workout"
          onPress={handleSave}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSave}
          loading={isSaving}
        />
      </View>

      {/* Exercise Picker Modal */}
      <Modal visible={showExercisePicker} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
          </View>

          <ExerciseList
            exercises={filteredExercises}
            onSelectExercise={handleSelectExercise}
          />
        </SafeAreaView>
      </Modal>

      {/* Exercise Config Modal */}
      <Modal visible={showExerciseConfig} animationType="slide" transparent>
        <View style={styles.configOverlay}>
          <View style={styles.configModal}>
            <Text style={styles.configTitle}>{selectedExercise?.name}</Text>

            <View style={styles.configRow}>
              <NumericInput
                value={configSets}
                onChange={setConfigSets}
                min={1}
                max={10}
                label="Sets"
              />
              <View style={styles.configRepsContainer}>
                <Text style={styles.configLabel}>Reps</Text>
                <TextInput
                  style={styles.configRepsInput}
                  value={configReps}
                  onChangeText={setConfigReps}
                  placeholder="8-12"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <NumericInput
                value={configRest}
                onChange={setConfigRest}
                min={30}
                max={300}
                step={15}
                label="Rest (s)"
              />
            </View>

            <View style={styles.configActions}>
              <Button
                title="Cancel"
                onPress={() => setShowExerciseConfig(false)}
                variant="ghost"
                style={{ flex: 1 }}
              />
              <Button
                title="Add"
                onPress={handleAddExercise}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  nameInput: {
    marginBottom: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  exerciseCount: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancel: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    padding: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
  },
  configOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  configModal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  configRepsContainer: {
    alignItems: 'center',
  },
  configLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  configRepsInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  configActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
