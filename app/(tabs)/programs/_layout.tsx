import { Stack } from 'expo-router';
import { theme } from '../../../constants/theme';

export default function ProgramsLayout() {
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
          title: 'Programs',
        }}
      />
      <Stack.Screen
        name="generate"
        options={{
          title: 'Generate Program',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
