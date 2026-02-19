import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, NumericInput } from '../../../components/ui';
import { useNutritionStore } from '../../../stores';
import { theme } from '../../../constants/theme';

export default function EditNutritionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entryId: string;
    label: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }>();

  const { updateEntry, deleteEntry } = useNutritionStore();

  const [label, setLabel] = useState(params.label || '');
  const [calories, setCalories] = useState(Number(params.calories) || 0);
  const [protein, setProtein] = useState(Number(params.protein) || 0);
  const [carbs, setCarbs] = useState(Number(params.carbs) || 0);
  const [fat, setFat] = useState(Number(params.fat) || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!params.entryId || calories === 0) return;
    setIsSaving(true);

    await updateEntry(params.entryId, {
      label: label || null,
      calories,
      protein,
      carbs,
      fat,
    });

    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this food entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!params.entryId) return;
            await deleteEntry(params.entryId);
            router.back();
          },
        },
      ]
    );
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

          <View style={styles.deleteSection}>
            <Button
              title="Delete Entry"
              onPress={handleDelete}
              variant="outline"
              size="lg"
              fullWidth
              style={styles.deleteButton}
              textStyle={styles.deleteButtonText}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Save Changes"
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
  deleteSection: {
    marginTop: theme.spacing.xl,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
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
