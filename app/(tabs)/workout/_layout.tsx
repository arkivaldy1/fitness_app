import { Stack } from 'expo-router';
import { theme } from '../../../constants/theme';

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
        }}
      />
    </Stack>
  );
}
