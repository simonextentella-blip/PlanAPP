import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { ItemCard } from '../components/ItemCard';
import { accountTotals, formatEuro } from '../lib/money';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

/** Un conto lavori: saldo, spese, quanto rimane e l'elenco dei movimenti. */
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, getAccount } = useStore();
  const account = getAccount(id);

  if (!account) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ title: 'Conto' }} />
        <Text style={{ color: colors.muted }}>Questo conto non esiste più.</Text>
      </View>
    );
  }

  const t = accountTotals(items, account.id);
  // Più recenti in alto.
  const list = items.filter((it) => it.type === 'soldi' && it.account === account.id).reverse();
  const balanceItem = list.find((it) => it.direction === 'entrata');

  function openBalance() {
    if (balanceItem) router.push({ pathname: '/item', params: { id: balanceItem.id } });
    else router.push({ pathname: '/item', params: { type: 'soldi', account: account!.id, direction: 'entrata', title: 'Saldo iniziale' } });
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/conto-modifica', params: { id: account.id } })} hitSlop={10} accessibilityLabel="Rinomina o elimina il conto">
              <Text style={styles.headerBtn}>Modifica</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={styles.stats}>
          <Stat label="Saldo" value={formatEuro(t.saldo)} color={colors.text} />
          <Stat label="Spese" value={formatEuro(t.spese)} color={colors.danger} />
          <Stat label="Rimane" value={formatEuro(t.rimane)} color={t.rimane < 0 ? colors.danger : '#16A34A'} />
        </View>
        <Pressable onPress={openBalance} style={({ pressed }) => [styles.balanceBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Ionicons name={balanceItem ? 'create-outline' : 'wallet-outline'} size={18} color={colors.primary} />
          <Text style={styles.balanceText}>{balanceItem ? 'Modifica saldo' : 'Imposta il saldo del conto'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} showDate hideType />}
        ListEmptyComponent={<EmptyState text="Nessuna spesa. Tocca + per aggiungerne una: scala solo dal saldo di questo conto." />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label="Nuova spesa" onPress={() => router.push({ pathname: '/item', params: { type: 'soldi', account: account.id, direction: 'uscita' } })} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerBtn: { fontSize: 16, color: colors.primary, paddingHorizontal: 8 },
  header: { backgroundColor: colors.card, padding: 16, paddingTop: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10 },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  balanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  balanceText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
