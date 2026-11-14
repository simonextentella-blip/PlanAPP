import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { useStore } from '../../lib/store';
import { colors, unscheduled } from '../../lib/theme';
import { TYPE_INFO, type Item } from '../../lib/types';

type Kind = 'tutti' | 'lavoro' | 'todo';
type Status = 'tutti' | 'programmati' | 'organizzare' | 'completati';

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
  const [status, setStatus] = useState<Status>('tutti');

  const sections = useMemo(() => {
    const ofKind = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && (kind === 'tutti' || it.type === kind));
    if (status === 'completati') return [{ key: 'completati', title: '', data: ofKind.filter((it) => it.done) }];
    const open = ofKind.filter((it) => !it.done);
    const toPlan = open.filter((it) => !it.date);
    const planned = open.filter((it) => it.date).sort(byDate);
    if (status === 'organizzare') return [{ key: 'organizzare', title: '', data: toPlan }];
    if (status === 'programmati') return [{ key: 'programmati', title: '', data: planned }];
    // "Tutti": prima quelli da organizzare, poi quelli con la data.
    return [
      { key: 'organizzare', title: 'Da organizzare', data: toPlan },
      { key: 'programmati', title: 'Programmati', data: planned },
    ].filter((s) => s.data.length > 0);
  }, [items, kind, status]);

  const jobs = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && !it.done);
  const count = { programmati: jobs.filter((it) => it.date).length, organizzare: jobs.filter((it) => !it.date).length };

  const empty = {
    tutti: 'Nessun lavoro in sospeso. Tocca + per aggiungerne uno.',
    programmati: 'Nessun lavoro con data. Tocca + per aggiungerne uno.',
    organizzare: 'Niente da organizzare. Qui finiscono i lavori di cui non si conosce ancora la data.',
    completati: 'Nessun lavoro completato.',
  }[status];

  const summary = jobs.length
    ? `${jobs.length} ${jobs.length === 1 ? 'aperto' : 'aperti'}${count.organizzare ? ` · ${count.organizzare} da organizzare` : ''}`
    : 'Tutto completato';

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: 16 }}>
              <Chip label={`Tutti${jobs.length ? ` ${jobs.length}` : ''}`} active={status === 'tutti'} onPress={() => setStatus('tutti')} />
              <Chip label={`Programmati${count.programmati ? ` ${count.programmati}` : ''}`} active={status === 'programmati'} onPress={() => setStatus('programmati')} />
              <Chip label={`Da organizzare${count.organizzare ? ` ${count.organizzare}` : ''}`} active={status === 'organizzare'} onPress={() => setStatus('organizzare')} />
              <Chip label="Completati" active={status === 'completati'} onPress={() => setStatus('completati')} />
            </ScrollView>
            <View style={styles.segment} accessibilityRole="tablist">
              {kinds.map((k) => (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  style={[styles.segBtn, kind === k.key && styles.segActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: kind === k.key }}
                >
                  <Text style={[styles.segText, kind === k.key && styles.segTextActive]}>{k.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={[styles.sectionTitle, section.key === 'organizzare' && { color: unscheduled.text }]}>{section.title.toUpperCase()}</Text>
          ) : null
        }
        renderItem={({ item }) => <ItemCard item={item} showDate />}
        ListEmptyComponent={<EmptyState text={empty} />}
        contentContainerStyle={{ paddingBottom: 110 }}
      />
      <Fab
        extended
        label="Nuovo lavoro"
        onPress={() => router.push({ pathname: '/item', params: status === 'organizzare' ? { type: 'lavoro', nodate: '1' } : { type: 'lavoro' } })}
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
    alignSelf: 'flex-start',
    marginTop: 10,
    marginLeft: 16,
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7 },
  segActive: { backgroundColor: colors.text },
  segText: { fontSize: 14, fontWeight: '500', color: colors.text },
  segTextActive: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, paddingHorizontal: 20, marginTop: 18, marginBottom: 6 },
});
