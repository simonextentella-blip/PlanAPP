import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { formatRelative, todayISO } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { ITEM_TYPES, TYPE_INFO, type Item, type ItemType } from '../../lib/types';

export default function AllNotesScreen() {
  const { items } = useStore();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ItemType | 'tutto'>('tutto');
  const [showPast, setShowPast] = useState(false);
  const [hideDone, setHideDone] = useState(false);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = todayISO();
    const filtered = items.filter((it) => {
      if (type !== 'tutto' && it.type !== type) return false;
      if (hideDone && it.done) return false;
      if (!showPast && it.date && it.date < today) return false;
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
      return a < b ? -1 : 1;
    });
    return keys.map((k) => ({ title: k === '' ? 'Note generali (senza data)' : formatRelative(k), data: groups.get(k)! }));
  }, [items, query, type, showPast, hideDone]);

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tutto" active={type === 'tutto'} onPress={() => setType('tutto')} />
          {ITEM_TYPES.map((t) => (
            <Chip key={t} label={TYPE_INFO[t].plural} color={TYPE_INFO[t].color} active={type === t} onPress={() => setType(t)} />
          ))}
        </ScrollView>
        <View style={styles.toggles}>
          <View style={styles.toggle}>
            <Switch value={showPast} onValueChange={setShowPast} />
            <Text style={styles.toggleText}>Mostra giorni passati</Text>
          </View>
          <View style={styles.toggle}>
            <Switch value={hideDone} onValueChange={setHideDone} />
            <Text style={styles.toggleText}>Nascondi completati</Text>
          </View>
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        ListEmptyComponent={<EmptyState text={items.length === 0 ? 'Non c’è ancora niente. Tocca + per scrivere la prima nota.' : 'Nessun risultato con questi filtri.'} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled
      />
      <Fab label="Nuova nota" onPress={() => router.push({ pathname: '/item', params: { type: 'nota' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: colors.card, paddingTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  search: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text },
  chips: { paddingHorizontal: 16, paddingVertical: 10 },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10, columnGap: 20, rowGap: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, color: colors.text },
  section: { fontSize: 14, fontWeight: '700', color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
});
