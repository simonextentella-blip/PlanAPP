import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { MONTH_NAMES, todayISO } from '../../lib/dates';
import { formatEuro, inWorkAccount, totals, workAccountTotals } from '../../lib/money';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { doneLabel, ITEM_TYPES, TYPE_INFO, type ItemType } from '../../lib/types';

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CategoryRoute() {
  const { type: raw } = useLocalSearchParams<{ type: string }>();
  const type = (ITEM_TYPES.includes(raw as ItemType) ? raw : 'nota') as ItemType;
  // I sopralluoghi ora hanno la loro scheda nella barra sotto.
  if (type === 'sopralluogo') return <Redirect href="/sopralluoghi" />;
  return <CategoryScreen key={type} type={type} />;
}

function CategoryScreen({ type }: { type: ItemType }) {
  const info = TYPE_INFO[type];
  const { items } = useStore();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [showDone, setShowDone] = useState(false);
  const isQuote = type === 'preventivo';
  const [quoteFilter, setQuoteFilter] = useState<'dafare' | 'attesa' | 'accettati'>('dafare');

  const isMoney = type === 'soldi';
  // Soldi ha due viste: Generale e Conto lavori (conto a parte con il suo saldo).
  const [moneyView, setMoneyView] = useState<'generale' | 'lavori'>('generale');
  const isWorkAccount = isMoney && moneyView === 'lavori';

  const list = useMemo(
    () =>
      items.filter((it) => {
        if (it.type !== type) return false;
        if (isMoney) {
          if (isWorkAccount) return inWorkAccount(it);
          if (inWorkAccount(it)) return false;
          return it.date == null || it.date.startsWith(month);
        }
        if (isQuote) {
          if (quoteFilter === 'accettati') return it.done;
          if (it.done) return false;
          const toDo = !it.quote && !!it.visitId;
          return quoteFilter === 'dafare' ? toDo : !toDo;
        }
        if (it.done !== showDone) return false;
        return true;
      }),
    [items, type, isMoney, isWorkAccount, isQuote, quoteFilter, month, showDone],
  );

  const openQuotes = items.filter((it) => it.type === 'preventivo' && !it.done);
  const quoteCount = { toDo: openQuotes.filter((it) => !it.quote && it.visitId).length, pending: openQuotes.filter((it) => it.quote || !it.visitId).length };
  const t = totals(list);
  const acc = workAccountTotals(items);
  const accountItems = items.filter(inWorkAccount);
  const balanceItem = accountItems.find((it) => it.direction === 'entrata');
  function openBalance() {
    if (balanceItem) router.push({ pathname: '/item', params: { id: balanceItem.id } });
    else router.push({ pathname: '/item', params: { type: 'soldi', account: 'lavori', direction: 'entrata', title: 'Saldo iniziale' } });
  }
  const quoteTotal = list.reduce((s, it) => s + (it.amount ?? 0), 0);
  const [y, m] = month.split('-').map(Number);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: info.plural }} />
      <View style={styles.header}>
        {isMoney ? (
          <View style={styles.segment} accessibilityRole="tablist">
            {(['generale', 'lavori'] as const).map((v) => {
              const on = moneyView === v;
              return (
                <Pressable key={v} onPress={() => setMoneyView(v)} style={[styles.segBtn, on && styles.segActive]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[styles.segText, on && styles.segTextActive]}>{v === 'generale' ? 'Generale' : 'Conto lavori'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {isWorkAccount ? (
          <>
            <View style={styles.stats}>
              <Stat label="Saldo" value={formatEuro(acc.saldo)} color={colors.text} />
              <Stat label="Spese" value={formatEuro(acc.spese)} color={colors.danger} />
              <Stat label="Rimane" value={formatEuro(acc.rimane)} color={acc.rimane < 0 ? colors.danger : '#16A34A'} />
            </View>
            <Pressable onPress={openBalance} style={({ pressed }) => [styles.balanceBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Ionicons name={balanceItem ? 'create-outline' : 'wallet-outline'} size={18} color={colors.primary} />
              <Text style={styles.balanceText}>{balanceItem ? 'Modifica saldo' : 'Imposta il saldo del conto'}</Text>
            </Pressable>
          </>
        ) : isMoney ? (
          <>
            <View style={styles.monthRow}>
              <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={10} accessibilityLabel="Mese precedente">
                <Ionicons name="chevron-back" size={24} color={info.color} />
              </Pressable>
              <Text style={styles.month}>
                {MONTH_NAMES[m - 1]} {y}
              </Text>
              <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={10} accessibilityLabel="Mese successivo">
                <Ionicons name="chevron-forward" size={24} color={info.color} />
              </Pressable>
            </View>
            <View style={styles.stats}>
              <Stat label="Entrate" value={formatEuro(t.entrate)} color="#16A34A" />
              <Stat label="Uscite" value={formatEuro(t.uscite)} color={colors.danger} />
              <Stat label="Saldo" value={formatEuro(t.saldo)} color={t.saldo < 0 ? colors.danger : colors.text} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.chips}>
              {isQuote ? (
                <>
                  <Chip label={`Da fare${quoteCount.toDo ? ` (${quoteCount.toDo})` : ''}`} color={info.color} active={quoteFilter === 'dafare'} onPress={() => setQuoteFilter('dafare')} />
                  <Chip label={`In attesa${quoteCount.pending ? ` (${quoteCount.pending})` : ''}`} color={info.color} active={quoteFilter === 'attesa'} onPress={() => setQuoteFilter('attesa')} />
                  <Chip label="Accettati" color={info.color} active={quoteFilter === 'accettati'} onPress={() => setQuoteFilter('accettati')} />
                </>
              ) : (
                <Chip label="Da fare" color={info.color} active={!showDone} onPress={() => setShowDone(false)} />
              )}
              {!isQuote ? (
                <Chip label={doneLabel(type)} color={info.color} active={showDone} onPress={() => setShowDone(true)} />
              ) : null}
            </View>
            {isQuote && quoteFilter !== 'dafare' ? (
              <Text style={styles.summary}>
                {list.length} {list.length === 1 ? 'preventivo' : 'preventivi'} · totale {formatEuro(quoteTotal)}
              </Text>
            ) : null}
          </>
        )}
      </View>
      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <ItemCard item={item} showDate />}
        ListEmptyComponent={<EmptyState text={isWorkAccount ? 'Il Conto lavori ha un saldo tutto suo. Imposta il saldo, poi tocca + per aggiungere le spese: scalano solo da qui, non dai totali di Soldi.' : isQuote && quoteFilter === 'dafare' ? 'Nessun preventivo da preparare. Quando segni un sopralluogo come fatto, il preventivo da preparare compare qui.' : `Niente qui. Tocca + per aggiungere: ${info.label.toLowerCase()}.`} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label={isWorkAccount ? 'Nuova spesa' : `Nuovo: ${info.label}`} onPress={() => (isWorkAccount ? router.push({ pathname: '/item', params: { type: 'soldi', account: 'lavori', direction: 'uscita' } }) : type === 'preventivo' ? router.push('/preventivo') : router.push({ pathname: '/item', params: { type } }))} />
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
  header: { backgroundColor: colors.card, padding: 16, paddingTop: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 18, fontWeight: '700', color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10 },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  summary: { fontSize: 14, color: colors.muted },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: '#E8EBE5' },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  segActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  segTextActive: { color: colors.primary },
  balanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  balanceText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
