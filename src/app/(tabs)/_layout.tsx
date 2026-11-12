import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';
import { colors } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: icon('home-outline'),
          headerRight: () => (
            <Pressable onPress={() => router.push('/profilo')} hitSlop={10} style={{ paddingHorizontal: 16 }} accessibilityLabel="Profilo">
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="lavori" options={{ title: 'Lavori', tabBarIcon: icon('construct-outline') }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendario', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="note" options={{ title: 'Tutte le note', tabBarLabel: 'Note', tabBarIcon: icon('list-outline') }} />
    </Tabs>
  );
}
