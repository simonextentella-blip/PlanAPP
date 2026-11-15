import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ItemCard } from '../components/ItemCard';
import { CAN_IMPORT_CONTACTS, pickContact } from '../lib/contacts';
import { openPhone, type PhoneAction } from '../lib/phone';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { EMPTY_CLIENT, type NewClient } from '../lib/types';

const PHONE_ACTIONS: { action: PhoneAction; label: string; icon: keyof typeof Ionicons.glyphMap; color?: string }[] = [
  { action: 'call', label: 'Chiama', icon: 'call-outline' },
  { action: 'sms', label: 'Messaggio', icon: 'chatbubble-outline' },
  { action: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
];

const FIELDS: { key: keyof NewClient; label: string; placeholder: string; keyboard?: 'phone-pad' | 'email-address'; multiline?: boolean }[] = [
  { key: 'name', label: 'Nome e cognome / ragione sociale', placeholder: 'Es. Giovanni Bardocci' },
  { key: 'address', label: 'Indirizzo', placeholder: 'Es. Via dei Pini 4' },
  { key: 'cityLine', label: 'CAP Città (Prov.)', placeholder: 'Es. 00052 Manziana (RM)' },
  { key: 'taxId', label: 'C.F. / P.IVA', placeholder: '' },
  { key: 'phone', label: 'Telefono', placeholder: '', keyboard: 'phone-pad' },
  { key: 'email', label: 'Email', placeholder: '', keyboard: 'email-address' },
  { key: 'notes', label: 'Note', placeholder: 'Es. citofono, orari, referente…', multiline: true },
];

export default function ClientScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getClient, addClient, updateClient, removeClient, items } = useStore();
  const existing = getClient(id);
  const [data, setData] = useState<NewClient>(existing ? { ...EMPTY_CLIENT, ...existing } : EMPTY_CLIENT);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const linked = existing ? items.filter((it) => it.clientId === existing.id) : [];

  async function importFromContacts() {
    setError('');
    try {
      const c = await pickContact();
      if (!c) return;
      if (!c.name && !c.phone) return setError('Il contatto scelto non ha nome né telefono.');
      setData((d) => ({
        ...d,
        name: c.name || d.name,
        phone: c.phone || d.phone,
        email: d.email.trim() ? d.email : c.email,
      }));
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('Per importare') ? e.message : 'Non è stato possibile leggere il contatto.');
    }
  }

  const hasPhone = data.phone.replace(/\D/g, '').length >= 6;

  async function contact(action: PhoneAction) {
    setError('');
    if (!(await openPhone(action, data.phone))) setError('Non è stato possibile aprire l\'app sul telefono.');
  }

  function save() {
    if (!data.name.trim()) return setError('Scrivi il nome del cliente.');
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v).trim()])) as unknown as NewClient;
    if (existing) updateClient(existing.id, clean);
    else addClient(clean);
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? existing.name : 'Nuovo cliente',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={styles.headerBtn}>Salva</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hasPhone ? (
          <View style={styles.actions}>
            {PHONE_ACTIONS.map((a) => (
              <Pressable key={a.action} onPress={() => contact(a.action)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={`${a.label} ${data.name}`.trim()}>
                <Ionicons name={a.icon} size={22} color={a.color ?? colors.primary} />
                <Text style={styles.actionText}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {CAN_IMPORT_CONTACTS ? (
          <Pressable onPress={importFromContacts} style={styles.importBtn} accessibilityRole="button">
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={styles.importText}>Importa dai contatti</Text>
          </Pressable>
        ) : null}
        <View style={styles.card}>
          {FIELDS.map((f) => (
            <View key={f.key} style={{ gap: 4 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                value={data[f.key]}
                onChangeText={(v) => (setData((d) => ({ ...d, [f.key]: v })), setError(''))}
                placeholder={f.placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={f.keyboard}
                autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                multiline={f.multiline}
                style={[styles.input, f.multiline && { minHeight: 70 }]}
              />
            </View>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>{existing ? 'Salva modifiche' : 'Aggiungi cliente'}</Text>
        </Pressable>

        {existing ? (
          <>
            <Text style={styles.section}>Storico ({linked.length})</Text>
            {linked.length ? (
              linked.map((it) => (
                <View key={it.id} style={{ marginHorizontal: -16 }}>
                  <ItemCard item={it} showDate />
                </View>
              ))
            ) : (
              <Text style={styles.muted}>Nessun sopralluogo, preventivo o lavoro collegato.</Text>
            )}
            <Pressable
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                removeClient(existing.id);
                router.back();
              }}
              style={styles.delete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteText}>{confirmDelete ? 'Tocca di nuovo per eliminare' : 'Elimina cliente'}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  headerBtn: { fontSize: 17, color: colors.primary, fontWeight: '700', paddingHorizontal: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { fontSize: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.text },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12, backgroundColor: colors.card },
  importText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10 },
  muted: { fontSize: 14, color: colors.muted },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
