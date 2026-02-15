import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, Platform } from 'react-native';
import { theme } from '../../../constants/theme';

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
      <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>
        {Platform.OS === 'ios' ? '‹ Back' : '← Back'}
      </Text>
    </TouchableOpacity>
  );
}

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Workouts',
        }}
      />
      <Stack.Screen
        name="builder"
        options={{
          title: 'Build Workout',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="log"
        options={{
          title: 'Logging',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'History',
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          title: 'Workout Complete',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="exercise-history"
        options={{
          title: 'Exercise History',
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
