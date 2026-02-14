import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, GradientBackground } from '../../../components/ui';
import { useAuthStore } from '../../../stores';
import { generateProgram, isAIConfigured, type ProgramRequest, type GeneratedProgram } from '../../../lib/ai';
import { saveGeneratedProgram } from '../../../lib/programs';
import { EQUIPMENT, MUSCLE_GROUPS } from '../../../constants/exercises';
import type { Equipment, MuscleGroup } from '../../../types';

type Step = 'goal' | 'schedule' | 'equipment' | 'focus' | 'generating' | 'result';

const GOALS = [
  { value: 'build_muscle', label: 'Build Muscle', emoji: '💪', desc: 'Maximize muscle growth with hypertrophy training' },
  { value: 'lose_fat', label: 'Lose Fat', emoji: '🔥', desc: 'Burn fat while preserving muscle mass' },
  { value: 'gain_strength', label: 'Get Stronger', emoji: '🏋️', desc: 'Increase your maximal strength' },
  { value: 'general_fitness', label: 'General Fitness', emoji: '⚡', desc: 'Balanced approach for overall health' },
] as const;

export default function GenerateProgramScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<ProgramRequest['goal']>('build_muscle');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'cable', 'machine']);
  const [focusAreas, setFocusAreas] = useState<MuscleGroup[]>([]);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (eq: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const toggleFocus = (muscle: MuscleGroup) => {
    setFocusAreas(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleGenerate = async () => {
    if (!isAIConfigured()) {
      Alert.alert(
        'API Key Required',
        'Add your Anthropic API key to EXPO_PUBLIC_ANTHROPIC_API_KEY in your environment to enable AI generation.',
        [{ text: 'OK' }]
      );
      return;
    }

    setStep('generating');
    setError(null);

    try {
      // Filter to only supported equipment types for AI
      const supportedEquipment = selectedEquipment.filter(
        (eq): eq is 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' =>
          ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].includes(eq)
      );

      const request: ProgramRequest = {
        goal,
        daysPerWeek,
        experienceLevel: profile?.experience_level || 'intermediate',
        sessionDuration,
        equipment: supportedEquipment.length > 0 ? supportedEquipment : ['bodyweight'],
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      };

      const program = await generateProgram(request);
      setGeneratedProgram(program);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate program');
      setStep('focus'); // Go back to last step
    }
  };

  const goBack = () => {
    const steps: Step[] = ['goal', 'schedule', 'equipment', 'focus'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'goal':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your goal?</Text>
            <Text style={styles.stepSubtitle}>We'll optimize your program for this objective</Text>

            <View style={styles.optionsGrid}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.goalCard, goal === g.value && styles.goalCardSelected]}
                  onPress={() => setGoal(g.value)}
                  activeOpacity={0.7}
                >
                  {goal === g.value ? (
                    <LinearGradient
                      colors={['#4CFCAD', '#4CD0FC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goalGradient}
                    >
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text style={[styles.goalLabel, styles.goalLabelSelected]}>{g.label}</Text>
                      <Text style={[styles.goalDesc, styles.goalDescSelected]}>{g.desc}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.goalContent}>
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text style={styles.goalLabel}>{g.label}</Text>
                      <Text style={styles.goalDesc}>{g.desc}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Continue →"
              onPress={() => setStep('schedule')}
              variant="gradient"
              size="lg"
              fullWidth
            />
          </View>
        );

      case 'schedule':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Training Schedule</Text>
            <Text style={styles.stepSubtitle}>How many days can you train?</Text>

            <View style={styles.daysRow}>
              {[2, 3, 4, 5, 6].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayButton, daysPerWeek === days && styles.dayButtonSelected]}
                  onPress={() => setDaysPerWeek(days)}
                >
                  {daysPerWeek === days ? (
                    <LinearGradient
                      colors={['#4CFCAD', '#4CD0FC']}
                      style={styles.dayGradient}
                    >
                      <Text style={[styles.dayNumber, styles.dayNumberSelected]}>{days}</Text>
                      <Text style={[styles.dayLabel, styles.dayLabelSelected]}>days</Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <Text style={styles.dayNumber}>{days}</Text>
                      <Text style={styles.dayLabel}>days</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 32 }]}>Session duration</Text>

            <View style={styles.durationRow}>
              {[45, 60, 75, 90].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.durationButton, sessionDuration === mins && styles.durationButtonSelected]}
                  onPress={() => setSessionDuration(mins)}
                >
                  <Text style={[styles.durationText, sessionDuration === mins && styles.durationTextSelected]}>
                    {mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card style={styles.recommendationCard}>
              <Text style={styles.recommendationEmoji}>💡</Text>
              <Text style={styles.recommendationText}>
                With {daysPerWeek} days/week, we recommend a{' '}
                <Text style={styles.recommendationHighlight}>
                  {daysPerWeek <= 3 ? 'Full Body' : daysPerWeek <= 4 ? 'Upper/Lower' : 'Push/Pull/Legs'}
                </Text>{' '}
                split for optimal results.
              </Text>
            </Card>

            <Button
              title="Continue →"
              onPress={() => setStep('equipment')}
              variant="gradient"
              size="lg"
              fullWidth
            />
          </View>
        );

      case 'equipment':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Equipment Access</Text>
            <Text style={styles.stepSubtitle}>Select what you have available</Text>

            <View style={styles.chipsContainer}>
              {EQUIPMENT.map((eq) => {
                const isSelected = selectedEquipment.includes(eq.value);
                return (
                  <TouchableOpacity
                    key={eq.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleEquipment(eq.value)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={['#4CFCAD', '#4CD0FC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipGradient}
                      >
                        <Text style={styles.chipTextSelected}>{eq.label}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.chipText}>{eq.label}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Continue →"
              onPress={() => setStep('focus')}
              variant="gradient"
              size="lg"
              fullWidth
              disabled={selectedEquipment.length === 0}
            />
          </View>
        );

      case 'focus':
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Focus Areas</Text>
              <Text style={styles.stepSubtitle}>Optional: Select muscles to prioritize</Text>

              <View style={styles.chipsContainer}>
                {MUSCLE_GROUPS.map((muscle) => {
                  const isSelected = focusAreas.includes(muscle.value);
                  return (
                    <TouchableOpacity
                      key={muscle.value}
                      style={[styles.chipSmall, isSelected && styles.chipSmallSelected]}
                      onPress={() => toggleFocus(muscle.value)}
                    >
                      <Text style={[styles.chipSmallText, isSelected && styles.chipSmallTextSelected]}>
                        {muscle.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error && (
                <Card style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>
                </Card>
              )}

              {/* Summary */}
              <Card elevated style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Program Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Goal</Text>
                  <Text style={styles.summaryValue}>
                    {GOALS.find(g => g.value === goal)?.label}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Schedule</Text>
                  <Text style={styles.summaryValue}>{daysPerWeek} days/week</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>{sessionDuration} min/session</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Experience</Text>
                  <Text style={styles.summaryValue}>
                    {(profile?.experience_level || 'intermediate').charAt(0).toUpperCase() +
                      (profile?.experience_level || 'intermediate').slice(1)}
                  </Text>
                </View>
              </Card>

              <Button
                title="Generate Program ✨"
                onPress={handleGenerate}
                variant="gradient"
                size="lg"
                fullWidth
              />
            </View>
          </ScrollView>
        );

      case 'generating':
        return (
          <View style={styles.generatingContainer}>
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              style={styles.generatingIcon}
            >
              <ActivityIndicator size="large" color="#000" />
            </LinearGradient>
            <Text style={styles.generatingTitle}>Creating Your Program</Text>
            <Text style={styles.generatingText}>
              Our AI is designing a personalized training plan based on your goals...
            </Text>
            <View style={styles.generatingSteps}>
              <Text style={styles.generatingStep}>✓ Analyzing your goals</Text>
              <Text style={styles.generatingStep}>✓ Selecting optimal exercises</Text>
              <Text style={[styles.generatingStep, styles.generatingStepActive]}>◉ Building weekly schedule</Text>
              <Text style={styles.generatingStepPending}>○ Finalizing program</Text>
            </View>
          </View>
        );

      case 'result':
        if (!generatedProgram) return null;
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepContent}>
              <View style={styles.successHeader}>
                <LinearGradient
                  colors={['#4CFCAD', '#4CD0FC']}
                  style={styles.successIcon}
                >
                  <Text style={styles.successEmoji}>✓</Text>
                </LinearGradient>
                <Text style={styles.successTitle}>Program Created!</Text>
              </View>

              <Card gradient elevated style={styles.programCard}>
                <Text style={styles.programName}>{generatedProgram.name}</Text>
                <Text style={styles.programDesc}>{generatedProgram.description}</Text>
                <View style={styles.programMeta}>
                  <Text style={styles.programSchedule}>📅 {generatedProgram.weeklySchedule}</Text>
                </View>
              </Card>

              {/* Workouts */}
              <Text style={styles.workoutsTitle}>Weekly Workouts</Text>
              {generatedProgram.workouts.map((workout, index) => (
                <Card key={index} style={styles.workoutCard} elevated>
                  <View style={styles.workoutHeader}>
                    <View>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutMeta}>
                        {workout.dayOfWeek} · ~{workout.targetDuration} min
                      </Text>
                    </View>
                    <View style={styles.exerciseCount}>
                      <Text style={styles.exerciseCountText}>{workout.exercises.length}</Text>
                      <Text style={styles.exerciseCountLabel}>exercises</Text>
                    </View>
                  </View>
                  <View style={styles.exerciseList}>
                    {workout.exercises.map((exercise, i) => (
                      <View key={i} style={styles.exerciseItem}>
                        <Text style={styles.exerciseNumber}>{i + 1}</Text>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseDetails}>
                            {exercise.sets} × {exercise.reps} · {exercise.restSeconds}s rest
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              ))}

              {/* Tips */}
              {generatedProgram.tips.length > 0 && (
                <Card style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
                  {generatedProgram.tips.map((tip, i) => (
                    <Text key={i} style={styles.tipText}>• {tip}</Text>
                  ))}
                </Card>
              )}

              <Button
                title="Save Program"
                onPress={async () => {
                  if (!generatedProgram || !user) return;
                  try {
                    const inputs: ProgramRequest = {
                      goal,
                      daysPerWeek,
                      experienceLevel: profile?.experience_level || 'intermediate',
                      sessionDuration,
                      equipment: selectedEquipment.filter(
                        (eq): eq is 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' =>
                          ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].includes(eq)
                      ),
                      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
                    };
                    await saveGeneratedProgram(user.id, generatedProgram, inputs);
                    Alert.alert('Saved!', 'Your program has been saved.', [
                      { text: 'OK', onPress: () => router.back() }
                    ]);
                  } catch (err) {
                    Alert.alert('Error', 'Failed to save program. Please try again.');
                  }
                }}
                variant="gradient"
                size="lg"
                fullWidth
              />

              <TouchableOpacity style={styles.regenerateButton} onPress={() => setStep('goal')}>
                <Text style={styles.regenerateText}>Generate a different program</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        {step !== 'generating' && step !== 'result' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.progress}>
              {['goal', 'schedule', 'equipment', 'focus'].map((s, i) => {
                const steps: Step[] = ['goal', 'schedule', 'equipment', 'focus'];
                const currentIndex = steps.indexOf(step);
                return (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      i <= currentIndex && styles.progressDotActive,
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.backButton} />
          </View>
        )}

        {step === 'focus' || step === 'result' ? renderStep() : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {renderStep()}
          </ScrollView>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 70,
  },
  backText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  progressDotActive: {
    backgroundColor: '#4CFCAD',
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
    gap: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  optionsGrid: {
    gap: 12,
  },
  goalCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  goalCardSelected: {
    // Handled by gradient
  },
  goalGradient: {
    padding: 20,
    borderRadius: 20,
  },
  goalContent: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  goalLabelSelected: {
    color: '#000',
  },
  goalDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  goalDescSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  dayButtonSelected: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  dayGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  dayNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  dayNumberSelected: {
    color: '#000',
  },
  dayLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  dayLabelSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  durationButtonSelected: {
    backgroundColor: '#4CFCAD',
    borderColor: '#4CFCAD',
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  durationTextSelected: {
    color: '#000',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(76, 252, 173, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.3)',
    marginTop: 16,
  },
  recommendationEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  recommendationHighlight: {
    color: '#059669',
    fontWeight: '700',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  chipSelected: {
    // Handled by gradient
  },
  chipGradient: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chipText: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
    overflow: 'hidden',
  },
  chipTextSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  chipSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  chipSmallSelected: {
    backgroundColor: '#4CFCAD',
    borderColor: '#4CFCAD',
  },
  chipSmallText: {
    fontSize: 14,
    color: '#64748b',
  },
  chipSmallTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  summaryCard: {
    padding: 20,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  generatingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  generatingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  generatingSteps: {
    alignItems: 'flex-start',
    gap: 12,
  },
  generatingStep: {
    fontSize: 15,
    color: '#4CFCAD',
    fontWeight: '500',
  },
  generatingStepActive: {
    color: '#059669',
    fontWeight: '700',
  },
  generatingStepPending: {
    fontSize: 15,
    color: '#94a3b8',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 40,
    color: '#000',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  programCard: {
    padding: 24,
    marginBottom: 24,
  },
  programName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  programDesc: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 22,
    marginBottom: 12,
  },
  programMeta: {
    marginTop: 8,
  },
  programSchedule: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '500',
  },
  workoutsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  workoutCard: {
    padding: 16,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  workoutMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  exerciseCount: {
    alignItems: 'center',
    backgroundColor: 'rgba(76, 252, 173, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  exerciseCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  exerciseCountLabel: {
    fontSize: 10,
    color: '#059669',
  },
  exerciseList: {
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 252, 173, 0.08)',
    padding: 12,
    borderRadius: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CFCAD',
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
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
  tipsCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(76, 252, 173, 0.08)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 6,
  },
  regenerateButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  regenerateText: {
    color: '#64748b',
    fontSize: 15,
  },
});
