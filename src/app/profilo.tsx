import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { ITEM_TYPES, TYPE_INFO } from '../lib/types';

export default function ProfileScreen() {
  const { userName, setUserName, items, company, setCompany } = useStore();
  const [draft, setDraft] = useState(userName);
  const [comp, setComp] = useState(company);
  const saveComp = () => setCompany({ name: comp.name.trim(), address: comp.address.trim(), vat: comp.vat.trim(), contact: comp.contact.trim() });
  const field = (key: keyof typeof comp, placeholder: string, multiline = false) => (
    <TextInput
      value={comp[key]}
      onChangeText={(v) => setComp((c) => ({ ...c, [key]: v }))}
      onBlur={saveComp}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      style={[styles.input, { marginTop: 8 }]}
      multiline={multiline}
    />
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Il tuo nome</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onBlur={() => setUserName(draft.trim())}
          onSubmitEditing={() => setUserName(draft.trim())}
          placeholder="Es. Simone"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="done"
        />
        <Text style={styles.hint}>Compare su ogni cosa che aggiungi, così il collega sa chi l’ha scritta.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Dati azienda (per i preventivi)</Text>
        {field('name', 'Nome azienda')}
        {field('address', 'Indirizzo', true)}
        {field('vat', 'Partita IVA')}
        {field('contact', 'Telefono / email')}
        <Text style={styles.hint}>Compaiono in alto su ogni preventivo e nel PDF.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Riepilogo</Text>
        {ITEM_TYPES.map((t) => (
          <View key={t} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: TYPE_INFO[t].color }]} />
            <Text style={styles.rowText}>{TYPE_INFO[t].plural}</Text>
            <Text style={styles.count}>{items.filter((it) => it.type === t).length}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Condivisione con il team</Text>
        <Text style={styles.hint}>
          Per ora i dati sono salvati solo su questo telefono. Il prossimo passo è collegare l’app a Supabase: a quel punto tu e il tuo collega
          entrerete con il vostro account e vedrete gli stessi dati, aggiornati in tempo reale.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { fontSize: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  hint: { fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowText: { flex: 1, fontSize: 16, color: colors.text },
  count: { fontSize: 16, fontWeight: '600', color: colors.text },
});
