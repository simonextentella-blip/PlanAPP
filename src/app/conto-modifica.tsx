import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { parseEuro } from '../lib/money';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { todayISO } from '../lib/dates';

/** Nuovo conto lavori (nome + saldo iniziale), oppure rinomina / elimina un conto esistente. */
export default function AccountEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getAccount, addAccount, updateAccount, removeAccount, addItem, items } = useStore();
  const existing = getAccount(id);
  const [name, setName] = useState(existing?.name ?? '');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const moves = existing ? items.filter((it) => it.account === existing.id).length : 0;

  function save() {
    const n = name.trim();
    if (!n) return setError('Dai un nome al conto, ad esempio "Cantiere Rossi".');
    if (existing) {
      updateAccount(existing.id, n);
      return router.back();
    }
    const amount = balance.trim() ? parseEuro(balance) : null;
    if (balance.trim() && amount == null) return setError('Saldo non valido: scrivi ad esempio 2000,00.');
    const acc = addAccount(n);
    if (amount != null) {
      addItem({ type: 'soldi', title: 'Saldo iniziale', description: '', date: todayISO(), time: null, done: false, amount, direction: 'entrata', account: acc.id });
    }
    router.replace({ pathname: '/conto', params: { id: acc.id } });
  }

  function remove() {
    if (!existing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    removeAccount(existing.id);
    router.dismissTo('/categoria/soldi');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Modifica conto' : 'Nuovo conto',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.headerBtn}>Annulla</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.headerBtn, { fontWeight: '700' }]}>Salva</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.label}>Nome del conto</Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError('');
            }}
            placeholder="Es. Cantiere Rossi, Furgone"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus={!existing}
          />
        </View>
        {existing ? null : (
          <View>
            <Text style={styles.label}>Saldo iniziale</Text>
            <View style={styles.amountRow}>
              <Text style={styles.euro}>€</Text>
              <TextInput
                value={balance}
                onChangeText={(v) => {
                  setBalance(v);
                  setError('');
                }}
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                style={[styles.input, { flex: 1 }]}
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.hint}>Puoi anche lasciarlo vuoto e impostarlo dopo.</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>{existing ? 'Salva modifiche' : 'Apri il conto'}</Text>
        </Pressable>
        {existing ? (
          <Pressable onPress={remove} style={[styles.deleteBtn, confirmDelete && { backgroundColor: colors.danger }]}>
            <Text style={[styles.deleteText, confirmDelete && { color: '#fff' }]}>
              {confirmDelete ? `Tocca di nuovo per eliminare${moves ? ` (anche ${moves} ${moves === 1 ? 'movimento' : 'movimenti'})` : ''}` : 'Elimina conto'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerBtn: { fontSize: 16, color: colors.primary, paddingHorizontal: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.text },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  euro: { fontSize: 18, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 6 },
  error: { color: colors.danger, fontSize: 14 },
  saveBtn: { backgroundColor: '#0F766E', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
