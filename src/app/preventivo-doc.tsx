import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { brand } from '../lib/brand';
import { addDays } from '../lib/dates';
import { LOGO_DATA_URI } from '../lib/logo';
import { formatEuro } from '../lib/money';
import { formatShort, FORFETTARIO_NOTE, normalizeQuote, quoteHtml, quoteTotals } from '../lib/quote';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

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
  const q = normalizeQuote(item.quote as never);
  const t = quoteTotals(q);
  const forf = q.vatRate === 0;
  const date = item.date ?? item.createdAt.slice(0, 10);
  let sec = 0;
  const section = (title: string) => (
    <Text style={styles.h2} key={title}>
      <Text style={{ color: brand.green }}>{String(++sec).padStart(2, '0')}</Text> {title.toUpperCase()}
    </Text>
  );

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
        <Action icon={item.done ? 'checkmark-circle' : 'ellipse-outline'} label={item.done ? 'Accettato' : 'Segna accettato'} onPress={() => toggleDone(item.id)} />
      </View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <View style={styles.paper}>
        <Stripe />
        <View style={styles.head}>
          <Image source={{ uri: LOGO_DATA_URI }} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.bname}>{company.name.toUpperCase()}</Text>
            <Text style={styles.muted}>{company.owner}</Text>
            <Text style={styles.btag}>{company.tagline}</Text>
          </View>
        </View>
        <View style={styles.docBox}>
          <Text style={styles.docTitle}>PREVENTIVO</Text>
          <Text style={styles.muted}>
            N. <Text style={styles.b}>{q.number}</Text> · Data <Text style={styles.b}>{formatShort(date)}</Text>
          </Text>
          <Text style={styles.muted}>
            Valido fino al <Text style={styles.b}>{formatShort(addDays(date, q.validityDays))}</Text>
          </Text>
        </View>

        <View style={styles.party}>
          <Text style={styles.lbl}>FORNITORE</Text>
          <Text style={styles.b}>{company.legalName}</Text>
          <Text style={styles.body}>{company.address}</Text>
          <Text style={styles.body}>{company.cityLine}</Text>
          <Text style={styles.body}>
            P.IVA {company.vat}
            {company.cf ? ` · C.F. ${company.cf}` : ''}
          </Text>
          <Text style={styles.body}>{[company.email, company.phone].filter(Boolean).join(' · ')}</Text>
        </View>
        <View style={styles.party}>
          <Text style={styles.lbl}>CLIENTE</Text>
          <Text style={styles.b}>{q.client.name}</Text>
          {[q.client.address, q.client.cityLine, q.client.taxId].filter(Boolean).map((l) => (
            <Text key={l} style={styles.body}>
              {l}
            </Text>
          ))}
          {q.client.site ? (
            <Text style={styles.body}>
              <Text style={styles.muted}>Luogo intervento: </Text>
              {q.client.site}
            </Text>
          ) : null}
        </View>

        {q.subject ? (
          <View style={styles.subject}>
            <Text style={[styles.lbl, { marginBottom: 2 }]}>OGGETTO</Text>
            <Text style={[styles.b, { fontSize: 15 }]}>{q.subject}</Text>
          </View>
        ) : null}

        {q.team.length ? (
          <>
            {section('Squadra impiegata')}
            {q.team.map((r) => (
              <Text key={r.id} style={styles.body}>
                <Text style={{ color: brand.stripe[2] }}>• </Text>
                <Text style={styles.b}>{r.count}</Text> {r.role}
              </Text>
            ))}
          </>
        ) : null}

        {q.works.length ? (
          <>
            {section('Lavorazioni')}
            <View style={styles.th}>
              <Text style={[styles.thText, { width: 26, textAlign: 'center' }]}>N.</Text>
              <Text style={[styles.thText, { flex: 1 }]}>DESCRIZIONE</Text>
              <Text style={[styles.thText, { width: 64, textAlign: 'center' }]}>Q.TÀ</Text>
            </View>
            {q.works.map((w, i) => (
              <View key={w.id} style={styles.tr}>
                <Text style={styles.idx}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.b}>{w.title}</Text>
                  {w.description ? <Text style={[styles.body, { marginTop: 2 }]}>{w.description}</Text> : null}
                </View>
                <Text style={styles.qty}>{w.qty}</Text>
              </View>
            ))}
          </>
        ) : null}

        {section('Riepilogo economico')}
        {!forf ? (
          <>
            <Row label="Imponibile" value={formatEuro(t.imponibile)} />
            <Row label={`IVA ${q.vatRate}%`} value={formatEuro(t.iva)} />
          </>
        ) : null}
        <View style={styles.total}>
          <View>
            <Text style={styles.totalK}>TOTALE A CORPO</Text>
            <Text style={styles.totalS}>{forf ? 'IVA non applicata*' : `IVA ${q.vatRate}% inclusa`}</Text>
          </View>
          <Text style={styles.totalV}>{formatEuro(t.totale)}</Text>
        </View>
        {forf ? <Text style={styles.foot}>* {FORFETTARIO_NOTE}</Text> : null}

        {q.conditions.length ? (
          <>
            {section('Condizioni')}
            {q.conditions.map((c) => (
              <View key={c.id} style={styles.cond}>
                <Text style={[styles.b, { width: '38%' }]}>{c.label}</Text>
                <Text style={[styles.body, { flex: 1 }]}>{c.value}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.sign}>
          {[`PER ${company.name.toUpperCase()}`, 'PER ACCETTAZIONE — IL CLIENTE'].map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={styles.lbl}>{l}</Text>
              <View style={styles.signLine} />
              <Text style={styles.tiny}>Luogo, data e firma</Text>
            </View>
          ))}
        </View>
        <Stripe />
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

function Stripe() {
  return (
    <View style={styles.stripe}>
      {brand.stripe.map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

function Action({ icon, label, onPress, primary }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, primary && { backgroundColor: brand.dark, borderColor: brand.dark }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={20} color={primary ? '#fff' : brand.green} />
      <Text style={[styles.actionText, primary && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.body}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  actionText: { fontSize: 12, fontWeight: '600', color: colors.text },
  msg: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  paper: { backgroundColor: '#fff', padding: 16, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stripe: { flexDirection: 'row', height: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  logo: { width: 44, height: 76 },
  bname: { fontSize: 15, fontWeight: '800', letterSpacing: 1.6, color: brand.dark },
  btag: { fontSize: 11, color: brand.green, marginTop: 3 },
  docBox: { alignItems: 'flex-end', marginBottom: 4 },
  docTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 3, color: brand.dark },
  party: { backgroundColor: brand.light, padding: 12 },
  lbl: { fontSize: 9, fontWeight: '800', letterSpacing: 2.4, color: brand.green, marginBottom: 5 },
  b: { fontSize: 13, fontWeight: '700', color: '#2B2F2B' },
  body: { fontSize: 13, color: '#2B2F2B', lineHeight: 19 },
  muted: { fontSize: 13, color: '#666' },
  tiny: { fontSize: 10, color: '#666', marginTop: 4 },
  subject: { borderLeftWidth: 4, borderColor: brand.green, paddingLeft: 10, paddingVertical: 4, marginTop: 4 },
  h2: { fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: brand.dark, borderBottomWidth: 1, borderColor: brand.dark, paddingBottom: 3, marginTop: 12 },
  th: { flexDirection: 'row', backgroundColor: brand.dark, paddingVertical: 6, paddingHorizontal: 6, gap: 6 },
  thText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
  tr: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: brand.line },
  idx: { width: 26, textAlign: 'center', fontWeight: '800', color: brand.green, fontSize: 13 },
  qty: { width: 64, textAlign: 'center', fontSize: 13, color: '#2B2F2B' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  total: { backgroundColor: brand.dark, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalK: { color: '#fff', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
  totalS: { color: '#fff', opacity: 0.8, fontSize: 11, marginTop: 2 },
  totalV: { color: '#fff', fontSize: 20, fontWeight: '800' },
  foot: { fontSize: 10, fontStyle: 'italic', color: '#666' },
  cond: { flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: brand.line },
  sign: { flexDirection: 'row', gap: 20, marginTop: 24, marginBottom: 12 },
  signLine: { borderBottomWidth: 1, borderColor: '#555', height: 30 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
