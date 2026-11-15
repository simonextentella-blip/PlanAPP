import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { ItemCard } from '../components/ItemCard';
import { accountTotals, formatEuro } from '../lib/money';
import { categoryIcon, SPESA_CATEGORIES, spesaCategory } from '../lib/spese';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

/** Un conto lavori: saldo, spese, quanto rimane e l'elenco dei movimenti. */
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, getAccount } = useStore();
  const account = getAccount(id);
  // Categorie aperte nell'elenco (menu a tendina): all'inizio tutte chiuse.
  const [open, setOpen] = useState<Record<string, boolean>>({});

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
  const balanceItems = list.filter((it) => it.direction === 'entrata');
  const balanceItem = balanceItems[balanceItems.length - 1];
  // Spese raggruppate per categoria, nell'ordine delle categorie pronte.
  const spese = list.filter((it) => it.direction === 'uscita');
  const groups = SPESA_CATEGORIES.map((c) => {
    const rows = spese.filter((it) => spesaCategory(it.title) === c.label);
    return { label: c.label, rows, total: rows.reduce((s, it) => s + (it.amount ?? 0), 0) };
  }).filter((g) => g.rows.length);

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
      <ScrollView contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}>
        {groups.length === 0 ? <EmptyState text="Nessuna spesa. Tocca + per aggiungerne una: scala solo dal saldo di questo conto." /> : null}
        {groups.map((g) => {
          const on = !!open[g.label];
          return (
            <View key={g.label} style={styles.group}>
              <Pressable
                onPress={() => setOpen((o) => ({ ...o, [g.label]: !on }))}
                style={({ pressed }) => [styles.groupHead, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
              >
                <View style={styles.groupIcon}>
                  <Ionicons name={categoryIcon(g.label)} size={20} color="#0F766E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{g.label}</Text>
                  <Text style={styles.groupCount}>
                    {g.rows.length} {g.rows.length === 1 ? 'spesa' : 'spese'}
                  </Text>
                </View>
                <Text style={styles.groupTotal}>− {formatEuro(g.total)}</Text>
                <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
              </Pressable>
              {on ? (
                <View style={styles.groupBody}>
                  {g.rows.map((it) => (
                    <ItemCard key={it.id} item={it} showDate hideType />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
        {balanceItems.length ? (
          <>
            <Text style={styles.sectionTitle}>SALDO</Text>
            {balanceItems.map((it) => (
              <ItemCard key={it.id} item={it} showDate hideType />
            ))}
          </>
        ) : null}
      </ScrollView>
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
  group: { marginHorizontal: 16, marginVertical: 5, backgroundColor: colors.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  groupIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F2F0' },
  groupName: { fontSize: 16, fontWeight: '700', color: colors.text },
  groupCount: { fontSize: 13, color: colors.muted, marginTop: 1 },
  groupTotal: { fontSize: 16, fontWeight: '700', color: colors.danger, fontVariant: ['tabular-nums'] },
  groupBody: { backgroundColor: colors.bg, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: colors.muted, paddingHorizontal: 20, marginTop: 18, marginBottom: 6 },
});
