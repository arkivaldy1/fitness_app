import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, GradientBackground } from '../../../components/ui';
import { useAuthStore, useWorkoutStore } from '../../../stores';
import { getWorkoutTemplates, getRecentWorkoutSessions, deleteWorkoutTemplate } from '../../../lib/database';
import { theme } from '../../../constants/theme';
import type { WorkoutTemplate, WorkoutSession } from '../../../types';

export default function WorkoutScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { activeSession, startWorkout, startQuickWorkout } = useWorkoutStore();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [loadedTemplates, loadedSessions] = await Promise.all([
      getWorkoutTemplates(user.id),
      getRecentWorkoutSessions(user.id, 5),
    ]);
    setTemplates(loadedTemplates);
    setRecentSessions(loadedSessions);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleStartWorkout = async (templateId: string) => {
    if (!user) return;
    await startWorkout(templateId, user.id);
    router.push('/(tabs)/workout/log');
  };

  const handleQuickWorkout = async () => {
    if (!user) return;
    await startQuickWorkout('Quick Workout', user.id);
    router.push('/(tabs)/workout/log');
  };

  const handleEditTemplate = (template: WorkoutTemplate) => {
    router.push({
      pathname: '/(tabs)/workout/builder' as any,
      params: { templateId: template.id },
    });
  };

  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Workout',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkoutTemplate(template.id);
            await loadData();
          },
        },
      ]
    );
  };

  // If there's an active session, show resume option
  if (activeSession) {
    return (
      <GradientBackground variant="full">
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.activeSession}>
            <View style={styles.activeIcon}>
              <Text style={styles.activeIconText}>💪</Text>
            </View>
            <Text style={styles.activeLabel}>WORKOUT IN PROGRESS</Text>
            <Text style={styles.activeName}>{activeSession.template.name}</Text>
            <Text style={styles.activeTime}>
              Started {formatTimeAgo(activeSession.startTime)}
            </Text>
            <View style={styles.activeActions}>
              <Button
                title="Resume Workout"
                onPress={() => router.push('/(tabs)/workout/log')}
                variant="gradient"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4CFCAD"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Ready to train?</Text>
            <Text style={styles.title}>Workout</Text>
          </View>

          {/* Quick Start Card */}
          <Card gradient elevated style={styles.quickStartCard}>
            <View style={styles.quickStartContent}>
              <Text style={styles.quickStartEmoji}>⚡</Text>
              <View style={styles.quickStartText}>
                <Text style={styles.quickStartTitle}>Quick Workout</Text>
                <Text style={styles.quickStartSubtitle}>Start logging exercises now</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.quickStartButton}
              onPress={handleQuickWorkout}
              activeOpacity={0.8}
            >
              <Text style={styles.quickStartButtonText}>START</Text>
            </TouchableOpacity>
          </Card>

          {/* Create Workout */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/workout/builder')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(76, 252, 173, 0.1)', 'rgba(76, 208, 252, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonIcon}>+</Text>
              <Text style={styles.createButtonText}>Create Custom Workout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* My Workouts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Workouts</Text>
              {templates.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/workout/builder')}>
                  <Text style={styles.sectionAction}>+ New</Text>
                </TouchableOpacity>
              )}
            </View>

            {templates.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No saved workouts yet</Text>
                <Text style={styles.emptySubtext}>
                  Create a workout template or use Quick Workout to get started
                </Text>
              </Card>
            ) : (
              <View style={styles.templateList}>
                {templates.map((template, index) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateCard}
                    onPress={() => handleStartWorkout(template.id)}
                    onLongPress={() => handleDeleteTemplate(template)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={index % 2 === 0
                        ? ['rgba(76, 252, 173, 0.08)', 'rgba(76, 208, 252, 0.08)']
                        : ['rgba(76, 208, 252, 0.08)', 'rgba(76, 252, 173, 0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.templateGradient}
                    >
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        {template.target_duration_minutes && (
                          <Text style={styles.templateMeta}>
                            ~{template.target_duration_minutes} min
                          </Text>
                        )}
                      </View>
                      <View style={styles.templateActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditTemplate(template)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.editIcon}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.playButton}
                          onPress={() => handleStartWorkout(template.id)}
                        >
                          <Text style={styles.playIcon}>▶</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
                <Text style={styles.templateHint}>Long press to delete</Text>
              </View>
            )}
          </View>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/workout/history')}>
                  <Text style={styles.sectionAction}>See All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sessionList}>
                {recentSessions.map((session) => (
                  <View key={session.id} style={styles.sessionItem}>
                    <View style={styles.sessionDot} />
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>
                        {session.template_snapshot.name}
                      </Text>
                      <Text style={styles.sessionDate}>
                        {formatDate(session.started_at)}
                      </Text>
                    </View>
                    {session.duration_seconds && (
                      <Text style={styles.sessionDuration}>
                        {formatDuration(session.duration_seconds)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickStartCard: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickStartEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  quickStartText: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  quickStartSubtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
  },
  quickStartButton: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickStartButtonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  createButton: {
    marginBottom: 32,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(76, 252, 173, 0.3)',
    borderStyle: 'dashed',
  },
  createButtonIcon: {
    fontSize: 24,
    color: '#059669',
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionAction: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  templateList: {
    gap: 12,
  },
  templateCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  templateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  templateMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 252, 173, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    color: '#059669',
    fontSize: 16,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CFCAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#000',
    fontSize: 14,
    marginLeft: 2,
  },
  templateHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  sessionList: {
    gap: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.15)',
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CFCAD',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  sessionDate: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  sessionDuration: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeSession: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  activeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  activeIconText: {
    fontSize: 40,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CFCAD',
    letterSpacing: 2,
    marginBottom: 8,
  },
  activeName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  activeTime: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  activeActions: {
    width: '100%',
    maxWidth: 300,
  },
});
