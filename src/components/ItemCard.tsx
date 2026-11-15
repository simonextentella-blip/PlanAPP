import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { amountLabel } from '../lib/money';
import { formatCardDate } from '../lib/dates';
import { useStore } from '../lib/store';
import { colors, unscheduled as UNSCHEDULED } from '../lib/theme';
import { chainPhotos, CHECKABLE, countPhotos, TYPE_INFO, type Item, type ItemType } from '../lib/types';

const UNSCHEDULED_LABEL: Partial<Record<ItemType, string>> = {
  lavoro: 'Scegli una data',
  todo: 'Scegli una data',
  sopralluogo: 'Data da concordare',
};

export function ItemCard({ item, showDate = false, hideType = false }: { item: Item; showDate?: boolean; hideType?: boolean }) {
  const { toggleDone, getClient, getItem } = useStore();
  const nPhotos = countPhotos(chainPhotos(item, getItem));
  const client = getClient(item.clientId);
  const info = TYPE_INFO[item.type];
  const checkable = CHECKABLE.includes(item.type);
  // Lavori e sopralluoghi ancora senza data: evidenziati con un colore diverso.
  const quoteToDo = item.type === 'preventivo' && !item.quote && !item.done && !!item.visitId;
  const unscheduled = !item.date && !item.done && UNSCHEDULED_LABEL[item.type] !== undefined;

  const meta = [
    showDate && item.date ? formatCardDate(item.date) : null,
    item.time,
    client?.name,
    amountLabel(item),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() =>
        item.quote
          ? router.push({ pathname: '/preventivo-doc', params: { id: item.id } })
          : quoteToDo
            ? router.push({ pathname: '/preventivo', params: { from: item.id } })
            : router.push({ pathname: '/item', params: { id: item.id } })
      }
      style={({ pressed }) => [styles.card, unscheduled && styles.unscheduled, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${info.label}: ${item.title}`}
    >
      {checkable ? (
        <Pressable onPress={() => toggleDone(item.id)} hitSlop={12} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
          <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={item.done ? info.color : unscheduled ? UNSCHEDULED.ring : '#C9CEC6'} />
        </Pressable>
      ) : (
        <View style={styles.check}>
          <Ionicons name={info.icon as never} size={22} color={info.color} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.title, item.done && styles.done]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {quoteToDo ? (
          <View style={[styles.pill, { backgroundColor: '#FBEFC5' }]}>
            <Ionicons name="create-outline" size={12} color="#8A6A00" />
            <Text style={[styles.pillText, { color: '#8A6A00' }]}>Da preparare · dal sopralluogo</Text>
          </View>
        ) : null}
        {item.jobId ? (
          <View style={[styles.pill, { backgroundColor: '#DDF1EC' }]}>
            <Ionicons name="construct-outline" size={12} color="#0F766E" />
            <Text style={[styles.pillText, { color: '#0F766E' }]}>{item.amount == null ? 'Da lavoro fatto · importo da inserire' : 'Da lavoro fatto'}</Text>
          </View>
        ) : null}
        {item.quoteId && !item.done ? (
          <View style={[styles.pill, { backgroundColor: '#E6EDE4' }]}>
            <Ionicons name="receipt-outline" size={12} color="#2F3E2F" />
            <Text style={[styles.pillText, { color: '#2F3E2F' }]}>Dal preventivo accettato</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          {unscheduled ? (
            <View style={styles.pickDate}>
              <Ionicons name="time-outline" size={14} color={UNSCHEDULED.text} />
              <Text style={styles.pickDateText}>{UNSCHEDULED_LABEL[item.type]}</Text>
            </View>
          ) : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {nPhotos ? (
            <View style={styles.photos} accessibilityLabel={`${nPhotos} foto`}>
              <Ionicons name="camera-outline" size={14} color={colors.muted} />
              <Text style={styles.meta}>{nPhotos}</Text>
            </View>
          ) : null}
          {hideType ? null : (
            <View style={[styles.tag, { backgroundColor: `${info.color}1A` }]}>
              <Text style={[styles.tagText, { color: info.color }]}>{item.type === 'soldi' && item.account === 'lavori' ? 'Conto lavori' : info.label}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.avatar}>
        <Avatar name={item.createdBy} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unscheduled: { backgroundColor: UNSCHEDULED.bg, borderColor: UNSCHEDULED.border, borderStyle: 'dashed', borderWidth: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FDE9C4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5 },
  pillText: { fontSize: 11, fontWeight: '700', color: UNSCHEDULED.text },
  check: { paddingLeft: 14, paddingRight: 12, justifyContent: 'center' },
  body: { flex: 1, paddingVertical: 14, paddingRight: 8 },
  avatar: { justifyContent: 'center', paddingRight: 14 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  desc: { fontSize: 14, color: colors.text, marginTop: 2, opacity: 0.8 },
  pickDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickDateText: { fontSize: 13, fontWeight: '600', color: UNSCHEDULED.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  meta: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  photos: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 12, fontWeight: '600' },
});
