import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

export default function ClientsScreen() {
  const { clients, items } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q ? clients.filter((c) => `${c.name} ${c.address} ${c.cityLine} ${c.phone} ${c.email}`.toLowerCase().includes(q)) : clients;

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Cerca cliente…" placeholderTextColor={colors.muted} style={styles.searchInput} />
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const n = items.filter((it) => it.clientId === item.id).length;
          return (
            <Pressable onPress={() => router.push({ pathname: '/cliente', params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
              <Avatar name={item.name} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {[item.cityLine || item.address, item.phone].filter(Boolean).join(' · ') || 'Nessun dettaglio'}
                </Text>
              </View>
              {n ? <Text style={styles.count}>{n}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={<EmptyState text={q ? 'Nessun cliente trovato.' : 'Nessun cliente. Tocca + per aggiungere il primo, oppure crealo direttamente da un preventivo o da un sopralluogo.'} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label="Nuovo cliente" onPress={() => router.push('/cliente')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top: { backgroundColor: colors.card, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  count: { fontSize: 13, fontWeight: '700', color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});
