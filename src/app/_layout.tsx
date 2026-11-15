import '../lib/calendarLocale';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Login } from '../components/Login';
import { AuthProvider, useAuth } from '../lib/auth';
import { StoreProvider, useStore } from '../lib/store';
import { colors } from '../lib/theme';

function Gate() {
  const { ready } = useStore();
  const auth = useAuth();
  if (!ready || auth.loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (auth.configured && !auth.session) return <Login />;
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
      <Stack.Screen name="conto" options={{ title: '', headerBackTitle: 'Indietro' }} />
      <Stack.Screen name="conto-modifica" options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="item" options={{ presentation: 'modal', title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Gate />
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
