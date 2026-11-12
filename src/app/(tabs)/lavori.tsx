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

export default function JobsScreen() {
  const { items } = useStore();
  const [kind, setKind] = useState<Kind>('tutti');
  const [showDone, setShowDone] = useState(false);

  const list = useMemo(
    () =>
      items.filter((it) => {
        if (it.type !== 'lavoro' && it.type !== 'todo') return false;
        if (kind !== 'tutti' && it.type !== kind) return false;
        return it.done === showDone;
      }),
    [items, kind, showDone],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.row}>
          <Chip label="Da completare" active={!showDone} onPress={() => setShowDone(false)} />
          <Chip label="Completati" active={showDone} onPress={() => setShowDone(true)} />
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
        ListEmptyComponent={<EmptyState text={showDone ? 'Nessun lavoro completato.' : 'Nessun lavoro in sospeso. Tocca + per aggiungerne uno.'} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label="Nuovo lavoro" onPress={() => router.push({ pathname: '/item', params: { type: 'lavoro' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: colors.card, padding: 12, paddingHorizontal: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
});
