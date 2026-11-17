import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { brand } from '../lib/brand';
import { normalizeQuote, quoteHtml, quoteVersions } from '../lib/quote';
import { formatEuro } from '../lib/money';
import { DocFrame } from '../components/DocFrame';
import { ChainPhotos } from '../components/Photos';
import { StepBack } from '../components/StepBack';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function QuoteDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, getItem, supplierFor, toggleDone, removeItem } = useStore();
  const item = getItem(id);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paperWidth, setPaperWidth] = useState(0);

  if (!item?.quote) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Preventivo' }} />
        <Text style={styles.muted}>Questo preventivo non esiste più.</Text>
      </View>
    );
  }
  // Il fornitore è chi ha creato il preventivo.
  const company = supplierFor(item.createdBy);
  const q = normalizeQuote(item.quote as never);
  const versions = quoteVersions(items, q.number);

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
        <Action icon="copy-outline" label="Duplica" onPress={() => router.push({ pathname: '/preventivo', params: { copy: item.id } })} />
        <Action icon={item.done ? 'checkmark-circle' : 'ellipse-outline'} label={item.done ? 'Accettato' : 'Accettato?'} onPress={() => toggleDone(item.id)} />
      </View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {versions.length > 1 ? (
        <View style={styles.versions}>
          <Text style={styles.versionsTitle}>Versioni di questo preventivo</Text>
          {versions.map((v) => {
            const current = v.id === item.id;
            return (
              <Pressable
                key={v.id}
                disabled={current}
                onPress={() => router.replace({ pathname: '/preventivo-doc', params: { id: v.id } })}
                style={[styles.version, current && styles.versionCurrent]}
              >
                <Text style={[styles.versionNum, current && { color: '#fff' }]}>N. {v.quote!.number}</Text>
                <Text style={[styles.versionInfo, current && { color: '#fff' }]} numberOfLines={1}>
                  {v.done ? 'Accettato · ' : ''}
                  {formatEuro(v.amount ?? 0)}
                </Text>
                {current ? <Text style={styles.versionHere}>questa</Text> : <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <ChainPhotos item={item} />

      <View style={styles.paper} onLayout={(e) => setPaperWidth(e.nativeEvent.layout.width)}>
        {paperWidth > 0 ? <DocFrame html={quoteHtml(item, company)} width={paperWidth} /> : null}
      </View>

      <StepBack item={item} />

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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, primary && { backgroundColor: brand.dark, borderColor: brand.dark }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={20} color={primary ? '#fff' : brand.green} />
      <Text style={[styles.actionText, primary && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  actionText: { fontSize: 12, fontWeight: '600', color: colors.text },
  versions: { backgroundColor: colors.card, borderRadius: 12, padding: 10, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  versionsTitle: { fontSize: 12, fontWeight: '800', color: brand.dark, textTransform: 'uppercase', letterSpacing: 1 },
  version: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.bg },
  versionCurrent: { backgroundColor: brand.dark },
  versionNum: { fontSize: 14, fontWeight: '700', color: colors.text },
  versionInfo: { flex: 1, fontSize: 13, color: colors.muted, textAlign: 'right' },
  versionHere: { fontSize: 12, fontWeight: '700', color: '#fff' },
  msg: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  paper: { backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  muted: { fontSize: 13, color: '#666' },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
