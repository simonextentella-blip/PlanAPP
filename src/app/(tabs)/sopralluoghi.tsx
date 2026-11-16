import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/EmptyState';
import { ItemRow } from '../../components/ItemRow';
import { useStore } from '../../lib/store';
import { brand } from '../../lib/brand';
import { colors, unscheduled } from '../../lib/theme';
import type { Item } from '../../lib/types';

type Status = 'aperti' | 'concordare' | 'fatti';

/** Per data e ora, dal più vicino. */
function byDate(a: Item, b: Item) {
  const ka = `${a.date ?? ''} ${a.time ?? '99:99'}`;
  const kb = `${b.date ?? ''} ${b.time ?? '99:99'}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export default function VisitsScreen() {
  const { items } = useStore();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('aperti');

  const sections = useMemo(() => {
    const visits = items.filter((it) => it.type === 'sopralluogo');
    if (status === 'fatti') return [{ key: 'fatti', title: '', data: visits.filter((it) => it.done).sort(byDate).reverse() }];
    const open = visits.filter((it) => !it.done);
    const toAgree = open.filter((it) => !it.date);
    const planned = open.filter((it) => it.date).sort(byDate);
    if (status === 'concordare') return [{ key: 'concordare', title: '', data: toAgree }];
    // "Aperti": prima quelli con la data da concordare, poi quelli programmati.
    return [
      { key: 'concordare', title: 'Da concordare', data: toAgree },
      { key: 'programmati', title: 'Programmati', data: planned },
    ].filter((s) => s.data.length > 0);
  }, [items, status]);

  const open = items.filter((it) => it.type === 'sopralluogo' && !it.done);
  const count = { aperti: open.length, concordare: open.filter((it) => !it.date).length };

  const empty = {
    aperti: 'Nessun sopralluogo in sospeso. Tocca Aggiungi per aggiungerne uno.',
    concordare: 'Niente da concordare. Qui finiscono i sopralluoghi di cui non si conosce ancora la data.',
    fatti: 'Nessun sopralluogo fatto.',
  }[status];

  const summary = open.length
    ? `${open.length} ${open.length === 1 ? 'aperto' : 'aperti'}${count.concordare ? ` · ${count.concordare} da concordare` : ''}`
    : 'Tutto fatto';

  const statuses: { key: Status; label: string; count?: number; warn?: boolean }[] = [
    { key: 'aperti', label: 'Aperti', count: count.aperti },
    { key: 'concordare', label: 'Da concordare', count: count.concordare, warn: true },
    { key: 'fatti', label: 'Fatti' },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={[styles.head, { paddingTop: insets.top + 16 }]}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Sopralluoghi</Text>
              <Pressable
                onPress={() => router.push({ pathname: '/item', params: status === 'concordare' ? { type: 'sopralluogo', nodate: '1' } : { type: 'sopralluogo' } })}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel="Aggiungi"
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addText}>Aggiungi</Text>
              </Pressable>
            </View>
            <Text style={styles.summary}>{summary}</Text>
            {/* Barra unica, come in Lavori: lo stato dei sopralluoghi, ognuno col suo numerino. */}
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
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={[styles.sectionTitle, section.key === 'concordare' && { color: unscheduled.text }]}>{section.key === 'concordare' ? '● ' : ''}{section.title.toUpperCase()}</Text>
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
  head: { paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, paddingHorizontal: 20, letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 14, height: 36, borderRadius: 18, backgroundColor: colors.primary },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 15, color: colors.muted, paddingHorizontal: 20, marginTop: 2 },
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
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, paddingHorizontal: 20, marginTop: 18, marginBottom: 6 },
});
