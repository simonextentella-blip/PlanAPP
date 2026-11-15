import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { ITEM_TYPES, TYPE_INFO } from '../lib/types';

export default function ProfileScreen() {
  const { userName, setUserName, items, company, setCompany, sync, syncNow } = useStore();
  const { configured, email, signOut } = useAuth();
  const syncText =
    sync.status === 'syncing'
      ? 'Sincronizzazione in corso…'
      : sync.pending > 0
        ? `${sync.pending} ${sync.pending === 1 ? 'modifica' : 'modifiche'} in attesa di connessione`
        : sync.status === 'offline'
          ? 'Nessuna connessione: riprovo da solo'
          : sync.status === 'ok'
            ? `Tutto sincronizzato${sync.lastSync ? ` · ore ${hhmm(sync.lastSync)}` : ''}`
            : 'Non collegato';
  const [draft, setDraft] = useState(userName);
  const [comp, setComp] = useState(company);
  // Cambiando nome si caricano i dati fornitore di quella persona.
  useEffect(() => setComp(company), [company]);
  const saveComp = () => setCompany(Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, String(v).trim()])) as unknown as typeof comp);
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
        <Text style={styles.label}>{userName ? `Dati fornitore di ${userName}` : 'Dati fornitore'}</Text>
        {field('name', 'Nome (es. Rope Access Workers)')}
        {field('owner', 'Sottotitolo (es. di Simone Tentella)')}
        {field('tagline', 'Attività (es. Lavori in quota su funi · Tree climbing)')}
        {field('legalName', 'Ragione sociale completa')}
        {field('address', 'Indirizzo')}
        {field('cityLine', 'CAP Città (Prov.)')}
        {field('vat', 'Partita IVA')}
        {field('cf', 'Codice fiscale')}
        {field('email', 'Email')}
        {field('phone', 'Telefono')}
        <Text style={styles.hint}>Sono personali: ogni preventivo usa i dati di chi l’ha creato (riquadro Fornitore, intestazione e firma). Prima scrivi il tuo nome qui sopra, poi i tuoi dati.</Text>
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
        {!configured ? (
          <Text style={styles.hint}>Per ora i dati sono salvati solo su questo telefono. Appena colleghiamo Supabase tu e il collega vedrete gli stessi dati.</Text>
        ) : (
          <>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: SYNC_COLOR[sync.status] }]} />
              <Text style={styles.rowText}>{syncText}</Text>
            </View>
            <Text style={styles.hint}>Accesso come {email}. Le modifiche arrivano al collega in tempo reale; senza campo restano sul telefono e partono appena torna la connessione.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={syncNow} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={styles.btnText}>Aggiorna ora</Text>
              </Pressable>
              <Pressable onPress={signOut} style={({ pressed }) => [styles.btn, styles.btnOut, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={[styles.btnText, { color: colors.danger }]}>Esci</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const SYNC_COLOR = { off: '#9CA3AF', syncing: '#CA8A04', ok: '#16A34A', offline: '#DC2626' } as const;

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
  btn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.primary },
  btnOut: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
