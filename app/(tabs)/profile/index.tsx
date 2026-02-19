import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, GradientBackground } from '../../../components/ui';
import { useAuthStore } from '../../../stores';
import { exportAllData, exportAsCSV } from '../../../lib/exportData';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, isOfflineMode, signOut, updateProfile } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    Alert.alert('Export Data', 'Choose export format:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'JSON (Full Backup)',
        onPress: async () => {
          if (!user) return;
          setExporting(true);
          try {
            await exportAllData(user.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to export data. Please try again.');
            console.error('Export JSON failed:', err);
          } finally {
            setExporting(false);
          }
        },
      },
      {
        text: 'CSV (Workouts)',
        onPress: async () => {
          if (!user) return;
          setExporting(true);
          try {
            await exportAsCSV(user.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to export data. Please try again.');
            console.error('Export CSV failed:', err);
          } finally {
            setExporting(false);
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleToggleUnits = async () => {
    const newUnit = profile?.weight_unit === 'kg' ? 'lb' : 'kg';
    await updateProfile({ weight_unit: newUnit });
  };

  return (
    <GradientBackground variant="full">
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {profile?.display_name?.[0]?.toUpperCase() || '💪'}
              </Text>
            </LinearGradient>
            <Text style={styles.name}>
              {profile?.display_name || 'Athlete'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
            {isOfflineMode && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>📴 Offline Mode</Text>
              </View>
            )}
          </View>

          {/* Stats Card */}
          <Card elevated style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>🏋️</Text>
                <Text style={styles.statValue}>
                  {formatExperience(profile?.experience_level || 'beginner')}
                </Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>⚖️</Text>
                <Text style={styles.statValue}>{profile?.weight_unit?.toUpperCase() || 'KG'}</Text>
                <Text style={styles.statLabel}>Units</Text>
              </View>
            </View>
          </Card>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <SettingsItem
              icon="⚖️"
              label="Weight Units"
              value={profile?.weight_unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
              onPress={handleToggleUnits}
            />

            <SettingsItem
              icon="📊"
              label="Experience Level"
              value={formatExperience(profile?.experience_level || 'beginner')}
              onPress={() => {
                const levels = ['beginner', 'intermediate', 'advanced'] as const;
                const currentIndex = levels.indexOf(profile?.experience_level || 'beginner');
                const nextLevel = levels[(currentIndex + 1) % levels.length];
                updateProfile({ experience_level: nextLevel });
              }}
            />

            <SettingsItem
              icon="🎯"
              label="Nutrition Targets"
              value="Configure"
              onPress={() => router.push('/(tabs)/nutrition/targets')}
            />

            <SettingsItem
              icon="⚖️"
              label="Body Weight"
              value={profile?.weight_kg
                ? `${profile.weight_unit === 'lb'
                    ? (profile.weight_kg * 2.20462).toFixed(1)
                    : profile.weight_kg.toFixed(1)} ${profile.weight_unit || 'kg'}`
                : 'Track'}
              onPress={() => router.push('/(tabs)/profile/weight')}
            />
          </View>

          {/* Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>

            <SettingsItem
              icon="📅"
              label="Workout History"
              value=""
              onPress={() => router.push('/(tabs)/workout/history')}
            />

            <SettingsItem
              icon="📤"
              label="Export Data"
              value={exporting ? 'Exporting...' : 'JSON / CSV'}
              onPress={handleExport}
              disabled={exporting}
            />
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            {isOfflineMode ? (
              <Card style={styles.offlineCard} elevated>
                <Text style={styles.offlineIcon}>☁️</Text>
                <Text style={styles.offlineTitle}>Sync Your Data</Text>
                <Text style={styles.offlineText}>
                  Create an account to back up your workouts and access them from any device.
                </Text>
                <Button
                  title="Create Account"
                  onPress={() => router.push('/(auth)/register')}
                  variant="gradient"
                  size="md"
                />
              </Card>
            ) : (
              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* App Info */}
          <View style={styles.footer}>
            <LinearGradient
              colors={['#4CFCAD', '#4CD0FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>FF</Text>
            </LinearGradient>
            <Text style={styles.appName}>Forge Fitness</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

interface SettingsItemProps {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon, label, value, onPress, disabled }) => (
  <TouchableOpacity style={[styles.settingsItem, disabled && { opacity: 0.6 }]} onPress={onPress} activeOpacity={0.7} disabled={disabled}>
    <View style={styles.settingsLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={styles.settingsLabel}>{label}</Text>
    </View>
    <View style={styles.settingsRight}>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      <Text style={styles.settingsArrow}>›</Text>
    </View>
  </TouchableOpacity>
);

function formatExperience(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
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
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  email: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  offlineBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  offlineBadgeText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: 24,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 252, 173, 0.15)',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    fontSize: 20,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsValue: {
    fontSize: 14,
    color: '#64748b',
  },
  settingsArrow: {
    fontSize: 24,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  offlineCard: {
    alignItems: 'center',
    padding: 24,
  },
  offlineIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  version: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
});
