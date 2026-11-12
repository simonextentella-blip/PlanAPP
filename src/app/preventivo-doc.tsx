import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, formatLong } from '../lib/dates';
import { formatEuro } from '../lib/money';
import { lineTotal, quoteHtml, quoteTotals } from '../lib/quote';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { TYPE_INFO } from '../lib/types';

const ACCENT = TYPE_INFO.preventivo.color;

export default function QuoteDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItem, company, toggleDone, removeItem } = useStore();
  const item = getItem(id);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!item?.quote) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Preventivo' }} />
        <Text style={styles.muted}>Questo preventivo non esiste più.</Text>
      </View>
    );
  }
  const q = item.quote;
  const t = quoteTotals(q);
  const date = item.date ?? item.createdAt.slice(0, 10);

  async function sharePdf() {
    if (Platform.OS === 'web') {
      setMsg('Il PDF si crea e si condivide dall’app installata sul telefono (WhatsApp, email, ecc.).');
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: quoteHtml(item!, company) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Preventivo ${q.number}`, UTI: 'com.adobe.pdf' });
      } else {
        setMsg('Condivisione non disponibile su questo dispositivo.');
      }
    } catch {
      setMsg('Non sono riuscito a creare il PDF. Riprova.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Preventivo ${q.number}` }} />

      <View style={styles.actions}>
        <Action icon="share-outline" label="Condividi PDF" onPress={sharePdf} primary />
        <Action icon="create-outline" label="Modifica" onPress={() => router.push({ pathname: '/preventivo', params: { id: item.id } })} />
        <Action
          icon={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          label={item.done ? 'Accettato' : 'Segna accettato'}
          onPress={() => toggleDone(item.id)}
        />
      </View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <View style={styles.paper}>
        <View style={styles.top}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.company}>{company.name || 'La tua azienda'}</Text>
            {company.address ? <Text style={styles.muted}>{company.address}</Text> : null}
            {company.vat ? <Text style={styles.muted}>P.IVA {company.vat}</Text> : null}
            {company.contact ? <Text style={styles.muted}>{company.contact}</Text> : null}
            {!company.name ? (
              <Pressable onPress={() => router.push('/profilo')}>
                <Text style={[styles.link]}>Aggiungi i dati dell’azienda nel Profilo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.box}>
            <Text style={styles.lbl}>Preventivo</Text>
            <Text style={styles.num}>N. {q.number}</Text>
            <Text style={styles.muted}>del {formatLong(date)}</Text>
            <Text style={styles.muted}>valido fino al {formatLong(addDays(date, q.validityDays))}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.lbl}>Cliente</Text>
            <Text style={styles.client}>{q.client.name}</Text>
            {q.client.address ? <Text style={styles.muted}>{q.client.address}</Text> : null}
            {q.client.contact ? <Text style={styles.muted}>{q.client.contact}</Text> : null}
          </View>
        </View>

        {q.subject ? (
          <Text style={styles.subject}>
            <Text style={{ fontWeight: '700' }}>Oggetto: </Text>
            {q.subject}
          </Text>
        ) : null}

        <View style={styles.table}>
          {q.lines.map((l) => (
            <View key={l.id} style={styles.tr}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.desc}>{l.description}</Text>
                <Text style={styles.muted}>
                  {l.qty.toLocaleString('it-IT')} × {formatEuro(l.unitPrice)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatEuro(lineTotal(l.qty, l.unitPrice))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <Row label="Imponibile" value={formatEuro(t.imponibile)} />
          <Row label={`IVA ${q.vatRate}%`} value={formatEuro(t.iva)} />
          <View style={styles.totalBig}>
            <Text style={styles.totalText}>Totale</Text>
            <Text style={styles.totalText}>{formatEuro(t.totale)}</Text>
          </View>
        </View>

        {q.notes ? (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.lbl}>Note e condizioni</Text>
            <Text style={styles.body}>{q.notes}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          if (!confirmDelete) return setConfirmDelete(true);
          removeItem(item.id);
          router.back();
        }}
        style={styles.delete}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteText}>{confirmDelete ? 'Tocca di nuovo per eliminare' : 'Elimina preventivo'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Action({ icon, label, onPress, primary }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, primary && { backgroundColor: ACCENT, borderColor: ACCENT }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={20} color={primary ? '#fff' : ACCENT} />
      <Text style={[styles.actionText, primary && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  actionText: { fontSize: 12, fontWeight: '600', color: colors.text },
  msg: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  paper: { backgroundColor: '#fff', borderRadius: 6, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  top: { flexDirection: 'row', marginBottom: 14 },
  company: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { gap: 10 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
  lbl: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  num: { fontSize: 16, fontWeight: '800', color: colors.text },
  client: { fontSize: 15, fontWeight: '700', color: colors.text },
  subject: { fontSize: 14, color: colors.text, marginTop: 14 },
  table: { marginTop: 14, borderTopWidth: 1, borderColor: colors.border },
  tr: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  desc: { fontSize: 14, color: colors.text },
  amount: { fontSize: 14, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  totals: { marginTop: 12, gap: 4, alignSelf: 'flex-end', width: 230 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowValue: { fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  totalBig: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderColor: colors.text, paddingTop: 6, marginTop: 4 },
  totalText: { fontSize: 17, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  link: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '600' },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
