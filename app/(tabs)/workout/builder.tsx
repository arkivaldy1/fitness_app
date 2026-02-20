import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input, NumericInput } from '../../../components/ui';
import { ExerciseList, ExerciseCard } from '../../../components/workout/ExerciseList';
import { useAuthStore } from '../../../stores';
import {
  getAllExercises,
  searchExercises,
  createWorkoutTemplate,
  addExerciseToTemplate,
  getWorkoutTemplateWithExercises,
  updateWorkoutTemplate,
  replaceTemplateExercises,
  deleteWorkoutTemplate,
  createCustomExercise,
} from '../../../lib/database';
import { theme } from '../../../constants/theme';
import { MUSCLE_GROUPS, EQUIPMENT } from '../../../constants/exercises';
import type { Exercise, MuscleGroup, Equipment } from '../../../types';

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ templateId?: string }>();
  const { user, profile } = useAuthStore();

  const isEditing = !!params.templateId;

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showExerciseConfig, setShowExerciseConfig] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!isEditing);
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<Equipment | null>(null);

  // Create exercise state
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<MuscleGroup | null>(null);
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<Equipment | null>(null);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);

  // Config state
  const [configSets, setConfigSets] = useState(3);
  const [configReps, setConfigReps] = useState('8-12');
  const [configRest, setConfigRest] = useState(90);

  useEffect(() => {
    loadExercises();
    if (isEditing && params.templateId) {
      loadTemplate(params.templateId);
      navigation.setOptions({ title: 'Edit Workout' });
    }
  }, []);

  useEffect(() => {
    let result = allExercises;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (filterMuscle) {
      result = result.filter((e) => e.primary_muscle === filterMuscle);
    }
    if (filterEquipment) {
      result = result.filter((e) => e.equipment === filterEquipment);
    }

    setFilteredExercises(result);
  }, [searchQuery, allExercises, filterMuscle, filterEquipment]);

  const loadExercises = async () => {
    const exercises = await getAllExercises();
    setAllExercises(exercises);
    setFilteredExercises(exercises);
  };

  const loadTemplate = async (templateId: string) => {
    const data = await getWorkoutTemplateWithExercises(templateId);
    if (!data) return;

    setWorkoutName(data.name);
    setExercises(
      data.exercises.map((te) => ({
        id: `${te.exercise_id}_${te.order_index}`,
        exercise: {
          id: te.exercise_id,
          name: te.exercise?.name || 'Unknown',
          primary_muscle: (te.exercise?.primary_muscle || 'chest') as Exercise['primary_muscle'],
          secondary_muscles: null,
          equipment: (te.exercise?.equipment || 'barbell') as Exercise['equipment'],
          movement_pattern: null,
          is_compound: te.exercise?.is_compound || false,
          is_unilateral: false,
          instructions: null,
          video_url: null,
          is_system: true,
          user_id: null,
          created_at: '',
        },
        sets: te.target_sets,
        reps: te.target_reps,
        restSeconds: te.rest_seconds,
      }))
    );
    setIsLoaded(true);
  };

  const resetCreateForm = () => {
    setShowCreateExercise(false);
    setNewExerciseName('');
    setNewExerciseMuscle(null);
    setNewExerciseEquipment(null);
  };

  const handleCreateExercise = async () => {
    if (!user || !newExerciseName.trim() || !newExerciseMuscle || !newExerciseEquipment) return;

    setIsCreatingExercise(true);
    try {
      const exercise = await createCustomExercise(
        user.id,
        newExerciseName.trim(),
        newExerciseMuscle,
        newExerciseEquipment
      );
      setAllExercises((prev) => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)));
      resetCreateForm();
      handleSelectExercise(exercise);
    } catch (error) {
      console.error('Failed to create exercise:', error);
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditingExerciseId(null);
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

  const handleEditExercise = (ex: WorkoutExercise) => {
    setSelectedExercise(ex.exercise);
    setEditingExerciseId(ex.id);
    setConfigSets(ex.sets);
    setConfigReps(ex.reps);
    setConfigRest(ex.restSeconds);
    setShowExerciseConfig(true);
  };

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    if (editingExerciseId) {
      // Update existing exercise
      setExercises(
        exercises.map((e) =>
          e.id === editingExerciseId
            ? { ...e, sets: configSets, reps: configReps, restSeconds: configRest }
            : e
        )
      );
    } else {
      // Add new exercise
      const newExercise: WorkoutExercise = {
        id: `${selectedExercise.id}_${Date.now()}`,
        exercise: selectedExercise,
        sets: configSets,
        reps: configReps,
        restSeconds: configRest,
      };
      setExercises([...exercises, newExercise]);
    }

    setShowExerciseConfig(false);
    setSelectedExercise(null);
    setEditingExerciseId(null);
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
      if (isEditing && params.templateId) {
        // Update existing template
        await updateWorkoutTemplate(params.templateId, { name: workoutName.trim() });
        await replaceTemplateExercises(
          params.templateId,
          exercises.map((ex, i) => ({
            exercise_id: ex.exercise.id,
            order_index: i,
            superset_group: null,
            target_sets: ex.sets,
            target_reps: ex.reps,
            target_rpe: null,
            rest_seconds: ex.restSeconds,
            tempo: null,
            notes: null,
          }))
        );
      } else {
        // Create new template
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
      }

      router.back();
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!params.templateId) return;

    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkoutTemplate(params.templateId!);
            router.back();
          },
        },
      ]
    );
  };

  const canSave = workoutName.trim() && exercises.length > 0;

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              onPress={() => handleEditExercise(ex)}
            />
          ))}

          <Button
            title="+ Add Exercise"
            onPress={() => setShowExercisePicker(true)}
            variant="outline"
            fullWidth
          />
        </View>

        {/* Delete button for edit mode */}
        {isEditing && (
          <View style={styles.deleteSection}>
            <Button
              title="Delete Workout"
              onPress={handleDelete}
              variant="outline"
              fullWidth
              style={styles.deleteButton}
              textStyle={styles.deleteButtonText}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isEditing ? 'Save Changes' : 'Save Workout'}
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
            <TouchableOpacity onPress={() => {
              setShowExercisePicker(false);
              setFilterMuscle(null);
              setFilterEquipment(null);
              setSearchQuery('');
              resetCreateForm();
            }}>
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
              autoFocus={!showCreateExercise}
            />
          </View>

          {/* Create Custom Exercise */}
          {!showCreateExercise ? (
            <TouchableOpacity
              style={styles.createExerciseButton}
              onPress={() => setShowCreateExercise(true)}
            >
              <Text style={styles.createExerciseButtonText}>+ Create Custom Exercise</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView style={styles.createExerciseForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.createExerciseTitle}>New Exercise</Text>

              <TextInput
                style={styles.createExerciseInput}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="Exercise name"
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
              />

              <Text style={styles.createExerciseLabel}>Muscle Group</Text>
              <View style={styles.createChipWrap}>
                {MUSCLE_GROUPS.map((mg) => (
                  <TouchableOpacity
                    key={mg.value}
                    style={[styles.filterChip, newExerciseMuscle === mg.value && styles.filterChipActive]}
                    onPress={() => setNewExerciseMuscle(mg.value)}
                  >
                    <Text style={[styles.filterChipText, newExerciseMuscle === mg.value && styles.filterChipTextActive]}>
                      {mg.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.createExerciseLabel}>Equipment</Text>
              <View style={styles.createChipWrap}>
                {EQUIPMENT.map((eq) => (
                  <TouchableOpacity
                    key={eq.value}
                    style={[styles.filterChip, newExerciseEquipment === eq.value && styles.filterChipActive]}
                    onPress={() => setNewExerciseEquipment(eq.value)}
                  >
                    <Text style={[styles.filterChipText, newExerciseEquipment === eq.value && styles.filterChipTextActive]}>
                      {eq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.createExerciseActions}>
                <TouchableOpacity style={styles.createCancelButton} onPress={resetCreateForm}>
                  <Text style={styles.createCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createSaveButton,
                    (!newExerciseName.trim() || !newExerciseMuscle || !newExerciseEquipment) && styles.createSaveButtonDisabled,
                  ]}
                  onPress={handleCreateExercise}
                  disabled={!newExerciseName.trim() || !newExerciseMuscle || !newExerciseEquipment || isCreatingExercise}
                >
                  <Text style={styles.createSaveText}>
                    {isCreatingExercise ? 'Adding...' : 'Add Exercise'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Filter Chips */}
          {!showCreateExercise && (
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {MUSCLE_GROUPS.map((mg) => (
                  <TouchableOpacity
                    key={mg.value}
                    style={[styles.filterChip, filterMuscle === mg.value && styles.filterChipActive]}
                    onPress={() => setFilterMuscle(filterMuscle === mg.value ? null : mg.value)}
                  >
                    <Text style={[styles.filterChipText, filterMuscle === mg.value && styles.filterChipTextActive]}>
                      {mg.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {EQUIPMENT.filter((e) => e.value !== 'other').map((eq) => (
                  <TouchableOpacity
                    key={eq.value}
                    style={[styles.filterChip, filterEquipment === eq.value && styles.filterChipActive]}
                    onPress={() => setFilterEquipment(filterEquipment === eq.value ? null : eq.value)}
                  >
                    <Text style={[styles.filterChipText, filterEquipment === eq.value && styles.filterChipTextActive]}>
                      {eq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {(filterMuscle || filterEquipment) && (
                <TouchableOpacity
                  style={styles.clearFilters}
                  onPress={() => { setFilterMuscle(null); setFilterEquipment(null); }}
                >
                  <Text style={styles.clearFiltersText}>Clear filters ({filteredExercises.length} results)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!showCreateExercise && (
            <ExerciseList
              exercises={filteredExercises}
              onSelectExercise={handleSelectExercise}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Exercise Config Modal */}
      <Modal visible={showExerciseConfig} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.configOverlay}>
            <View style={styles.configModal}>
              <Text style={styles.configTitle}>{selectedExercise?.name}</Text>

              <View style={styles.configRow}>
                <View style={styles.configInputRow}>
                  <Text style={styles.configLabel}>Sets</Text>
                  <NumericInput
                    value={configSets}
                    onChange={setConfigSets}
                    min={1}
                    max={10}
                  />
                </View>
                <View style={styles.configInputRow}>
                  <Text style={styles.configLabel}>Reps</Text>
                  <TextInput
                    style={styles.configRepsInput}
                    value={configReps}
                    onChangeText={setConfigReps}
                    placeholder="8-12"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.configInputRow}>
                  <Text style={styles.configLabel}>Rest (seconds)</Text>
                  <NumericInput
                    value={configRest}
                    onChange={setConfigRest}
                    min={30}
                    max={300}
                    step={15}
                  />
                </View>
              </View>

              <View style={styles.configActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowExerciseConfig(false);
                    setEditingExerciseId(null);
                  }}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <Button
                  title={editingExerciseId ? 'Update' : 'Add'}
                  onPress={handleAddExercise}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  deleteSection: {
    marginTop: theme.spacing.xl,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
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
  filterSection: {
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearFilters: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
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
    flexDirection: 'column',
    gap: 16,
    marginBottom: theme.spacing.lg,
  },
  configInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
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
  createExerciseButton: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#059669',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createExerciseButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
  },
  createExerciseForm: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  createExerciseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  createExerciseInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createExerciseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  createChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  createExerciseActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  createCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  createCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  createSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  createSaveButtonDisabled: {
    opacity: 0.4,
  },
  createSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
