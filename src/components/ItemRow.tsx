import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPickerDate } from '../lib/dates';
import { formatEuro } from '../lib/money';
import { useStore } from '../lib/store';
import { colors, unscheduled as UNSCHEDULED } from '../lib/theme';
import { chainPhotos, collabLabel, countPhotos, TYPE_INFO, type Item } from '../lib/types';

/** "Valentina Rossi – Abbattimento" → "Abbattimento"; "Lavoro – Valentina Rossi" → "". */
function stripClient(title: string, clientName: string | undefined, typeLabel: string): string {
  if (!clientName) return title;
  const sep = /\s*[–—-]\s*/;
  const parts = title.split(sep).map((p) => p.trim()).filter(Boolean);
  const name = clientName.trim().toLowerCase();
  const rest = parts.filter((p) => p.toLowerCase() !== name && p.toLowerCase() !== typeLabel.toLowerCase());
  return rest.join(' – ');
}

/** "€ 1.500,00" → "€ 1.500": nella lista i centesimi a zero non servono. */
const shortEuro = (n: number) => formatEuro(n).replace(/,00$/, '');

/**
 * Riga compatta per le liste di Lavori e Sopralluoghi: va dentro un riquadro bianco
 * per gruppo (first/last arrotondano gli angoli). Cliente in grassetto, sotto cosa fare
 * e il giorno, a destra l'importo.
 */
export function ItemRow({ item, first, last }: { item: Item; first: boolean; last: boolean }) {
  const { toggleDone, getClient, getItem } = useStore();
  const client = getClient(item.clientId);
  const info = TYPE_INFO[item.type];
  const unscheduled = !item.date && !item.done;
  const nPhotos = countPhotos(chainPhotos(item, getItem));

  // Chi: il cliente, oppure "Collaborazione con …" per i lavori senza cliente.
  const who = client?.name ?? collabLabel(item);
  const main = who ?? item.title;
  // Se il titolo è solo "Lavoro – Cliente", sotto mettiamo la prima riga delle note.
  const what = (who ? stripClient(item.title, who, info.label) : '') || (item.description ?? '').split('\n')[0].trim();
  const when = item.date ? [formatPickerDate(item.date), item.time].filter(Boolean).join(' · ') : '';
  const sub = [when, what].filter(Boolean).join(' · ');
  const toCollect = item.type === 'lavoro' && item.done && !!item.unpaid;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/item', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, first && styles.first, last && styles.last, !last && styles.divider, pressed && { backgroundColor: '#F7F8F6' }]}
      accessibilityRole="button"
      accessibilityLabel={`${info.label}: ${item.title}`}
    >
      <Pressable onPress={() => toggleDone(item.id)} hitSlop={12} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={25}
          color={item.done ? colors.primary : unscheduled ? UNSCHEDULED.ring : '#C9CEC6'}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, item.done && styles.done]} numberOfLines={1}>
          {main}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : unscheduled ? (
          <Text style={[styles.sub, { color: UNSCHEDULED.text }]}>Senza data</Text>
        ) : null}
        {toCollect ? <Text style={[styles.sub, { color: '#C2410C' }]}>Non ancora pagato</Text> : null}
      </View>
      <View style={styles.right}>
        {item.amount != null ? <Text style={styles.amount}>{shortEuro(item.amount)}</Text> : null}
        {nPhotos ? (
          <View style={styles.photos} accessibilityLabel={`${nPhotos} foto`}>
            <Ionicons name="camera-outline" size={15} color={colors.muted} />
            <Text style={styles.photosText}>{nPhotos}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingRight: 14,
  },
  first: { borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  last: { borderBottomWidth: 1, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  check: { paddingLeft: 14, paddingRight: 12 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 3, marginLeft: 10 },
  amount: { fontSize: 15, fontWeight: '600', color: colors.text },
  photos: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  photosText: { fontSize: 14, color: colors.muted },
});
