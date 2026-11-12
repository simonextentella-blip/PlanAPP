import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { capitalize, formatLong, formatRelative, todayISO } from '../../lib/dates';
import { amountLabel, formatEuro, totals } from '../../lib/money';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
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
}: {
  title: string;
  icon: IconName;
  color: string;
  summary: string;
  href: Href;
  rows: Item[];
  empty: string;
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
          rows.map((it) => (
            <View key={it.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: TYPE_INFO[it.type].color }]} />
              <Text style={styles.rowTitle} numberOfLines={1}>
                {it.title}
              </Text>
              <Text style={styles.rowMeta}>{amountLabel(it) ?? it.time ?? (it.date && it.date !== todayISO() ? formatRelative(it.date) : '')}</Text>
              <Avatar name={it.createdBy} size={22} />
            </View>
          ))
        )}
      </View>
    </Pressable>
  );
}

function Tile({ type, title, line }: { type: ItemType; title: string; line: string }) {
  const info = TYPE_INFO[type];
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/categoria/[type]', params: { type } })}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityLabel={`Apri ${title}`}
    >
      <View style={[styles.tileIcon, { backgroundColor: info.color }]}>
        <Ionicons name={info.icon.replace('-outline', '') as IconName} size={20} color="#fff" />
      </View>
      <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      <Text style={styles.tileLine} numberOfLines={2}>
        {line}
      </Text>
    </Pressable>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function HomeScreen() {
  const { items, userName } = useStore();
  const today = todayISO();

  const openJobs = items.filter((it) => (it.type === 'lavoro' || it.type === 'todo') && !it.done);
  const overdue = openJobs.filter((it) => it.date && it.date < today).length;
  const unplanned = openJobs.filter((it) => !it.date).length;
  const todayItems = items.filter((it) => it.date === today && inCalendar(it));
  const notes = items.filter((it) => it.type === 'nota');
  const openVisits = items.filter((it) => it.type === 'sopralluogo' && !it.done);
  const pendingQuotes = items.filter((it) => it.type === 'preventivo' && !it.done);
  const month = today.slice(0, 7);
  const money = totals(items.filter((it) => it.type === 'soldi' && it.date?.startsWith(month)));
  const latestNotes = [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.hello}>{userName ? `Ciao ${userName}` : 'Ciao'}</Text>
        <Text style={styles.date}>{capitalize(formatLong(today))}</Text>
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
        empty="Tocca per vedere il mese e aggiungere appuntamenti."
      />

      <View style={styles.tiles}>
        <Tile type="sopralluogo" title="Sopralluoghi" line={openVisits.length ? `${plural(openVisits.length, 'da fare', 'da fare')}${openVisits.some((it) => !it.date) ? ` · ${openVisits.filter((it) => !it.date).length} da concordare` : ''}` : 'Nessuno in programma'} />
        <Tile
          type="preventivo"
          title="Preventivi"
          line={pendingQuotes.length ? `${plural(pendingQuotes.length, 'in attesa', 'in attesa')}` : 'Nessuno in attesa'}
        />
        <Tile type="soldi" title="Soldi" line={`Saldo del mese ${formatEuro(money.saldo)}`} />
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

      <Pressable onPress={() => router.push('/item')} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.addText}>Aggiungi qualcosa</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hello: { fontSize: 26, fontWeight: '800', color: colors.text },
  date: { fontSize: 15, color: colors.muted, marginTop: 2 },
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: colors.text },
  sectionSummary: { fontSize: 14, color: colors.muted, marginTop: 2 },
  rows: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { flex: 1, fontSize: 15, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted },
  empty: { fontSize: 14, color: colors.muted },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minWidth: 0, backgroundColor: colors.card, borderRadius: 16, padding: 12, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tileLine: { fontSize: 12, color: colors.muted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15 },
  addText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
