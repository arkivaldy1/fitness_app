import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, GradientBackground } from '../../../components/ui';
import { useAuthStore } from '../../../stores';
import { getUserPrograms, deleteProgram, saveTemplateProgram, type SavedProgram } from '../../../lib/programs';
import { PROGRAM_TEMPLATES } from '../../../constants/programTemplates';

export default function ProgramsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    if (!user) return;
    try {
      const userPrograms = await getUserPrograms(user.id);
      setPrograms(userPrograms);
    } catch (err) {
      console.error('Failed to load programs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPrograms();
    }, [loadPrograms])
  );

  const handleDeleteProgram = (program: SavedProgram) => {
    Alert.alert(
      'Delete Program',
      `Are you sure you want to delete "${program.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgram(program.id);
              loadPrograms();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete program');
            }
          },
        },
      ]
    );
  };

  const handleUseTemplate = async (templateKey: string) => {
    if (!user || savingTemplate) return;
    const template = PROGRAM_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) return;

    setSavingTemplate(templateKey);
    try {
      const programId = await saveTemplateProgram(user.id, template);
      await loadPrograms();
      router.push({ pathname: '/(tabs)/programs/[id]', params: { id: programId } });
    } catch (err) {
      Alert.alert('Error', 'Failed to create program. Please try again.');
      console.error('Failed to save template program:', err);
    } finally {
      setSavingTemplate(null);
    }
  };

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Programs</Text>
            <Text style={styles.subtitle}>AI-powered training plans</Text>
          </View>

          {/* AI Generation Hero Card */}
          <Card gradient elevated style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI POWERED</Text>
              </View>
              <Text style={styles.aiSparkle}>✨</Text>
            </View>
            <Text style={styles.aiTitle}>Generate Your Perfect Program</Text>
            <Text style={styles.aiDescription}>
              Tell us your goals, schedule, and experience level. Our AI will create a personalized training program just for you.
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => router.push('/(tabs)/programs/generate')}
              activeOpacity={0.8}
            >
              <Text style={styles.aiButtonText}>Get Started →</Text>
            </TouchableOpacity>
          </Card>

          {/* My Programs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Programs</Text>

            {programs.length === 0 ? (
              <Card style={styles.emptyCard} elevated>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No programs yet</Text>
                <Text style={styles.emptySubtext}>
                  Generate a program with AI to get started
                </Text>
              </Card>
            ) : (
              programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onPress={() => router.push({ pathname: '/(tabs)/programs/[id]', params: { id: program.id } })}
                  onLongPress={() => handleDeleteProgram(program)}
                />
              ))
            )}
          </View>

          {/* Popular Templates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Templates</Text>

            <TemplateCard
              name="Push / Pull / Legs"
              templateKey="ppl"
              emoji="💪"
              days="6 days/week"
              level="Intermediate"
              description="Classic bodybuilding split targeting each movement pattern twice per week"
              color1="#4CFCAD"
              color2="#4CD0FC"
              saving={savingTemplate === 'ppl'}
              onPress={() => handleUseTemplate('ppl')}
            />

            <TemplateCard
              name="Upper / Lower"
              templateKey="upper_lower"
              emoji="⚡"
              days="4 days/week"
              level="Beginner-Intermediate"
              description="Balanced split for building strength and muscle with adequate recovery"
              color1="#4CD0FC"
              color2="#a78bfa"
              saving={savingTemplate === 'upper_lower'}
              onPress={() => handleUseTemplate('upper_lower')}
            />

            <TemplateCard
              name="Full Body"
              templateKey="full_body"
              emoji="🔥"
              days="3 days/week"
              level="Beginner"
              description="Hit every muscle group each session for maximum efficiency"
              color1="#f59e0b"
              color2="#4CFCAD"
              saving={savingTemplate === 'full_body'}
              onPress={() => handleUseTemplate('full_body')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const ProgramCard = ({ program, onPress, onLongPress }: {
  program: SavedProgram;
  onPress: () => void;
  onLongPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={styles.programWrapper}
    onPress={onPress}
    onLongPress={onLongPress}
  >
    <LinearGradient
      colors={['rgba(76, 252, 173, 0.15)', 'rgba(76, 208, 252, 0.15)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.programCard}
    >
      <View style={styles.programHeader}>
        <View style={styles.programIcon}>
          <Text style={styles.programIconText}>
            {program.is_ai_generated ? '✨' : '📋'}
          </Text>
        </View>
        <View style={styles.programMeta}>
          {program.is_ai_generated && (
            <View style={styles.aiGeneratedBadge}>
              <Text style={styles.aiGeneratedText}>AI Generated</Text>
            </View>
          )}
          {program.weekly_schedule && (
            <Text style={styles.programSchedule}>{program.weekly_schedule}</Text>
          )}
        </View>
      </View>
      <Text style={styles.programName}>{program.name}</Text>
      {program.description && (
        <Text style={styles.programDescription} numberOfLines={2}>
          {program.description}
        </Text>
      )}
      <View style={styles.programFooter}>
        <Text style={styles.viewProgram}>View Program →</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const TemplateCard = ({ name, templateKey, emoji, days, level, description, color1, color2, saving, onPress }: {
  name: string;
  templateKey: string;
  emoji: string;
  days: string;
  level: string;
  description: string;
  color1: string;
  color2: string;
  saving: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.7} style={styles.templateWrapper} onPress={onPress} disabled={saving}>
    <LinearGradient
      colors={[`${color1}15`, `${color2}15`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.templateCard}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateEmoji}>{emoji}</Text>
        <View style={styles.templateMeta}>
          <Text style={[styles.templateBadge, { backgroundColor: `${color1}30`, color: color1 }]}>
            {days}
          </Text>
          <Text style={styles.templateLevel}>{level}</Text>
        </View>
      </View>
      <Text style={styles.templateName}>{name}</Text>
      <Text style={styles.templateDescription}>{description}</Text>
      <View style={styles.templateFooter}>
        <Text style={[styles.useTemplate, { color: color1 }]}>
          {saving ? 'Creating...' : 'Use Template →'}
        </Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

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
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  aiCard: {
    padding: 24,
    marginBottom: 32,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  aiSparkle: {
    fontSize: 32,
  },
  aiTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  aiDescription: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 22,
    marginBottom: 20,
  },
  aiButton: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  programWrapper: {
    marginBottom: 12,
  },
  programCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.3)',
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 252, 173, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programIconText: {
    fontSize: 24,
  },
  programMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  aiGeneratedBadge: {
    backgroundColor: 'rgba(76, 252, 173, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiGeneratedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  programSchedule: {
    fontSize: 12,
    color: '#64748b',
  },
  programName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  programDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  programFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewProgram: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  templateWrapper: {
    marginBottom: 12,
  },
  templateCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.2)',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateEmoji: {
    fontSize: 32,
  },
  templateMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  templateBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  templateLevel: {
    fontSize: 12,
    color: '#64748b',
  },
  templateName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  templateFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  useTemplate: {
    fontSize: 14,
    fontWeight: '700',
  },
});
