import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, NumericInput, Card } from '../../../components/ui';
import { useAuthStore, useNutritionStore, calculateTDEE, calculateMacros } from '../../../stores';
import { theme } from '../../../constants/theme';

type CalculatorStep = 'method' | 'details' | 'goal' | 'review';

export default function NutritionTargetsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { targets, updateTargets, loadDay } = useNutritionStore();

  const [method, setMethod] = useState<'manual' | 'calculator'>('calculator');
  const [step, setStep] = useState<CalculatorStep>('method');

  // Manual values
  const [calories, setCalories] = useState(targets?.calories || 2000);
  const [protein, setProtein] = useState(targets?.protein || 150);
  const [carbs, setCarbs] = useState(targets?.carbs || 200);
  const [fat, setFat] = useState(targets?.fat || 70);
  const [water, setWater] = useState(targets?.water_ml || 3000);

  // Calculator values
  const [weight, setWeight] = useState(profile?.weight_kg || 70);
  const [height, setHeight] = useState(profile?.height_cm || 170);
  const [age, setAge] = useState(25);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    await updateTargets(user.id, {
      calories,
      protein,
      carbs,
      fat,
      water_ml: water,
      calculation_method: method === 'manual' ? 'manual' : 'tdee_calculated',
      calculation_inputs: method === 'calculator' ? { weight, height, age, sex, activityLevel, goal } : null,
    });

    // Reload today's data with new targets
    await loadDay(user.id);

    router.back();
  };

  const calculateTargets = () => {
    const tdee = calculateTDEE(weight, height, age, sex, activityLevel);
    const macros = calculateMacros(tdee, weight, goal);

    setCalories(macros.calories);
    setProtein(macros.protein);
    setCarbs(macros.carbs);
    setFat(macros.fat);
    setWater(Math.round(weight * 35)); // ~35ml per kg bodyweight
  };

  useEffect(() => {
    if (method === 'calculator' && step === 'review') {
      calculateTargets();
    }
  }, [step]);

  const renderStep = () => {
    switch (step) {
      case 'method':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How would you like to set targets?</Text>

            <TouchableOpacity
              style={[styles.methodCard, method === 'calculator' && styles.methodCardSelected]}
              onPress={() => setMethod('calculator')}
            >
              <Text style={styles.methodTitle}>Calculate for Me</Text>
              <Text style={styles.methodDesc}>
                We'll calculate your needs based on your stats and goals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, method === 'manual' && styles.methodCardSelected]}
              onPress={() => setMethod('manual')}
            >
              <Text style={styles.methodTitle}>Enter Manually</Text>
              <Text style={styles.methodDesc}>
                Set your own calorie and macro targets
              </Text>
            </TouchableOpacity>

            <Button
              title="Continue"
              onPress={() => setStep(method === 'manual' ? 'review' : 'details')}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.continueButton}
            />
          </View>
        );

      case 'details':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Details</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Weight (kg)</Text>
                <NumericInput value={weight} onChange={setWeight} min={30} max={300} step={1} />
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Height (cm)</Text>
                <NumericInput value={height} onChange={setHeight} min={100} max={250} step={1} />
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Age</Text>
                <NumericInput value={age} onChange={setAge} min={15} max={100} step={1} />
              </View>
            </View>

            <View style={styles.sexSelector}>
              <Text style={styles.detailLabel}>Sex</Text>
              <View style={styles.sexButtons}>
                <TouchableOpacity
                  style={[styles.sexButton, sex === 'male' && styles.sexButtonSelected]}
                  onPress={() => setSex('male')}
                >
                  <Text style={[styles.sexButtonText, sex === 'male' && styles.sexButtonTextSelected]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sexButton, sex === 'female' && styles.sexButtonSelected]}
                  onPress={() => setSex('female')}
                >
                  <Text style={[styles.sexButtonText, sex === 'female' && styles.sexButtonTextSelected]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.activitySelector}>
              <Text style={styles.detailLabel}>Activity Level</Text>
              {[
                { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
                { value: 'light', label: 'Light', desc: '1-2 workouts/week' },
                { value: 'moderate', label: 'Moderate', desc: '3-4 workouts/week' },
                { value: 'active', label: 'Active', desc: '5-6 workouts/week' },
                { value: 'very_active', label: 'Very Active', desc: 'Daily training + active job' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.activityOption, activityLevel === option.value && styles.activityOptionSelected]}
                  onPress={() => setActivityLevel(option.value as typeof activityLevel)}
                >
                  <Text style={styles.activityLabel}>{option.label}</Text>
                  <Text style={styles.activityDesc}>{option.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Continue"
              onPress={() => setStep('goal')}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.continueButton}
            />
          </View>
        );

      case 'goal':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Goal</Text>

            {[
              { value: 'lose', label: 'Lose Fat', desc: '~500 calorie deficit, ~0.5kg/week' },
              { value: 'maintain', label: 'Maintain', desc: 'Stay at current weight' },
              { value: 'gain', label: 'Build Muscle', desc: '~300 calorie surplus, lean bulk' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.goalOption, goal === option.value && styles.goalOptionSelected]}
                onPress={() => setGoal(option.value as typeof goal)}
              >
                <Text style={[styles.goalLabel, goal === option.value && styles.goalLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.goalDesc}>{option.desc}</Text>
              </TouchableOpacity>
            ))}

            <Button
              title="Calculate Targets"
              onPress={() => setStep('review')}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.continueButton}
            />
          </View>
        );

      case 'review':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {method === 'manual' ? 'Set Your Targets' : 'Your Daily Targets'}
            </Text>

            <Card style={styles.reviewCard}>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Calories</Text>
                <NumericInput value={calories} onChange={setCalories} min={1000} max={6000} step={50} unit="kcal" />
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Protein</Text>
                <NumericInput value={protein} onChange={setProtein} min={0} max={500} step={5} unit="g" />
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Carbs</Text>
                <NumericInput value={carbs} onChange={setCarbs} min={0} max={700} step={5} unit="g" />
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Fat</Text>
                <NumericInput value={fat} onChange={setFat} min={0} max={300} step={5} unit="g" />
              </View>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Water</Text>
                <NumericInput value={water} onChange={setWater} min={1000} max={6000} step={250} unit="ml" />
              </View>
            </Card>

            <Text style={styles.macroCalc}>
              Macros = {protein * 4 + carbs * 4 + fat * 9} kcal
            </Text>

            <Button
              title="Save Targets"
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSaving}
              style={styles.continueButton}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderStep()}
      </ScrollView>
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
    paddingBottom: theme.spacing['2xl'],
  },
  stepContent: {
    gap: theme.spacing.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  methodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: theme.colors.primary,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  methodDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  continueButton: {
    marginTop: theme.spacing.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  sexSelector: {
    marginBottom: theme.spacing.lg,
  },
  sexButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sexButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  sexButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  sexButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  sexButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  activitySelector: {
    gap: theme.spacing.sm,
  },
  activityOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityOptionSelected: {
    borderColor: theme.colors.primary,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  activityDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  goalOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  goalLabelSelected: {
    color: theme.colors.primary,
  },
  goalDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  reviewCard: {
    gap: theme.spacing.lg,
  },
  targetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  macroCalc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
