import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { amountLabel } from '../lib/money';
import { formatRelative } from '../lib/dates';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { CHECKABLE, TYPE_INFO, type Item, type ItemType } from '../lib/types';

const UNSCHEDULED = { bg: '#FFF7E8', border: '#F3C677', text: '#A15C07' };
const UNSCHEDULED_LABEL: Partial<Record<ItemType, string>> = {
  lavoro: 'Da organizzare',
  todo: 'Da organizzare',
  sopralluogo: 'Data da concordare',
};

export function ItemCard({ item, showDate = false }: { item: Item; showDate?: boolean }) {
  const { toggleDone } = useStore();
  const info = TYPE_INFO[item.type];
  const checkable = CHECKABLE.includes(item.type);
  // Lavori e sopralluoghi ancora senza data: evidenziati con un colore diverso.
  const quoteToDo = item.type === 'preventivo' && !item.quote && !item.done && !!item.visitId;
  const unscheduled = !item.date && !item.done && UNSCHEDULED_LABEL[item.type] !== undefined;

  const meta = [
    showDate && item.date ? formatRelative(item.date) : null,
    item.time,
    amountLabel(item),
    info.label,
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
      <View style={[styles.bar, { backgroundColor: info.color }]} />
      {checkable ? (
        <Pressable onPress={() => toggleDone(item.id)} hitSlop={12} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
          <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={item.done ? info.color : colors.muted} />
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
        {item.quoteId && !item.done ? (
          <View style={[styles.pill, { backgroundColor: '#E6EDE4' }]}>
            <Ionicons name="receipt-outline" size={12} color="#2F3E2F" />
            <Text style={[styles.pillText, { color: '#2F3E2F' }]}>Dal preventivo accettato</Text>
          </View>
        ) : null}
        {unscheduled ? (
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={12} color={UNSCHEDULED.text} />
            <Text style={styles.pillText}>{UNSCHEDULED_LABEL[item.type]}</Text>
          </View>
        ) : null}
        <Text style={styles.meta}>{meta}</Text>
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  unscheduled: { backgroundColor: UNSCHEDULED.bg, borderColor: UNSCHEDULED.border, borderStyle: 'dashed', borderWidth: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FDE9C4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5 },
  pillText: { fontSize: 11, fontWeight: '700', color: UNSCHEDULED.text },
  bar: { width: 4 },
  check: { paddingHorizontal: 12, justifyContent: 'center' },
  body: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  avatar: { justifyContent: 'center', paddingRight: 12 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  desc: { fontSize: 14, color: colors.text, marginTop: 2, opacity: 0.8 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
