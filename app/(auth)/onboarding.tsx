import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { theme } from '../../constants/theme';
import type { ExperienceLevel, Goal, WeightUnit } from '../../types';

type OnboardingStep = 'name' | 'experience' | 'goal' | 'units';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuthStore();

  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [goal, setGoal] = useState<Goal>('general_fitness');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');

  const handleComplete = async () => {
    await updateProfile({
      display_name: name || null,
      experience_level: experience,
      weight_unit: weightUnit,
    });
    router.replace('/(tabs)/workout');
  };

  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <Text style={styles.stepDescription}>
              This is optional - you can skip if you prefer.
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoFocus
              containerStyle={styles.input}
            />
            <View style={styles.stepActions}>
              <Button
                title="Continue"
                onPress={() => setStep('experience')}
                variant="primary"
                size="lg"
                fullWidth
              />
              <Button
                title="Skip"
                onPress={() => setStep('experience')}
                variant="ghost"
                size="md"
              />
            </View>
          </View>
        );

      case 'experience':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Training Experience</Text>
            <Text style={styles.stepDescription}>
              This helps us customize defaults and suggestions.
            </Text>
            <View style={styles.options}>
              <OptionCard
                title="Beginner"
                description="New to lifting or less than 1 year"
                selected={experience === 'beginner'}
                onPress={() => setExperience('beginner')}
              />
              <OptionCard
                title="Intermediate"
                description="1-3 years of consistent training"
                selected={experience === 'intermediate'}
                onPress={() => setExperience('intermediate')}
              />
              <OptionCard
                title="Advanced"
                description="3+ years, refined technique"
                selected={experience === 'advanced'}
                onPress={() => setExperience('advanced')}
              />
            </View>
            <View style={styles.stepActions}>
              <Button
                title="Continue"
                onPress={() => setStep('goal')}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        );

      case 'goal':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Primary Goal</Text>
            <Text style={styles.stepDescription}>
              What are you training for? You can change this anytime.
            </Text>
            <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.options}>
                <OptionCard
                  title="Build Muscle"
                  description="Hypertrophy-focused training"
                  selected={goal === 'hypertrophy'}
                  onPress={() => setGoal('hypertrophy')}
                />
                <OptionCard
                  title="Get Stronger"
                  description="Strength and power focus"
                  selected={goal === 'strength'}
                  onPress={() => setGoal('strength')}
                />
                <OptionCard
                  title="Lose Fat"
                  description="Fat loss while preserving muscle"
                  selected={goal === 'fat_loss'}
                  onPress={() => setGoal('fat_loss')}
                />
                <OptionCard
                  title="General Fitness"
                  description="Balanced health and fitness"
                  selected={goal === 'general_fitness'}
                  onPress={() => setGoal('general_fitness')}
                />
              </View>
            </ScrollView>
            <View style={styles.stepActions}>
              <Button
                title="Continue"
                onPress={() => setStep('units')}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        );

      case 'units':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Weight Units</Text>
            <Text style={styles.stepDescription}>
              How do you prefer to track your lifts?
            </Text>
            <View style={styles.unitOptions}>
              <TouchableOpacity
                style={[styles.unitCard, weightUnit === 'kg' && styles.unitCardSelected]}
                onPress={() => setWeightUnit('kg')}
              >
                <Text style={[styles.unitValue, weightUnit === 'kg' && styles.unitValueSelected]}>
                  kg
                </Text>
                <Text style={styles.unitLabel}>Kilograms</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitCard, weightUnit === 'lb' && styles.unitCardSelected]}
                onPress={() => setWeightUnit('lb')}
              >
                <Text style={[styles.unitValue, weightUnit === 'lb' && styles.unitValueSelected]}>
                  lb
                </Text>
                <Text style={styles.unitLabel}>Pounds</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.stepActions}>
              <Button
                title="Start Training"
                onPress={handleComplete}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        {['name', 'experience', 'goal', 'units'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s === step && styles.progressDotActive,
              ['name', 'experience', 'goal', 'units'].indexOf(step) > i && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>
      {renderStep()}
    </SafeAreaView>
  );
}

interface OptionCardProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({ title, description, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.optionCard, selected && styles.optionCardSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.optionContent}>
      <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
    <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
      {selected && <View style={styles.optionRadioInner} />}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: theme.colors.primary,
  },
  stepContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  stepDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  input: {
    marginBottom: theme.spacing.lg,
  },
  options: {
    gap: theme.spacing.sm,
  },
  optionsScroll: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optionTitleSelected: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: theme.colors.primary,
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  unitOptions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  unitCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  unitValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
  },
  unitValueSelected: {
    color: theme.colors.primary,
  },
  unitLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  stepActions: {
    marginTop: 'auto',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
});
