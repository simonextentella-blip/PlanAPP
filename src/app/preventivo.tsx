import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { brand } from '../lib/brand';
import { addDays, todayISO } from '../lib/dates';
import { formatEuro, parseEuro } from '../lib/money';
import { DEFAULT_CONDITIONS, DEFAULT_TEAM, formatShort, FORFETTARIO_NOTE, MARKUP_OPTIONS, nextQuoteNumber, normalizeQuote, quoteTotals, uid, VAT_OPTIONS } from '../lib/quote';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import type { Quote, QuoteCondition, QuoteTeamRow, QuoteWork } from '../lib/types';

const ACCENT = brand.green;
const VALIDITY = [30, 60, 90];

export default function QuoteEditor() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { items, getItem, addItem, updateItem, supplierFor, userName } = useStore();
  const existing = id ? getItem(id) : undefined;
  // Preventivo "da fare" creato da un sopralluogo: lo completiamo invece di crearne uno nuovo.
  const todo = from ? getItem(from) : undefined;
  const visit = todo?.visitId ? getItem(todo.visitId) : undefined;
  const supplier = supplierFor(existing?.createdBy ?? (userName || 'Io'));
  const q: Quote | null = existing?.quote ? normalizeQuote(existing.quote as never) : null;

  const [number, setNumber] = useState(q?.number || nextQuoteNumber(items, new Date().getFullYear()));
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [validity, setValidity] = useState(q?.validityDays ?? 60);
  const [client, setClient] = useState(q?.client ?? { name: '', address: '', cityLine: '', taxId: '', site: '' });
  const [subject, setSubject] = useState(q?.subject ?? '');
  const visitNote = todo ? [todo.title, todo.description].filter(Boolean).join(' — ') : '';
  const [team, setTeam] = useState<QuoteTeamRow[]>(q?.team ?? DEFAULT_TEAM());
  const [works, setWorks] = useState<QuoteWork[]>(q?.works.length ? q.works : [{ id: uid(), title: 'Allestimento cantiere', description: '', qty: 'a corpo' }]);
  const [total, setTotal] = useState(q && q.total ? formatEuro(q.total).replace('€ ', '') : '');
  const [vatRate, setVatRate] = useState(q?.vatRate ?? 0);
  const [markup, setMarkup] = useState(q?.markup ?? 0);
  const [conditions, setConditions] = useState<QuoteCondition[]>(q?.conditions ?? DEFAULT_CONDITIONS());
  const [error, setError] = useState('');

  const parsedTotal = parseEuro(total);
  const totals = quoteTotals({ total: parsedTotal ?? 0, vatRate, markup });

  const setC = (k: keyof Quote['client']) => (v: string) => {
    setClient((c) => ({ ...c, [k]: v }));
    setError('');
  };
  function patch<T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>, rowId: string, p: Partial<T>) {
    set((rows) => rows.map((r) => (r.id === rowId ? { ...r, ...p } : r)));
    setError('');
  }

  function save() {
    if (!client.name.trim()) return setError('Scrivi il nome del cliente.');
    const cleanWorks = works.filter((w) => w.title.trim() || w.description.trim());
    if (cleanWorks.length === 0) return setError('Aggiungi almeno una lavorazione.');
    if (parsedTotal == null) return setError('Scrivi il totale a corpo (es. 2300,00).');
    const quote: Quote = {
      number: number.trim() || nextQuoteNumber(items, new Date().getFullYear()),
      client: { name: client.name.trim(), address: client.address.trim(), cityLine: client.cityLine.trim(), taxId: client.taxId.trim(), site: client.site.trim() },
      subject: subject.trim(),
      team: team.filter((r) => r.role.trim()).map((r) => ({ ...r, count: r.count.trim(), role: r.role.trim() })),
      works: cleanWorks.map((w) => ({ ...w, title: w.title.trim(), description: w.description.trim(), qty: w.qty.trim() })),
      total: parsedTotal,
      vatRate,
      markup,
      conditions: conditions.filter((c) => c.label.trim() || c.value.trim()).map((c) => ({ ...c, label: c.label.trim(), value: c.value.trim() })),
      validityDays: validity,
    };
    const data = {
      type: 'preventivo' as const,
      title: `${quote.client.name}${quote.subject ? ` – ${quote.subject}` : ''}`,
      description: `Preventivo N. ${quote.number}${quote.client.site ? ` · ${quote.client.site}` : ''}`,
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
    } else if (todo) {
      updateItem(todo.id, { ...data, visitId: todo.visitId });
      router.replace({ pathname: '/preventivo-doc', params: { id: todo.id } });
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
        {todo ? (
          <View style={styles.fromVisit}>
            <Ionicons name="location-outline" size={18} color={brand.dark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fromVisitTitle}>Dal sopralluogo{visit?.date ? ` del ${formatShort(visit.date)}` : ''}</Text>
              <Text style={styles.fromVisitText}>{visitNote}</Text>
            </View>
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/profilo')} style={styles.supplier}>
          <Ionicons name="business-outline" size={18} color={brand.dark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fromVisitTitle}>Fornitore</Text>
            <Text style={styles.fromVisitText}>{supplier.legalName || 'Dati fornitore da compilare nel Profilo'}</Text>
            {supplier.vat ? <Text style={styles.small}>P.IVA {supplier.vat}</Text> : <Text style={[styles.small, { color: colors.danger }]}>P.IVA mancante: tocca per inserirla</Text>}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Card title="Preventivo">
          <Field label="Numero">
            <TextInput value={number} onChangeText={setNumber} style={styles.input} />
          </Field>
          <Field label="Data">
            <View style={styles.dateRow}>
              <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={8} accessibilityLabel="Giorno precedente">
                <Ionicons name="chevron-back" size={22} color={ACCENT} />
              </Pressable>
              <Text style={styles.dateText}>{formatShort(date)}</Text>
              <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={8} accessibilityLabel="Giorno successivo">
                <Ionicons name="chevron-forward" size={22} color={ACCENT} />
              </Pressable>
            </View>
          </Field>
          <Field label={`Validità · fino al ${formatShort(addDays(date, validity))}`}>
            <View style={styles.chips}>
              {VALIDITY.map((d) => (
                <Chip key={d} label={`${d} giorni`} color={ACCENT} active={validity === d} onPress={() => setValidity(d)} />
              ))}
            </View>
          </Field>
        </Card>

        <Card title="Cliente">
          <Input value={client.name} onChangeText={setC('name')} placeholder="Nome e cognome / ragione sociale *" />
          <Input value={client.address} onChangeText={setC('address')} placeholder="Indirizzo" />
          <Input value={client.cityLine} onChangeText={setC('cityLine')} placeholder="CAP Città (Prov.)" />
          <Input value={client.taxId} onChangeText={setC('taxId')} placeholder="C.F. / P.IVA" />
          <Input value={client.site} onChangeText={setC('site')} placeholder="Luogo intervento (es. Manziana (RM))" />
        </Card>

        <Card title="Oggetto">
          <Input value={subject} onChangeText={setSubject} placeholder="Es. Potatura in tree climbing di esemplari arborei" multiline />
        </Card>

        <Card title="01 · Squadra impiegata">
          {team.map((r) => (
            <View key={r.id} style={styles.teamRow}>
              <TextInput value={r.count} onChangeText={(v) => patch(setTeam, r.id, { count: v })} style={[styles.input, { width: 54, textAlign: 'center' }]} keyboardType="number-pad" />
              <TextInput value={r.role} onChangeText={(v) => patch(setTeam, r.id, { role: v })} placeholder="Ruolo (es. operatore a terra)" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1 }]} multiline />
              <Remove onPress={() => setTeam((rows) => rows.filter((x) => x.id !== r.id))} />
            </View>
          ))}
          <Add label="Aggiungi operatore" onPress={() => setTeam((rows) => [...rows, { id: uid(), count: '1', role: '' }])} />
        </Card>

        <Card title="02 · Lavorazioni">
          {works.map((w, i) => (
            <View key={w.id} style={styles.work}>
              <View style={styles.workHead}>
                <Text style={styles.workNum}>{i + 1}</Text>
                <TextInput value={w.title} onChangeText={(v) => patch(setWorks, w.id, { title: v })} placeholder="Titolo (es. Potatura di Quercus ilex)" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, fontWeight: '600' }]} />
                <Remove onPress={() => setWorks((rows) => rows.filter((x) => x.id !== w.id))} />
              </View>
              <TextInput value={w.description} onChangeText={(v) => patch(setWorks, w.id, { description: v })} placeholder="Descrizione (facoltativa)" placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 64 }]} multiline textAlignVertical="top" />
              <View style={styles.qtyRow}>
                <Text style={styles.small}>Q.tà</Text>
                <TextInput value={w.qty} onChangeText={(v) => patch(setWorks, w.id, { qty: v })} style={[styles.input, { width: 90, textAlign: 'center' }]} />
                <Chip label="a corpo" color={ACCENT} active={w.qty === 'a corpo'} onPress={() => patch(setWorks, w.id, { qty: w.qty === 'a corpo' ? '1' : 'a corpo' })} />
              </View>
            </View>
          ))}
          <Add label="Aggiungi lavorazione" onPress={() => setWorks((rows) => [...rows, { id: uid(), title: '', description: '', qty: '1' }])} />
        </Card>

        <Card title="03 · Riepilogo economico">
          <Field label={markup ? 'Importo base (prima della maggiorazione)' : vatRate === 0 ? 'Totale a corpo' : 'Totale a corpo (imponibile)'}>
            <View style={styles.amountRow}>
              <Text style={styles.euro}>€</Text>
              <TextInput value={total} onChangeText={(v) => (setTotal(v), setError(''))} placeholder="0,00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[styles.input, { flex: 1, fontSize: 18 }]} />
            </View>
          </Field>
          <View style={styles.chips}>
            {VAT_OPTIONS.map((r) => (
              <Chip key={r} label={r === 0 ? 'Forfettario (no IVA)' : `IVA ${r}%`} color={ACCENT} active={vatRate === r} onPress={() => setVatRate(r)} />
            ))}
          </View>
          <View style={styles.markupBox}>
            <Text style={styles.small}>Maggiorazione (non compare nel preventivo)</Text>
            <View style={styles.chips}>
              {MARKUP_OPTIONS.map((m) => (
                <Chip key={m} label={m === 0 ? 'Nessuna' : `+${m}%`} color={brand.dark} active={markup === m} onPress={() => setMarkup(m)} />
              ))}
            </View>
            {markup > 0 && parsedTotal != null ? (
              <Text style={styles.markupNote}>
                {formatEuro(parsedTotal)} + {markup}% = {formatEuro(totals.imponibile)}. Nel preventivo comparirà solo {formatEuro(totals.totale)}.
              </Text>
            ) : null}
          </View>
          <View style={styles.totalBox}>
            <View>
              <Text style={styles.totalK}>TOTALE A CORPO</Text>
              <Text style={styles.totalS}>{vatRate === 0 ? 'IVA non applicata*' : `IVA ${vatRate}% inclusa (${formatEuro(totals.iva)})`}</Text>
            </View>
            <Text style={styles.totalV}>{formatEuro(totals.totale)}</Text>
          </View>
          {vatRate === 0 ? <Text style={styles.foot}>* {FORFETTARIO_NOTE}</Text> : null}
        </Card>

        <Card title="04 · Condizioni">
          {conditions.map((c) => (
            <View key={c.id} style={styles.cond}>
              <View style={styles.workHead}>
                <TextInput value={c.label} onChangeText={(v) => patch(setConditions, c.id, { label: v })} placeholder="Voce (es. Tempi)" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, fontWeight: '600' }]} />
                <Remove onPress={() => setConditions((rows) => rows.filter((x) => x.id !== c.id))} />
              </View>
              <TextInput value={c.value} onChangeText={(v) => patch(setConditions, c.id, { value: v })} placeholder="Testo" placeholderTextColor={colors.muted} style={styles.input} multiline />
            </View>
          ))}
          <Add label="Aggiungi condizione" onPress={() => setConditions((rows) => [...rows, { id: uid(), label: '', value: '' }])} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.small}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={styles.input} />;
}

function Remove({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="Togli">
      <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
    </Pressable>
  );
}

function Add({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.add}>
      <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  supplier: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  fromVisit: { flexDirection: 'row', gap: 10, backgroundColor: brand.light, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderColor: brand.green },
  fromVisitTitle: { fontSize: 13, fontWeight: '700', color: brand.dark },
  fromVisitText: { fontSize: 14, color: colors.text, marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  headerBtn: { fontSize: 17, color: ACCENT, fontWeight: '700', paddingHorizontal: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTitle: { fontSize: 13, fontWeight: '800', color: brand.dark, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: colors.card, fontSize: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
  dateText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  small: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  work: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  workHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workNum: { width: 22, textAlign: 'center', fontSize: 16, fontWeight: '800', color: ACCENT },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cond: { gap: 6, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  addText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  euro: { fontSize: 20, fontWeight: '700', color: colors.text },
  markupBox: { gap: 8, backgroundColor: colors.bg, borderRadius: 10, padding: 10 },
  markupNote: { fontSize: 13, color: colors.text },
  totalBox: { backgroundColor: brand.dark, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  totalK: { color: '#fff', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
  totalS: { color: '#fff', opacity: 0.8, fontSize: 11, marginTop: 2 },
  totalV: { color: '#fff', fontSize: 20, fontWeight: '800' },
  foot: { fontSize: 11, fontStyle: 'italic', color: colors.muted },
  error: { color: colors.danger, fontSize: 14 },
  saveBtn: { backgroundColor: brand.dark, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
