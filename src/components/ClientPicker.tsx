import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CAN_IMPORT_CONTACTS, pickContact } from '../lib/contacts';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { EMPTY_CLIENT, type Client } from '../lib/types';
import { Avatar } from './Avatar';

/** Campo "Cliente": mostra il cliente scelto e apre l'elenco per sceglierne o crearne uno. */
export function ClientPicker({ value, onChange, color = colors.primary }: { value: string | null | undefined; onChange: (c: Client | null) => void; color?: string }) {
  const { clients, getClient, addClient } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = getClient(value);

  const q = query.trim().toLowerCase();
  const list = q ? clients.filter((c) => `${c.name} ${c.cityLine} ${c.phone}`.toLowerCase().includes(q)) : clients;
  const exact = clients.some((c) => c.name.trim().toLowerCase() === q);

  const [importError, setImportError] = useState('');

  async function importFromContacts() {
    setImportError('');
    try {
      const c = await pickContact();
      if (!c) return;
      if (!c.name) return setImportError('Il contatto scelto non ha un nome.');
      const same = clients.find((x) => x.name.trim().toLowerCase() === c.name.toLowerCase() && (!c.phone || x.phone.replace(/\s/g, '') === c.phone.replace(/\s/g, '')));
      pick(same ?? addClient({ ...EMPTY_CLIENT, name: c.name, phone: c.phone, email: c.email }));
    } catch (e) {
      setImportError(e instanceof Error && e.message.startsWith('Per importare') ? e.message : 'Non è stato possibile leggere il contatto.');
    }
  }

  function pick(c: Client | null) {
    onChange(c);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.field, selected && { borderColor: color }]} accessibilityRole="button" accessibilityLabel="Scegli cliente">
        <Ionicons name="person-outline" size={20} color={selected ? color : colors.muted} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <Text style={styles.name} numberOfLines={1}>
                {selected.name}
              </Text>
              {selected.cityLine || selected.phone ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {[selected.cityLine, selected.phone].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.placeholder}>Scegli dai clienti…</Text>
          )}
        </View>
        {selected ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Togli cliente">
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Clienti</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={[styles.close, { color }]}>Chiudi</Text>
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Cerca o scrivi un nuovo nome…" placeholderTextColor={colors.muted} style={styles.searchInput} autoFocus />
          </View>
          {CAN_IMPORT_CONTACTS && !q ? (
            <Pressable onPress={importFromContacts} style={styles.newRow}>
              <Ionicons name="person-add-outline" size={22} color={color} />
              <Text style={[styles.newText, { color }]}>Importa dai contatti</Text>
            </Pressable>
          ) : null}
          {importError ? <Text style={styles.importError}>{importError}</Text> : null}
          {q && !exact ? (
            <Pressable onPress={() => pick(addClient({ ...EMPTY_CLIENT, name: query.trim() }))} style={styles.newRow}>
              <Ionicons name="add-circle" size={22} color={color} />
              <Text style={[styles.newText, { color }]}>Nuovo cliente: “{query.trim()}”</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={list}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={[styles.row, item.id === value && { backgroundColor: colors.bg }]}>
                <Avatar name={item.name} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {[item.address, item.cityLine, item.phone].filter(Boolean).join(' · ') || 'Nessun dettaglio'}
                  </Text>
                </View>
                {item.id === value ? <Ionicons name="checkmark" size={20} color={color} /> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{q ? 'Nessun cliente trovato.' : 'Nessun cliente salvato. Scrivi un nome qui sopra per crearlo.'}</Text>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  placeholder: { fontSize: 16, color: colors.muted },
  modal: { flex: 1, backgroundColor: colors.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  close: { fontSize: 17, fontWeight: '600' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 16, color: colors.text },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  newText: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  importError: { color: colors.danger, fontSize: 14, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { padding: 24, textAlign: 'center', color: colors.muted },
});
