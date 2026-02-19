import { Stack } from 'expo-router';
import { theme } from '../../../constants/theme';

export default function NutritionLayout() {
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
          title: 'Nutrition',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Entry',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Entry',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Nutrition Trends',
        }}
      />
      <Stack.Screen
        name="targets"
        options={{
          title: 'Set Targets',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
