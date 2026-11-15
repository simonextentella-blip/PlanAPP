import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { formatRelative } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import type { Item } from '../../lib/types';

export default function AllNotesScreen() {
  const { items } = useStore();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Qui solo le note (appunti): lavori, preventivi, sopralluoghi ecc. hanno le loro schermate.
    const notes = items.filter((it) => it.type === 'nota');
    const filtered = notes.filter((it) => {
      if (q && !`${it.title} ${it.description} ${it.createdBy}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const groups = new Map<string, Item[]>();
    for (const it of filtered) {
      const key = it.date ?? '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      if (a === '') return -1;
      if (b === '') return 1;
      return a < b ? 1 : -1; // le più recenti in alto
    });
    return { total: notes.length, list: keys.map((k) => ({ title: k === '' ? 'Note generali (senza data)' : formatRelative(k), data: groups.get(k)! })) };
  }, [items, query]);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca nelle note…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      <SectionList
        sections={sections.list}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        ListEmptyComponent={<EmptyState text={sections.total === 0 ? 'Nessuna nota. Tocca + per appuntare qualcosa.' : 'Nessuna nota trovata.'} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
      />
      <Fab label="Nuova nota" onPress={() => router.push({ pathname: '/item', params: { type: 'nota' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: colors.card, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  search: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text },
  section: { fontSize: 14, fontWeight: '700', color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
});
