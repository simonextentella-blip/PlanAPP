import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { addDays, formatRelative, todayISO } from '../lib/dates';
import { formatEuro, parseEuro } from '../lib/money';
import { lineTotal, nextQuoteNumber, quoteTotals, VAT_RATES } from '../lib/quote';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { TYPE_INFO, type QuoteLine } from '../lib/types';

const ACCENT = TYPE_INFO.preventivo.color;
const VALIDITY = [15, 30, 60, 90];

interface LineDraft {
  id: string;
  description: string;
  qty: string;
  price: string;
}

function lid() {
  return Math.random().toString(36).slice(2, 10);
}

function toDraft(l: QuoteLine): LineDraft {
  return { id: l.id, description: l.description, qty: String(l.qty).replace('.', ','), price: formatEuro(l.unitPrice).replace('€ ', '') };
}

function parseQty(s: string): number | null {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

export default function QuoteEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { items, getItem, addItem, updateItem } = useStore();
  const existing = id ? getItem(id) : undefined;
  const q = existing?.quote;

  const [number, setNumber] = useState(q?.number ?? nextQuoteNumber(items, new Date().getFullYear()));
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [validity, setValidity] = useState(q?.validityDays ?? 30);
  const [clientName, setClientName] = useState(q?.client.name ?? '');
  const [clientAddress, setClientAddress] = useState(q?.client.address ?? '');
  const [clientContact, setClientContact] = useState(q?.client.contact ?? '');
  const [subject, setSubject] = useState(q?.subject ?? '');
  const [lines, setLines] = useState<LineDraft[]>(q?.lines.map(toDraft) ?? [{ id: lid(), description: '', qty: '1', price: '' }]);
  const [vatRate, setVatRate] = useState(q?.vatRate ?? 22);
  const [notes, setNotes] = useState(q?.notes ?? '');
  const [error, setError] = useState('');

  const parsedLines = lines.map((l) => ({ id: l.id, description: l.description.trim(), qty: parseQty(l.qty), unitPrice: parseEuro(l.price) }));
  const validLines = parsedLines.filter((l): l is QuoteLine => !!l.description && l.qty != null && l.unitPrice != null);
  const totals = quoteTotals({ lines: validLines, vatRate });

  function patchLine(lineId: string, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
    setError('');
  }

  function save() {
    if (!clientName.trim()) return setError('Scrivi il nome del cliente.');
    const bad = parsedLines.findIndex((l) => (l.description || l.qty != null || l.unitPrice != null) && !(l.description && l.qty != null && l.unitPrice != null));
    if (bad >= 0) return setError(`Riga ${bad + 1}: servono descrizione, quantità e prezzo (es. 1250,00).`);
    if (validLines.length === 0) return setError('Aggiungi almeno una riga con descrizione, quantità e prezzo.');
    const quote = {
      number: number.trim() || nextQuoteNumber(items, new Date().getFullYear()),
      client: { name: clientName.trim(), address: clientAddress.trim(), contact: clientContact.trim() },
      subject: subject.trim(),
      lines: validLines,
      vatRate,
      validityDays: validity,
      notes: notes.trim(),
    };
    const data = {
      type: 'preventivo' as const,
      title: `${quote.client.name}${quote.subject ? ` – ${quote.subject}` : ''}`,
      description: `Preventivo N. ${quote.number}`,
      date,
      time: null,
      done: existing?.done ?? false,
      amount: totals.totale,
      direction: null,
      quote,
    };
    if (existing) {
      updateItem(existing.id, data);
      router.back();
    } else {
      const created = addItem(data);
      router.replace({ pathname: '/preventivo-doc', params: { id: created.id } });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Modifica preventivo' : 'Nuovo preventivo',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={styles.headerBtn}>Salva</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card title="Documento">
          <View style={styles.inline}>
            <Text style={styles.inlineLabel}>Numero</Text>
            <TextInput value={number} onChangeText={setNumber} style={[styles.input, { flex: 1 }]} />
          </View>
          <View style={styles.dateRow}>
            <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={8} accessibilityLabel="Giorno precedente">
              <Ionicons name="chevron-back" size={22} color={ACCENT} />
            </Pressable>
            <Text style={styles.dateText}>Data: {formatRelative(date)}</Text>
            <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={8} accessibilityLabel="Giorno successivo">
              <Ionicons name="chevron-forward" size={22} color={ACCENT} />
            </Pressable>
          </View>
          <Text style={styles.small}>Validità dell'offerta</Text>
          <View style={styles.chips}>
            {VALIDITY.map((d) => (
              <Chip key={d} label={`${d} giorni`} color={ACCENT} active={validity === d} onPress={() => setValidity(d)} />
            ))}
          </View>
        </Card>

        <Card title="Cliente">
          <TextInput value={clientName} onChangeText={(v) => (setClientName(v), setError(''))} placeholder="Nome o ragione sociale *" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={clientAddress} onChangeText={setClientAddress} placeholder="Indirizzo" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={clientContact} onChangeText={setClientContact} placeholder="Telefono o email" placeholderTextColor={colors.muted} style={styles.input} />
        </Card>

        <Card title="Oggetto">
          <TextInput value={subject} onChangeText={setSubject} placeholder="Es. Rifacimento bagno" placeholderTextColor={colors.muted} style={styles.input} />
        </Card>

        <Card title="Voci">
          {lines.map((l, i) => {
            const qty = parseQty(l.qty);
            const price = parseEuro(l.price);
            return (
              <View key={l.id} style={styles.line}>
                <View style={styles.lineHead}>
                  <Text style={styles.small}>Riga {i + 1}</Text>
                  {lines.length > 1 ? (
                    <Pressable onPress={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} hitSlop={8} accessibilityLabel={`Togli riga ${i + 1}`}>
                      <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={l.description}
                  onChangeText={(v) => patchLine(l.id, { description: v })}
                  placeholder="Descrizione (es. Posa piastrelle)"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  multiline
                />
                <View style={styles.lineNums}>
                  <View style={{ width: 80 }}>
                    <Text style={styles.tiny}>Q.tà</Text>
                    <TextInput value={l.qty} onChangeText={(v) => patchLine(l.id, { qty: v })} keyboardType="decimal-pad" style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tiny}>Prezzo unitario €</Text>
                    <TextInput value={l.price} onChangeText={(v) => patchLine(l.id, { price: v })} placeholder="0,00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={styles.input} />
                  </View>
                  <View style={styles.lineTotal}>
                    <Text style={styles.tiny}>Importo</Text>
                    <Text style={styles.lineTotalText}>{qty != null && price != null ? formatEuro(lineTotal(qty, price)) : '–'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <Pressable onPress={() => setLines((ls) => [...ls, { id: lid(), description: '', qty: '1', price: '' }])} style={styles.addLine}>
            <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
            <Text style={[styles.addLineText, { color: ACCENT }]}>Aggiungi riga</Text>
          </Pressable>
        </Card>

        <Card title="IVA e totale">
          <View style={styles.chips}>
            {VAT_RATES.map((r) => (
              <Chip key={r} label={`${r}%`} color={ACCENT} active={vatRate === r} onPress={() => setVatRate(r)} />
            ))}
          </View>
          <View style={styles.totals}>
            <Row label="Imponibile" value={formatEuro(totals.imponibile)} />
            <Row label={`IVA ${vatRate}%`} value={formatEuro(totals.iva)} />
            <Row label="Totale" value={formatEuro(totals.totale)} big />
          </View>
        </Card>

        <Card title="Note e condizioni">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Es. Pagamento 30% all'ordine, saldo a fine lavori. Tempi di esecuzione: 10 giorni."
            placeholderTextColor={colors.muted}
            style={[styles.input, { minHeight: 90 }]}
            multiline
            textAlignVertical="top"
          />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>{existing ? 'Salva modifiche' : 'Crea preventivo'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={[styles.row, big && styles.rowBig]}>
      <Text style={[styles.rowLabel, big && styles.big]}>{label}</Text>
      <Text style={[styles.rowValue, big && styles.big]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  headerBtn: { fontSize: 17, color: colors.primary, fontWeight: '700', paddingHorizontal: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, fontSize: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineLabel: { fontSize: 15, color: colors.text, width: 70 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
  dateText: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  tiny: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  line: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineNums: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  lineTotal: { minWidth: 90, alignItems: 'flex-end', paddingBottom: 10 },
  lineTotalText: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  addLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  addLineText: { fontSize: 15, fontWeight: '600' },
  totals: { gap: 6, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowBig: { borderTopWidth: 1, borderColor: colors.text, paddingTop: 8, marginTop: 4 },
  rowLabel: { fontSize: 15, color: colors.muted },
  rowValue: { fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  big: { fontSize: 19, fontWeight: '800', color: colors.text },
  error: { color: colors.danger, fontSize: 14 },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
