import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />;
}

/** Il + generale: un cerchio verde acceso che sporge sopra la barra e apre "Nuova voce". */
function AddButton() {
  return (
    <View style={styles.addSlot}>
      <Pressable
        onPress={() => router.push('/item')}
        style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.94 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Aggiungi"
        hitSlop={8}
      >
        <Ionicons name="add" size={34} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Home, Lavori e Sopralluoghi disegnano il proprio titolo grande al posto della barra. */}
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="lavori" options={{ title: 'Lavori', headerShown: false, tabBarIcon: icon('construct-outline') }} />
      <Tabs.Screen name="aggiungi" options={{ title: 'Aggiungi', tabBarButton: () => <AddButton /> }} />
      <Tabs.Screen name="sopralluoghi" options={{ title: 'Sopralluoghi', headerShown: false, tabBarIcon: icon('location-outline') }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendario', tabBarIcon: icon('calendar-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addSlot: { flex: 1, alignItems: 'center' },
  add: {
    marginTop: -22,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
