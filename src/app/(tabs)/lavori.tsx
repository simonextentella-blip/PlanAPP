import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useStore } from '../../lib/store';
import { brand } from '../../lib/brand';
import { colors, unscheduled } from '../../lib/theme';
import { TYPE_INFO, type Item } from '../../lib/types';

type Kind = 'tutti' | 'lavoro' | 'todo';
type Status = 'aperti' | 'organizzare' | 'completati';

/** Per data e ora, dal più vicino. */
function byDate(a: Item, b: Item) {
  const ka = `${a.date ?? ''} ${a.time ?? '99:99'}`;
  const kb = `${b.date ?? ''} ${b.time ?? '99:99'}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export default function JobsScreen() {
  const { items } = useStore();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('tutti');
  const [status, setStatus] = useState<Status>('aperti');

  const sections = useMemo(() => {
    const ofKind = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && (kind === 'tutti' || it.type === kind));
    if (status === 'completati') return [{ key: 'completati', title: '', data: ofKind.filter((it) => it.done) }];
    const open = ofKind.filter((it) => !it.done);
    const toPlan = open.filter((it) => !it.date);
    const planned = open.filter((it) => it.date).sort(byDate);
    if (status === 'organizzare') return [{ key: 'organizzare', title: '', data: toPlan }];
    // "Aperti": prima quelli da organizzare, poi quelli con la data.
    return [
      { key: 'organizzare', title: 'Da organizzare', data: toPlan },
      { key: 'programmati', title: 'Programmati', data: planned },
    ].filter((s) => s.data.length > 0);
  }, [items, kind, status]);

  const jobs = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && !it.done);
  const count = { aperti: jobs.length, organizzare: jobs.filter((it) => !it.date).length };

  const empty = {
    aperti: 'Nessun lavoro in sospeso. Tocca + per aggiungerne uno.',
    organizzare: 'Niente da organizzare. Qui finiscono i lavori di cui non si conosce ancora la data.',
    completati: 'Nessun lavoro completato.',
  }[status];

  const summary = jobs.length
    ? `${jobs.length} ${jobs.length === 1 ? 'aperto' : 'aperti'}${count.organizzare ? ` · ${count.organizzare} da organizzare` : ''}`
    : 'Tutto completato';

  const statuses: { key: Status; label: string; count?: number; warn?: boolean }[] = [
    { key: 'aperti', label: 'Aperti', count: count.aperti },
    { key: 'organizzare', label: 'Da organizzare', count: count.organizzare, warn: true },
    { key: 'completati', label: 'Fatti' },
  ];

  const kinds: { key: Kind; label: string }[] = [
    { key: 'tutti', label: 'Tutti' },
    { key: 'lavoro', label: TYPE_INFO.lavoro.plural },
    { key: 'todo', label: TYPE_INFO.todo.plural },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={[styles.head, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.title}>Lavori</Text>
            <Text style={styles.summary}>{summary}</Text>
            {/* Barra unica: lo stato dei lavori, ognuno col suo numerino. */}
            <View style={styles.segment} accessibilityRole="tablist">
              {statuses.map((st) => {
                const on = status === st.key;
                return (
                  <Pressable
                    key={st.key}
                    onPress={() => setStatus(st.key)}
                    style={[styles.segBtn, on && styles.segActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.segText, on && styles.segTextActive]} numberOfLines={1}>
                      {st.label}
                    </Text>
                    {st.count ? (
                      <View style={[styles.badge, on && styles.badgeActive, st.warn && styles.badgeWarn]}>
                        <Text style={[styles.badgeText, on && styles.badgeTextActive, st.warn && styles.badgeTextWarn]}>{st.count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {/* Sotto, pillole leggere per il tipo. */}
            <View style={styles.kinds}>
              {kinds.map((k) => {
                const on = kind === k.key;
                return (
                  <Pressable
                    key={k.key}
                    onPress={() => setKind(k.key)}
                    style={[styles.pill, on && styles.pillActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextActive]}>{k.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={[styles.sectionTitle, section.key === 'organizzare' && { color: unscheduled.text }]}>{section.key === 'organizzare' ? '● ' : ''}{section.title.toUpperCase()}</Text>
          ) : (
            <View style={{ height: 14 }} />
          )
        }
        renderItem={({ item, index, section }) => <ItemRow item={item} first={index === 0} last={index === section.data.length - 1} />}
        ListEmptyComponent={<EmptyState text={empty} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  head: { paddingBottom: 4 },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, paddingHorizontal: 20, letterSpacing: -0.5 },
  summary: { fontSize: 15, color: colors.muted, paddingHorizontal: 20, marginTop: 2 },
  chips: { marginTop: 14, flexGrow: 0 },
  segment: {
    flexDirection: 'row',
    marginTop: 14,
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#E8EBE5',
  },
  segBtn: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 9 },
  segActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  segTextActive: { color: colors.primary },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  badgeActive: { backgroundColor: brand.light },
  badgeWarn: { backgroundColor: '#FDE9C4' },
  badgeText: { fontSize: 11.5, fontWeight: '600', color: colors.muted },
  badgeTextActive: { color: colors.primary },
  badgeTextWarn: { color: unscheduled.text },
  kinds: { flexDirection: 'row', gap: 6, marginTop: 12, paddingHorizontal: 16 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  pillActive: { backgroundColor: brand.light },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  pillTextActive: { color: colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, paddingHorizontal: 20, marginTop: 18, marginBottom: 6 },
});
