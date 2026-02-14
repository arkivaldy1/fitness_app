import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Card } from '../ui';
import { theme } from '../../constants/theme';
import type { Exercise } from '../../types';

interface ExerciseListProps {
  exercises: Exercise[];
  onSelectExercise: (exercise: Exercise) => void;
  selectedIds?: string[];
}

export const ExerciseList: React.FC<ExerciseListProps> = ({
  exercises,
  onSelectExercise,
  selectedIds = [],
}) => {
  const renderItem = ({ item }: { item: Exercise }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.exerciseItem, isSelected && styles.exerciseItemSelected]}
        onPress={() => onSelectExercise(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.exerciseMeta}>
            <Text style={styles.metaText}>{formatMuscle(item.primary_muscle)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatEquipment(item.equipment)}</Text>
          </View>
        </View>
        {item.is_compound && (
          <View style={styles.compoundBadge}>
            <Text style={styles.compoundBadgeText}>C</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedCheck}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={exercises}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

// Exercise card for workout builder
interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    primary_muscle?: string;
    equipment?: string;
  };
  sets: number;
  reps: string;
  restSeconds: number;
  orderIndex: number;
  onPress?: () => void;
  onRemove?: () => void;
  onReorder?: (direction: 'up' | 'down') => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  sets,
  reps,
  restSeconds,
  orderIndex,
  onPress,
  onRemove,
  onReorder,
}) => {
  return (
    <Card style={styles.exerciseCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{orderIndex + 1}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardExerciseName}>{exercise.name}</Text>
          <Text style={styles.cardMeta}>
            {sets} sets × {reps} reps · {restSeconds}s rest
          </Text>
        </View>
        {onRemove && (
          <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      {onReorder && (
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => onReorder('up')}
          >
            <Text style={styles.reorderButtonText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => onReorder('down')}
          >
            <Text style={styles.reorderButtonText}>↓</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
};

// Helpers
function formatMuscle(muscle: string): string {
  return muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ');
}

function formatEquipment(equipment: string): string {
  return equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  metaDot: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginHorizontal: 6,
  },
  compoundBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  compoundBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  selectedCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Exercise card styles
  exerciseCard: {
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  orderText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardInfo: {
    flex: 1,
  },
  cardExerciseName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginTop: -2,
  },
  reorderButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
});
