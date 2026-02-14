import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { theme } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const continueOffline = useAuthStore((s) => s.continueOffline);

  const handleContinueOffline = async () => {
    await continueOffline();
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FORGE</Text>
          </View>
          <Text style={styles.tagline}>Build Strength. Track Progress.</Text>
        </View>

        {/* Description */}
        <View style={styles.features}>
          <FeatureItem
            icon="💪"
            title="Log Workouts"
            description="Fast, friction-free set logging"
          />
          <FeatureItem
            icon="🎯"
            title="Track Nutrition"
            description="Hit your macro targets daily"
          />
          <FeatureItem
            icon="🤖"
            title="AI Programs"
            description="Personalized training plans"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Create Account"
            onPress={() => router.push('/(auth)/register')}
            variant="primary"
            size="lg"
            fullWidth
          />
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            size="lg"
            fullWidth
          />
          <Button
            title="Continue Offline"
            onPress={handleContinueOffline}
            variant="ghost"
            size="md"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: theme.spacing['2xl'],
  },
  logoContainer: {
    marginBottom: theme.spacing.md,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    gap: theme.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureIcon: {
    fontSize: 32,
    width: 48,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: theme.spacing.md,
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
  },
});
