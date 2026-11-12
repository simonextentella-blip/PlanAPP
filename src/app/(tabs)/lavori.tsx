import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { TYPE_INFO } from '../../lib/types';

type Kind = 'tutti' | 'lavoro' | 'todo';
type Status = 'programmati' | 'organizzare' | 'completati';

export default function JobsScreen() {
  const { items } = useStore();
  const [kind, setKind] = useState<Kind>('tutti');
  const [status, setStatus] = useState<Status>('programmati');

  const list = useMemo(
    () =>
      items.filter((it) => {
        if (it.type !== 'lavoro' && it.type !== 'todo') return false;
        if (kind !== 'tutti' && it.type !== kind) return false;
        if (status === 'completati') return it.done;
        if (it.done) return false;
        return status === 'organizzare' ? !it.date : !!it.date;
      }),
    [items, kind, status],
  );

  const jobs = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && !it.done);
  const count = { programmati: jobs.filter((it) => it.date).length, organizzare: jobs.filter((it) => !it.date).length };

  const empty = {
    programmati: 'Nessun lavoro con data. Tocca + per aggiungerne uno.',
    organizzare: 'Niente da organizzare. Qui finiscono i lavori di cui non si conosce ancora la data.',
    completati: 'Nessun lavoro completato.',
  }[status];

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.row}>
          <Chip label={`Programmati${count.programmati ? ` (${count.programmati})` : ''}`} active={status === 'programmati'} onPress={() => setStatus('programmati')} />
          <Chip label={`Da organizzare${count.organizzare ? ` (${count.organizzare})` : ''}`} active={status === 'organizzare'} onPress={() => setStatus('organizzare')} />
          <Chip label="Completati" active={status === 'completati'} onPress={() => setStatus('completati')} />
        </View>
        <View style={styles.row}>
          <Chip label="Tutti" active={kind === 'tutti'} color={colors.text} onPress={() => setKind('tutti')} />
          <Chip label={TYPE_INFO.lavoro.plural} active={kind === 'lavoro'} color={TYPE_INFO.lavoro.color} onPress={() => setKind('lavoro')} />
          <Chip label={TYPE_INFO.todo.plural} active={kind === 'todo'} color={TYPE_INFO.todo.color} onPress={() => setKind('todo')} />
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} showDate />}
        ListEmptyComponent={<EmptyState text={empty} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label="Nuovo lavoro" onPress={() => router.push({ pathname: '/item', params: status === 'organizzare' ? { type: 'lavoro', nodate: '1' } : { type: 'lavoro' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: colors.card, padding: 12, paddingHorizontal: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
});
