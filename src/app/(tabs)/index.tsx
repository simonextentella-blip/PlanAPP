import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { capitalize, formatDayMonth, formatShort, todayISO } from '../../lib/dates';
import { amountLabel, formatEuro, inWorkAccount, isToCollect, totals } from '../../lib/money';
import { useStore } from '../../lib/store';
import { colors, unscheduled as UNSCHEDULED } from '../../lib/theme';
import { inCalendar, TYPE_INFO, type Item, type ItemType } from '../../lib/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Section({
  title,
  icon,
  color,
  summary,
  href,
  rows,
  empty,
  hideToday = false,
}: {
  title: string;
  icon: IconName;
  color: string;
  summary: string;
  href: Href;
  rows: Item[];
  empty: string;
  /** Nel Calendario di oggi la data è sottintesa: si mostra solo l'orario. */
  hideToday?: boolean;
}) {
  return (
    <Pressable
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [styles.section, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={`Apri ${title}`}
    >
      <View style={styles.sectionHead}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSummary}>{summary}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.muted} />
      </View>
      <View style={styles.rows}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{empty}</Text>
        ) : (
          rows.map((it, i) => (
            <View key={it.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.dot, { backgroundColor: TYPE_INFO[it.type].color }]} />
              <Text style={styles.rowTitle} numberOfLines={1}>
                {it.title}
              </Text>
              <Text style={styles.rowMeta}>{amountLabel(it) ?? (it.date && !(hideToday && it.date === todayISO()) ? formatShort(it.date, it.time) : it.time ?? '')}</Text>
              <Avatar name={it.createdBy} size={24} />
            </View>
          ))
        )}
      </View>
    </Pressable>
  );
}

/** Riquadro piccolo: icona a sinistra, numero grande a destra, titolo e riga sotto. */
function Tile({
  title,
  icon,
  color,
  value,
  line,
  lineAccent = false,
  onPress,
}: {
  title: string;
  icon: IconName;
  color: string;
  value: string;
  line: string;
  lineAccent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={`Apri ${title}`}
    >
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <Text style={[styles.tileValue, value.length > 5 && { fontSize: 21 }, value.length > 8 && { fontSize: 17 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {value}
        </Text>
      </View>
      <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <Text style={[styles.tileLine, lineAccent && { color: UNSCHEDULED.text }]} numberOfLines={2}>
        {line}
      </Text>
    </Pressable>
  );
}

function typeIcon(type: ItemType) {
  return TYPE_INFO[type].icon.replace('-outline', '') as IconName;
}

function openCategory(type: ItemType) {
  // I sopralluoghi hanno la loro scheda nella barra sotto.
  if (type === 'sopralluogo') return router.navigate('/sopralluoghi');
  router.push({ pathname: '/categoria/[type]', params: { type } });
}

/** "+4.180 €" senza decimali, per il numero grande del riquadro Soldi. */
function compactEuro(n: number) {
  const int = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '−' : n > 0 ? '+' : ''}${int} €`;
}

function quoteLine(open: Item[]) {
  const toDo = open.filter((it) => !it.quote && it.visitId).length;
  const waiting = open.length - toDo;
  const waitingTotal = open.filter((it) => it.quote || !it.visitId).reduce((sum, it) => sum + (it.amount ?? 0), 0);
  const parts = [toDo ? `${toDo} da fare` : '', waiting ? `${waiting} in attesa` : '', waitingTotal ? formatEuro(waitingTotal) : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nessuno in sospeso';
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function HomeScreen() {
  const { items, userName, clients } = useStore();
  const insets = useSafeAreaInsets();
  const today = todayISO();

  const openJobs = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && !it.done);
  const overdue = openJobs.filter((it) => it.date && it.date < today).length;
  const unplanned = openJobs.filter((it) => !it.date).length;
  const todayItems = items.filter((it) => it.date === today && inCalendar(it));
  const notes = items.filter((it) => it.type === 'nota');
  const openVisits = items.filter((it) => it.type === 'sopralluogo' && !it.done);
  const pendingQuotes = items.filter((it) => it.type === 'preventivo' && !it.done);
  const month = today.slice(0, 7);
  const money = totals(items.filter((it) => it.type === 'soldi' && !inWorkAccount(it) && it.date?.startsWith(month)));
  const toCollect = items.filter((it) => isToCollect(it) && !inWorkAccount(it)).reduce((n, it) => n + (it.amount ?? 0), 0);
  const visitsToAgree = openVisits.filter((it) => !it.date).length;
  const monthName = formatDayMonth(today).split(' ').pop();
  const latestNotes = [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{capitalize(formatDayMonth(today))}</Text>
          <Text style={styles.hello} numberOfLines={1} adjustsFontSizeToFit>
            {userName ? `Ciao ${userName}` : 'Ciao'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/profilo')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Profilo">
          {userName ? (
            <Avatar name={userName} size={44} />
          ) : (
            <View style={styles.noAvatar}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
        </Pressable>
      </View>

      <Section
        title="Lavori"
        icon="construct"
        color={TYPE_INFO.lavoro.color}
        summary={
          openJobs.length === 0
            ? 'Tutto completato'
            : `${plural(openJobs.length, 'da completare', 'da completare')}${overdue ? ` · ${plural(overdue, 'in ritardo', 'in ritardo')}` : ''}${unplanned ? ` · ${unplanned} da organizzare` : ''}`
        }
        href="/lavori"
        rows={openJobs.slice(0, 3)}
        empty="Nessun lavoro in sospeso."
      />

      <Section
        title="Calendario"
        icon="calendar"
        color={TYPE_INFO.appuntamento.color}
        summary={todayItems.length === 0 ? 'Oggi niente in programma' : `Oggi ${plural(todayItems.length, 'impegno', 'impegni')}`}
        href="/calendario"
        rows={todayItems.slice(0, 3)}
        hideToday
        empty="Tocca per vedere il mese e aggiungere appuntamenti."
      />

      <View style={styles.tiles}>
        <Tile
          title="Sopralluoghi"
          icon={typeIcon('sopralluogo')}
          color={TYPE_INFO.sopralluogo.color}
          value={String(openVisits.length)}
          line={visitsToAgree ? `${visitsToAgree} da concordare` : openVisits.length ? 'da fare' : 'Nessuno in programma'}
          lineAccent={visitsToAgree > 0}
          onPress={() => openCategory('sopralluogo')}
        />
        <Tile
          title="Preventivi"
          icon={typeIcon('preventivo')}
          color={TYPE_INFO.preventivo.color}
          value={String(pendingQuotes.length)}
          line={quoteLine(pendingQuotes)}
          onPress={() => openCategory('preventivo')}
        />
        <Tile
          title="Soldi"
          icon={typeIcon('soldi')}
          color={TYPE_INFO.soldi.color}
          value={compactEuro(money.saldo)}
          line={`saldo di ${monthName}${toCollect ? ` · ${compactEuro(toCollect)} da prendere` : ''}`}
          onPress={() => openCategory('soldi')}
        />
        <Tile
          title="Clienti"
          icon="people"
          color="#475569"
          value={String(clients.length)}
          line={clients.length ? 'in rubrica' : 'Nessun cliente'}
          onPress={() => router.push('/clienti')}
        />
      </View>

      <Section
        title="Note"
        icon="document-text"
        color={TYPE_INFO.nota.color}
        summary={plural(notes.length, 'nota', 'note')}
        href="/note"
        rows={latestNotes}
        empty="Nessuna nota scritta."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, marginBottom: 2 },
  hello: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  date: { fontSize: 15, color: colors.muted, marginBottom: 2 },
  noAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
  sectionSummary: { fontSize: 14, color: colors.muted, marginTop: 2 },
  rows: { borderTopWidth: 1, borderColor: colors.divider },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderColor: colors.divider },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { flex: 1, fontSize: 15, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted },
  empty: { fontSize: 14, color: colors.muted, paddingTop: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, minWidth: 0, backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 2, borderWidth: 1, borderColor: colors.border },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  tileIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileValue: { flex: 1, textAlign: 'right', fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  tileTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  tileLine: { fontSize: 13, color: colors.muted },
});
