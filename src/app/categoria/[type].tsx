import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemCard } from '../../components/ItemCard';
import { MONTH_NAMES, todayISO } from '../../lib/dates';
import { formatEuro, totals } from '../../lib/money';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { doneLabel, ITEM_TYPES, TYPE_INFO, type ItemType } from '../../lib/types';

function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CategoryScreen() {
  const { type: raw } = useLocalSearchParams<{ type: string }>();
  const type = (ITEM_TYPES.includes(raw as ItemType) ? raw : 'nota') as ItemType;
  const info = TYPE_INFO[type];
  const { items } = useStore();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [showDone, setShowDone] = useState(false);
  /** Solo Sopralluoghi: tutti, programmati o con data da concordare. */
  const [visitFilter, setVisitFilter] = useState<'tutti' | 'programmati' | 'concordare'>('tutti');
  const toAgree = visitFilter === 'concordare';
  const isVisit = type === 'sopralluogo';
  const isQuote = type === 'preventivo';
  const [quoteFilter, setQuoteFilter] = useState<'dafare' | 'attesa' | 'accettati'>('dafare');

  const isMoney = type === 'soldi';

  const list = useMemo(
    () =>
      items.filter((it) => {
        if (it.type !== type) return false;
        if (isMoney) return it.date == null || it.date.startsWith(month);
        if (isQuote) {
          if (quoteFilter === 'accettati') return it.done;
          if (it.done) return false;
          const toDo = !it.quote && !!it.visitId;
          return quoteFilter === 'dafare' ? toDo : !toDo;
        }
        if (it.done !== showDone) return false;
        if (isVisit && !showDone && visitFilter !== 'tutti') return toAgree ? !it.date : !!it.date;
        return true;
      }),
    [items, type, isMoney, isVisit, isQuote, quoteFilter, month, showDone, visitFilter, toAgree],
  );

  const openVisits = items.filter((it) => it.type === 'sopralluogo' && !it.done);
  const visitCount = { all: openVisits.length, planned: openVisits.filter((it) => it.date).length, toAgree: openVisits.filter((it) => !it.date).length };
  const openQuotes = items.filter((it) => it.type === 'preventivo' && !it.done);
  const quoteCount = { toDo: openQuotes.filter((it) => !it.quote && it.visitId).length, pending: openQuotes.filter((it) => it.quote || !it.visitId).length };
  const t = totals(list);
  const quoteTotal = list.reduce((s, it) => s + (it.amount ?? 0), 0);
  const [y, m] = month.split('-').map(Number);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: info.plural }} />
      <View style={styles.header}>
        {isMoney ? (
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
              ) : isVisit ? (
                <>
                  <Chip label={`Tutti${visitCount.all ? ` (${visitCount.all})` : ''}`} color={info.color} active={!showDone && visitFilter === 'tutti'} onPress={() => (setShowDone(false), setVisitFilter('tutti'))} />
                  <Chip label={`Programmati${visitCount.planned ? ` (${visitCount.planned})` : ''}`} color={info.color} active={!showDone && visitFilter === 'programmati'} onPress={() => (setShowDone(false), setVisitFilter('programmati'))} />
                  <Chip label={`Da concordare${visitCount.toAgree ? ` (${visitCount.toAgree})` : ''}`} color={info.color} active={!showDone && toAgree} onPress={() => (setShowDone(false), setVisitFilter('concordare'))} />
                </>
              ) : (
                <Chip label="Da fare" color={info.color} active={!showDone} onPress={() => setShowDone(false)} />
              )}
              {!isQuote ? (
                <Chip label={type === 'sopralluogo' ? 'Fatti' : `${doneLabel(type)}`} color={info.color} active={showDone} onPress={() => setShowDone(true)} />
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
        ListEmptyComponent={<EmptyState text={isQuote && quoteFilter === 'dafare' ? 'Nessun preventivo da preparare. Quando segni un sopralluogo come fatto, il preventivo da preparare compare qui.' : isVisit && toAgree && !showDone ? 'Nessun sopralluogo da concordare. Tocca + per aggiungerne uno senza data.' : `Niente qui. Tocca + per aggiungere: ${info.label.toLowerCase()}.`} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 100 }}
      />
      <Fab label={`Nuovo: ${info.label}`} onPress={() => (type === 'preventivo' ? router.push('/preventivo') : router.push({ pathname: '/item', params: isVisit && toAgree && !showDone ? { type, nodate: '1' } : { type } }))} />
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
});
