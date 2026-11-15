import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

/** Schermata di accesso: email e password create in Supabase per te e per il collega. */
export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!email.trim() || !password) {
      setError('Scrivi email e password.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/brand/raw-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Accedi a PlanApp</Text>
        <Text style={styles.sub}>Entra con il tuo account: tu e il collega vedrete gli stessi lavori, sopralluoghi e soldi.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            placeholder="nome@esempio.it"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="next"
          />
          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="Password"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="go"
            onSubmitEditing={go}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={go} disabled={busy} style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.8 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entra</Text>}
          </Pressable>
        </View>
        <Text style={styles.hint}>Gli account si creano in Supabase (Authentication → Users). Se hai dimenticato la password, cambiala da lì.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { width: 120, height: 120, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { fontSize: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: colors.text },
  error: { color: colors.danger, fontSize: 15, marginTop: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 4 },
});
