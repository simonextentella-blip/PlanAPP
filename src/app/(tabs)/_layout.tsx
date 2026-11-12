import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Calendario', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="note"
        options={{ title: 'Tutte le note', tabBarLabel: 'Note', tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profilo"
        options={{ title: 'Profilo', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
