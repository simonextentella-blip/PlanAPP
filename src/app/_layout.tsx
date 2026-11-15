import '../lib/calendarLocale';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../lib/store';
import { colors } from '../lib/theme';

function Gate() {
  const { ready } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profilo" options={{ title: 'Profilo', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="note" options={{ title: 'Note', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="categoria/[type]" options={{ title: '', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="preventivo" options={{ title: '', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="preventivo-doc" options={{ title: '', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="clienti" options={{ title: 'Clienti', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="cliente" options={{ title: '', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="item" options={{ presentation: 'modal', title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
