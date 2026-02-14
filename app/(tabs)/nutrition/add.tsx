import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, NumericInput } from '../../../components/ui';
import { useAuthStore, useNutritionStore } from '../../../stores';
import { theme } from '../../../constants/theme';

export default function AddNutritionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { day, addEntry } = useNutritionStore();

  const [label, setLabel] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !day || calories === 0) return;

    setIsSaving(true);

    await addEntry({
      user_id: user.id,
      label: label || null,
      calories,
      protein,
      carbs,
      fat,
      water_ml: 0,
      meal_template_id: null,
    });

    router.back();
  };

  const canSave = calories > 0;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Label (optional)"
            value={label}
            onChangeText={setLabel}
            placeholder="e.g., Lunch, Protein shake"
            containerStyle={styles.input}
          />

          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Calories</Text>
              <NumericInput
                value={calories}
                onChange={setCalories}
                min={0}
                max={5000}
                step={10}
                unit="kcal"
              />
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Protein</Text>
              <NumericInput
                value={protein}
                onChange={setProtein}
                min={0}
                max={500}
                step={1}
                unit="g"
              />
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <NumericInput
                value={carbs}
                onChange={setCarbs}
                min={0}
                max={500}
                step={1}
                unit="g"
              />
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Fat</Text>
              <NumericInput
                value={fat}
                onChange={setFat}
                min={0}
                max={500}
                step={1}
                unit="g"
              />
            </View>
          </View>

          {/* Calculated check */}
          {calories > 0 && (
            <View style={styles.calculatedContainer}>
              <Text style={styles.calculatedLabel}>Calculated from macros:</Text>
              <Text style={styles.calculatedValue}>
                {protein * 4 + carbs * 4 + fat * 9} kcal
              </Text>
              {Math.abs(calories - (protein * 4 + carbs * 4 + fat * 9)) > 50 && (
                <Text style={styles.calculatedWarning}>
                  Note: This differs from entered calories
                </Text>
              )}
            </View>
          )}

          {/* Quick presets */}
          <View style={styles.presets}>
            <Text style={styles.presetsTitle}>Quick Add</Text>
            <View style={styles.presetButtons}>
              <QuickPreset
                label="Protein Shake"
                calories={150}
                protein={30}
                carbs={5}
                fat={2}
                onPress={() => {
                  setLabel('Protein Shake');
                  setCalories(150);
                  setProtein(30);
                  setCarbs(5);
                  setFat(2);
                }}
              />
              <QuickPreset
                label="Chicken Breast"
                calories={165}
                protein={31}
                carbs={0}
                fat={4}
                onPress={() => {
                  setLabel('Chicken Breast (100g)');
                  setCalories(165);
                  setProtein(31);
                  setCarbs(0);
                  setFat(4);
                }}
              />
              <QuickPreset
                label="Rice (1 cup)"
                calories={205}
                protein={4}
                carbs={45}
                fat={0}
                onPress={() => {
                  setLabel('Rice (1 cup)');
                  setCalories(205);
                  setProtein(4);
                  setCarbs(45);
                  setFat(0);
                }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Add Entry"
            onPress={handleSave}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSave}
            loading={isSaving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface QuickPresetProps {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onPress: () => void;
}

const QuickPreset: React.FC<QuickPresetProps> = ({ label, calories, onPress }) => (
  <Button
    title={`${label}\n${calories} kcal`}
    onPress={onPress}
    variant="outline"
    size="sm"
    style={styles.presetButton}
    textStyle={styles.presetButtonText}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  input: {
    marginBottom: theme.spacing.lg,
  },
  macroGrid: {
    gap: theme.spacing.lg,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  calculatedContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  calculatedLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
  },
  calculatedWarning: {
    fontSize: 12,
    color: theme.colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  presets: {
    marginTop: theme.spacing.xl,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  presetButtons: {
    gap: theme.spacing.sm,
  },
  presetButton: {
    paddingVertical: theme.spacing.sm,
  },
  presetButtonText: {
    textAlign: 'center',
    fontSize: 13,
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
});
