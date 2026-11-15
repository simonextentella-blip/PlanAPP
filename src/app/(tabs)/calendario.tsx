import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { formatRelative, todayISO } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { TYPE_INFO, type ItemType } from '../../lib/types';

/** Nel calendario si vedono solo sopralluoghi e lavori. */
const CALENDAR_TYPES: ItemType[] = ['sopralluogo', 'lavoro'];
const inCalendar = (it: { type: ItemType }) => CALENDAR_TYPES.includes(it.type);

export default function CalendarScreen() {
  const { items } = useStore();
  const [selected, setSelected] = useState(todayISO());

  const marked = useMemo(() => {
    const byDay: Record<string, Set<ItemType>> = {};
    for (const it of items) {
      if (!it.date || !inCalendar(it)) continue;
      (byDay[it.date] ??= new Set()).add(it.type);
    }
    const out: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    for (const [day, types] of Object.entries(byDay)) {
      out[day] = { dots: [...types].map((t) => ({ key: t, color: TYPE_INFO[t].color })) };
    }
    out[selected] = { ...(out[selected] ?? { dots: [] }), selected: true, selectedColor: colors.primary };
    return out;
  }, [items, selected]);

  const dayItems = items.filter((it) => it.date === selected && inCalendar(it));

  return (
    <View style={styles.container}>
      <FlatList
        data={dayItems}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        ListHeaderComponent={
          <>
            <Calendar
              current={selected}
              onDayPress={(d) => setSelected(d.dateString)}
              markingType="multi-dot"
              markedDates={marked}
              firstDay={1}
              enableSwipeMonths
              theme={{ todayTextColor: colors.primary, arrowColor: colors.primary, textMonthFontWeight: '700' }}
              style={styles.calendar}
            />
            <View style={styles.legend}>
              {CALENDAR_TYPES.map((type) => TYPE_INFO[type]).map((t) => (
                <View key={t.label} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: t.color }]} />
                  <Text style={styles.legendText}>{t.plural}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.dayTitle}>{formatRelative(selected)}</Text>
          </>
        }
        ListEmptyComponent={<EmptyState text="Niente in programma per questo giorno. Tocca + per aggiungere un sopralluogo o un lavoro." />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <Fab label="Aggiungi" onPress={() => router.push({ pathname: '/item', params: { date: selected } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  calendar: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 12, color: colors.muted },
  dayTitle: { fontSize: 18, fontWeight: '700', color: colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
});
