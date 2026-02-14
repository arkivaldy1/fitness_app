import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="💪" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🥗" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
    {focused ? (
      <LinearGradient
        colors={['#4CFCAD', '#4CD0FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconGradient}
      >
        <Text style={styles.iconActive}>{icon}</Text>
      </LinearGradient>
    ) : (
      <Text style={styles.icon}>{icon}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
    shadowColor: '#4CFCAD',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    // Active state handled by gradient
  },
  icon: {
    fontSize: 24,
    opacity: 0.5,
  },
  iconActive: {
    fontSize: 24,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
