import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '../../../stores';
import { formatDuration } from '../../../lib/analytics';
import { theme, rfs } from '../../../constants/theme';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { lastWorkoutSummary, clearSummary, updateSummaryRating } = useWorkoutStore();
  const [selectedRating, setSelectedRating] = useState<number | null>(
    lastWorkoutSummary?.rating ?? null
  );

  if (!lastWorkoutSummary) {
    router.replace('/(tabs)/workout');
    return null;
  }

  const handleRate = async (rating: number) => {
    setSelectedRating(rating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSummaryRating(rating);
  };

  const handleDone = () => {
    clearSummary();
    router.replace('/(tabs)/workout');
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}k`;
    }
    return `${Math.round(vol)}`;
  };

  return (
    <LinearGradient
      colors={['#ecfdf8', '#ecfeff', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Checkmark */}
          <LinearGradient
            colors={['#4CFCAD', '#4CD0FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkmarkCircle}
          >
            <Text style={styles.checkmark}>✓</Text>
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>{lastWorkoutSummary.workoutName}</Text>
          <Text style={styles.duration}>
            {formatDuration(lastWorkoutSummary.durationSeconds)}
          </Text>

          {/* Stats — Single Combined Card */}
          <View style={styles.statsCardContainer}>
            <LinearGradient
              colors={['rgba(76, 252, 173, 0.10)', 'rgba(76, 208, 252, 0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statsCard}
            >
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>
                  {formatVolume(lastWorkoutSummary.totalVolume)}
                </Text>
                <Text style={styles.statUnit}>kg</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>
                  {lastWorkoutSummary.exercisesCompleted}
                </Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statValue}>
                  {lastWorkoutSummary.setsCompleted}
                </Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
            </LinearGradient>
          </View>

          {/* PRs */}
          {lastWorkoutSummary.prsHit.length > 0 && (
            <View style={styles.prSection}>
              <Text style={styles.prSectionTitle}>Personal Records</Text>
              {lastWorkoutSummary.prsHit.map((pr, index) => (
                <LinearGradient
                  key={`${pr.exerciseId}-${pr.type}-${index}`}
                  colors={['#fef9c3', '#fef08a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.prItem}
                >
                  <Text style={styles.prEmoji}>🏆</Text>
                  <View style={styles.prInfo}>
                    <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                    <Text style={styles.prDetail}>
                      {pr.type === 'weight'
                        ? `New max weight: ${pr.value} kg`
                        : `New max reps: ${pr.value}`}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}

          {/* Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>How was your workout?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRate(star)}
                  style={styles.starButton}
                >
                  <Text style={[
                    styles.starText,
                    selectedRating !== null && star <= selectedRating && styles.starActive,
                  ]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Done Button */}
          <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: rfs(48),
    color: '#000',
    fontWeight: '700',
  },
  title: {
    fontSize: rfs(28),
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  duration: {
    fontSize: rfs(18),
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 32,
  },
  statsCardContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(76, 252, 173, 0.3)',
  },
  statValue: {
    fontSize: rfs(28),
    fontWeight: '800',
    color: theme.colors.text,
  },
  statUnit: {
    fontSize: rfs(12),
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginTop: -2,
  },
  statLabel: {
    fontSize: rfs(12),
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  prSection: {
    width: '100%',
    marginBottom: 28,
  },
  prSectionTitle: {
    fontSize: rfs(18),
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  prEmoji: {
    fontSize: rfs(24),
    marginRight: 12,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: rfs(15),
    fontWeight: '700',
    color: '#92400e',
  },
  prDetail: {
    fontSize: rfs(13),
    color: '#a16207',
    marginTop: 2,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingTitle: {
    fontSize: rfs(16),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: rfs(36),
    color: '#e2e8f0',
  },
  starActive: {
    color: '#facc15',
  },
  doneButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  doneText: {
    fontSize: rfs(18),
    fontWeight: '700',
    color: '#000',
  },
});
