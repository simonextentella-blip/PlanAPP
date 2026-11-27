import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Chip } from '../components/Chip';
import { ClientPicker } from '../components/ClientPicker';
import { StepBack } from '../components/StepBack';
import { ChainPhotos, PhotoEditor } from '../components/Photos';
import { deletePhotos } from '../lib/photos';
import { addDays, countDays, daysBetween, formatPickerDate, isValidTime, normalizeTime, todayISO } from '../lib/dates';
import { SPESA_CATEGORIES } from '../lib/spese';
import { useStore } from '../lib/store';
import { colors, unscheduled } from '../lib/theme';
import { formatEuro, parseEuro } from '../lib/money';
import { CHECKABLE, collabLabel, doneLabel, TYPE_INFO, WITH_AMOUNT, type Direction, type ItemType, WITH_CLIENT } from '../lib/types';

const PLACEHOLDERS: Record<ItemType, string> = {
  appuntamento: 'Es. Incontro con il cliente Rossi',
  sopralluogo: 'Es. Sopralluogo via Roma 12',
  lavoro: 'Es. Installazione impianto',
  todo: 'Es. Ordinare materiale',
  nota: 'Es. Promemoria',
  soldi: 'Es. Acconto cliente Bianchi',
  preventivo: 'Es. Preventivo bagno Verdi',
};

/** Tipi che si scelgono dal + generale; gli altri si creano dalla loro sezione. */
const QUICK_TYPES: ItemType[] = ['sopralluogo', 'lavoro', 'preventivo'];

/** Titolo della schermata quando il tipo è già deciso, es. "Nuovo sopralluogo". */
function newTitle(type: ItemType): string {
  if (type === 'nota') return 'Nuova nota';
  if (type === 'todo') return 'Nuova cosa da fare';
  if (type === 'soldi') return 'Nuovo movimento';
  return `Nuovo ${TYPE_INFO[type].label.toLowerCase()}`;
}

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string; type?: ItemType; nodate?: string; account?: string; direction?: Direction; title?: string }>();
  const { getItem, addItem, updateItem, removeItem, getClient } = useStore();
  const existing = params.id ? getItem(params.id) : undefined;

  const [type, setType] = useState<ItemType>(existing?.type ?? params.type ?? 'sopralluogo');
  const [title, setTitle] = useState(existing?.title ?? params.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [date, setDate] = useState<string | null>(existing ? existing.date : params.date ?? (params.type === 'nota' || params.nodate ? null : todayISO()));
  // Solo lavori: ultimo giorno se il lavoro dura più giorni (Dal … Al …).
  const [endDate, setEndDate] = useState<string | null>(existing?.endDate ?? null);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [time, setTime] = useState(existing?.time ?? '');
  const [done, setDone] = useState(existing?.done ?? false);
  // Solo lavori fatti: "non ancora pagato" manda l'importo in Soldi › Da prendere.
  const [unpaid, setUnpaid] = useState(!!existing?.unpaid);
  const [clientId, setClientId] = useState<string | null>(existing?.clientId ?? null);
  // Lavoro senza cliente: "Collaborazione" con un nome facoltativo, scritto ogni volta.
  const [isCollab, setIsCollab] = useState(existing?.collab != null);
  const [collabName, setCollabName] = useState(existing?.collab ?? '');
  const [amount, setAmount] = useState(existing?.amount != null ? formatEuro(existing.amount).replace('€ ', '') : '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? params.direction ?? 'entrata');
  // Movimento del Conto lavori: entrata = soldi aggiunti al conto (anche più volte), uscita = spesa.
  const account: string | null = type === 'soldi' ? existing?.account ?? params.account ?? null : null;
  const isSpesa = !!account && direction === 'uscita';
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = !!existing;
  const isRange = type === 'lavoro' && !!date && !!endDate && endDate > date;

  /** Cambia il primo giorno: se il lavoro dura più giorni, sposta anche la fine (stessa durata). */
  function changeStart(d: string) {
    if (date && endDate && endDate > date) setEndDate(addDays(d, countDays(date, endDate) - 1));
    setDate(d);
  }
  const color = TYPE_INFO[type].color;
  // La scelta del tipo serve solo quando si crea dal + generale: dentro una sezione il tipo è già deciso.
  const typeFixed = isEdit || !!params.type;

  function save() {
    const collab = type === 'lavoro' && isCollab ? collabName.trim() : null;
    const chosen = clientId && collab == null ? getClient(clientId) : undefined;
    const t = title.trim() || (account && direction === 'entrata' ? 'Soldi aggiunti' : '') || (collab != null ? collabLabel({ collab })! : chosen ? `${TYPE_INFO[type].label} – ${chosen.name}` : '');
    if (!t) return setError(isSpesa ? 'Scegli una categoria: Pranzo, Benzina, Materiali o Altro.' : 'Scrivi un titolo (o scegli un cliente).');
    const tm = time.trim();
    if (tm && !isValidTime(tm)) return setError('Orario non valido: usa il formato 09:30.');
    const hasAmount = WITH_AMOUNT.includes(type);
    const parsed = hasAmount ? parseEuro(amount) : null;
    if (hasAmount && amount.trim() && parsed == null) return setError('Importo non valido: scrivi ad esempio 1250,00.');
    const data = {
      type,
      title: t,
      description: description.trim(),
      date,
      ...(type === 'lavoro' ? { endDate: date && endDate && endDate > date ? endDate : null } : {}),
      time: tm && date ? normalizeTime(tm) : null,
      done: CHECKABLE.includes(type) ? done : false,
      clientId: WITH_CLIENT.includes(type) && !isSpesa && collab == null ? clientId : null,
      ...(type === 'lavoro' ? { collab } : {}),
      amount: parsed,
      direction: type === 'soldi' ? direction : null,
      account,
      ...(type === 'lavoro' ? { unpaid: done && unpaid } : {}),
      ...(type === 'sopralluogo' ? { photos } : {}),
    };
    if (type === 'sopralluogo') deletePhotos((existing?.photos ?? []).filter((p) => !photos.includes(p)));
    if (existing) updateItem(existing.id, data);
    else addItem(data);
    router.back();
  }

  function remove() {
    if (!existing) return;
    // Primo tocco: chiede conferma. Secondo tocco: elimina.
    if (!confirmDelete) return setConfirmDelete(true);
    removeItem(existing.id);
    router.back();
  }

  if (params.id && !existing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Non trovato' }} />
        <Text style={styles.muted}>Questo elemento non esiste più.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: account ? (direction === 'uscita' ? (isEdit ? 'Modifica spesa' : 'Nuova spesa') : isEdit ? 'Soldi aggiunti' : 'Aggiungi soldi') : isEdit ? 'Modifica' : typeFixed ? newTitle(type) : 'Nuovo',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.headerBtn}>Annulla</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.headerBtn, { fontWeight: '700' }]}>Salva</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {typeFixed ? null : (
          <View>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tiles}>
              {QUICK_TYPES.map((t) => {
                const info = TYPE_INFO[t];
                const on = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => (t === 'preventivo' ? router.replace('/preventivo') : setType(t))}
                    style={({ pressed }) => [styles.tile, on && { borderColor: info.color, borderWidth: 2, backgroundColor: info.color + '1A' }, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: on ? info.color : info.color + '1A' }]}>
                      <Ionicons name={info.icon as keyof typeof Ionicons.glyphMap} size={24} color={on ? '#fff' : info.color} />
                    </View>
                    <Text style={[styles.tileText, on && { color: info.color }]} numberOfLines={1}>
                      {info.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {type === 'preventivo' && !isEdit ? (
          <Pressable onPress={() => router.replace('/preventivo')} style={[styles.banner, { borderColor: color }]}>
            <Ionicons name="receipt-outline" size={20} color={color} />
            <Text style={[styles.bannerText, { color }]}>Crea con il modulo preventivo completo (righe, IVA, PDF)</Text>
            <Ionicons name="chevron-forward" size={18} color={color} />
          </Pressable>
        ) : null}

        {WITH_CLIENT.includes(type) && !isSpesa ? (
          <View>
            <Text style={styles.label}>{type === 'lavoro' ? 'Per chi' : 'Cliente'}</Text>
            {type === 'lavoro' ? (
              <View style={[styles.chips, { marginBottom: 10 }]}>
                <Chip label="Cliente" color={color} active={!isCollab} onPress={() => setIsCollab(false)} />
                <Chip label="Collaborazione" color={color} active={isCollab} onPress={() => setIsCollab(true)} />
              </View>
            ) : null}
            {type === 'lavoro' && isCollab ? (
              <TextInput
                value={collabName}
                onChangeText={setCollabName}
                placeholder="Con chi? (facoltativo)"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            ) : (
              <ClientPicker value={clientId} onChange={(c) => setClientId(c?.id ?? null)} color={color} />
            )}
          </View>
        ) : null}

        {isSpesa ? (
          <View>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.catGrid}>
              {SPESA_CATEGORIES.map((c) => {
                const on = title === c.label;
                return (
                  <Pressable
                    key={c.label}
                    onPress={() => {
                      setTitle(c.label);
                      setError('');
                    }}
                    style={({ pressed }) => [styles.catTile, on && { borderColor: color, borderWidth: 2, backgroundColor: color + '1A' }, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Ionicons name={c.icon} size={22} color={on ? color : colors.muted} />
                    <Text style={[styles.catText, on && { color }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
        <View>
          <Text style={styles.label}>Titolo</Text>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setError('');
            }}
            placeholder={account ? (direction === 'uscita' ? 'Es. Benzina furgone, corde nuove' : 'Es. Saldo iniziale, ricarica (facoltativo)') : PLACEHOLDERS[type]}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus={!isEdit}
          />
        </View>
        )}

        <View>
          <Text style={styles.label}>{isRange ? 'Dal' : 'Giorno'}</Text>
          <View style={styles.seg}>
            <Pressable
              onPress={() => {
                setDate(null);
                setEndDate(null);
                setShowEndCalendar(false);
                setShowCalendar(false);
              }}
              style={[styles.segHalf, !date && styles.segUnset]}
              accessibilityRole="button"
              accessibilityState={{ selected: !date }}
            >
              <Ionicons name="time-outline" size={19} color={date ? colors.muted : unscheduled.text} />
              <Text style={[styles.segText, { color: date ? colors.muted : unscheduled.text }]} numberOfLines={1}>
                {type === 'sopralluogo' ? 'Da concordare' : type === 'lavoro' || type === 'todo' ? 'Da organizzare' : 'Nessuna data'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (date) setShowCalendar((s) => !s);
                else {
                  setDate(params.date ?? todayISO());
                  setShowCalendar(true);
                }
              }}
              style={[styles.segHalf, date && { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityState={{ selected: !!date }}
            >
              <Ionicons name="calendar-outline" size={19} color={date ? '#fff' : colors.muted} />
              <Text style={[styles.segText, { color: date ? '#fff' : colors.muted }]} numberOfLines={1}>
                {date ? formatPickerDate(date) : 'Scegli data'}
              </Text>
            </Pressable>
          </View>
          {date && showCalendar ? (
            <Calendar
              current={date}
              firstDay={1}
              markedDates={{ [date]: { selected: true, selectedColor: colors.primary } }}
              theme={{ todayTextColor: colors.primary, arrowColor: colors.primary }}
              onDayPress={(d) => {
                changeStart(d.dateString);
                setShowCalendar(false);
              }}
              style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
            />
          ) : null}
          {type === 'lavoro' && date && !isRange ? (
            <Pressable
              onPress={() => {
                setEndDate(addDays(date, 1));
                setShowCalendar(false);
                setShowEndCalendar(true);
              }}
              style={({ pressed }) => [styles.moreDays, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Ionicons name="add-circle-outline" size={19} color={colors.primary} />
              <Text style={styles.moreDaysText}>Più giorni (dal … al …)</Text>
            </Pressable>
          ) : null}
        </View>

        {isRange ? (
          <View>
            <Text style={styles.label}>Al</Text>
            <View style={styles.endRow}>
              <Pressable
                onPress={() => {
                  setShowEndCalendar((s) => !s);
                  setShowCalendar(false);
                }}
                style={[styles.endBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Ionicons name="calendar-outline" size={19} color="#fff" />
                <Text style={[styles.segText, { color: '#fff' }]} numberOfLines={1}>
                  {formatPickerDate(endDate!)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEndDate(null);
                  setShowEndCalendar(false);
                }}
                style={({ pressed }) => [styles.endClear, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Un giorno solo"
              >
                <Ionicons name="close" size={18} color={colors.muted} />
                <Text style={styles.endClearText}>Un giorno solo</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>{countDays(date!, endDate!)} giorni: il lavoro compare in calendario in tutti questi giorni.</Text>
            {showEndCalendar ? (
              <Calendar
                current={endDate!}
                firstDay={1}
                minDate={addDays(date!, 1)}
                markingType="period"
                markedDates={Object.fromEntries(
                  daysBetween(date!, endDate!).map((d, i, all) => [
                    d,
                    { color: colors.primary, textColor: '#fff', startingDay: i === 0, endingDay: i === all.length - 1 },
                  ]),
                )}
                theme={{ todayTextColor: colors.primary, arrowColor: colors.primary }}
                onDayPress={(d) => {
                  setEndDate(d.dateString);
                  setShowEndCalendar(false);
                }}
                style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
              />
            ) : null}
          </View>
        ) : null}

        {date && !isSpesa ? (
          <View>
            <Text style={styles.label}>{isRange ? 'Orario di inizio (facoltativo)' : 'Orario (facoltativo)'}</Text>
            <TextInput
              value={time}
              onChangeText={(v) => {
                setTime(v);
                setError('');
              }}
              placeholder="09:30"
              placeholderTextColor={colors.muted}
              style={[styles.input, { width: 120 }]}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        ) : null}

        <View>
          <Text style={styles.label}>{isSpesa ? 'Da dove viene (facoltativo)' : 'Note'}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={isSpesa ? 'Es. Distributore Eni Bracciano, ferramenta Rossi…' : 'Dettagli, indirizzo, materiale, telefono…'}
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
          />
        </View>

        {type === 'sopralluogo' ? <PhotoEditor photos={photos} onChange={setPhotos} /> : existing ? <ChainPhotos item={existing} /> : null}

        {WITH_AMOUNT.includes(type) ? (
          <View>
            <Text style={styles.label}>{account ? (direction === 'uscita' ? 'Quanto hai speso' : 'Quanti soldi aggiungi') : 'Importo'}</Text>
            {type === 'soldi' && !account ? (
              <View style={[styles.chips, { marginBottom: 10 }]}>
                <Chip label="Entrata" color="#16A34A" active={direction === 'entrata'} onPress={() => setDirection('entrata')} />
                <Chip label="Uscita" color={colors.danger} active={direction === 'uscita'} onPress={() => setDirection('uscita')} />
              </View>
            ) : null}
            <View style={styles.amountRow}>
              <Text style={styles.euro}>€</Text>
              <TextInput
                value={amount}
                onChangeText={(v) => {
                  setAmount(v);
                  setError('');
                }}
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                style={[styles.input, { flex: 1 }]}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : null}

        {CHECKABLE.includes(type) ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{doneLabel(type)}</Text>
            <Switch value={done} onValueChange={setDone} />
          </View>
        ) : null}

        {type === 'lavoro' && done ? (
          <View>
            <Text style={styles.label}>Pagamento</Text>
            <View style={styles.chips}>
              <Chip label="Pagato" color="#16A34A" active={!unpaid} onPress={() => setUnpaid(false)} />
              <Chip label="Non ancora pagato" color="#EA580C" active={unpaid} onPress={() => setUnpaid(true)} />
            </View>
            <Text style={styles.hint}>
              {unpaid
                ? "L'importo va in Soldi › Da prendere e non conta nel saldo finché non segni Pagato."
                : "L'importo entra nel saldo di Soldi."}
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: color }]}>
          <Text style={styles.saveText}>{isEdit ? 'Salva modifiche' : 'Aggiungi'}</Text>
        </Pressable>

        {isEdit ? (
          <>
            <StepBack item={existing!} />
            <Pressable onPress={remove} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteText}>{confirmDelete ? 'Tocca di nuovo per eliminare' : 'Elimina'}</Text>
            </Pressable>
            <Text style={styles.muted}>
              Aggiunto da {existing!.createdBy} · ultima modifica {new Date(existing!.updatedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBtn: { fontSize: 17, color: colors.primary, paddingHorizontal: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tiles: { flexDirection: 'row', gap: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14 },
  catText: { fontSize: 16, fontWeight: '600', color: colors.text },
  tile: { flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 4 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  input: { backgroundColor: colors.card, fontSize: 17, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: colors.text },
  multiline: { minHeight: 110 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: colors.card },
  bannerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  euro: { fontSize: 20, fontWeight: '700', color: colors.text },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 4, gap: 4 },
  segHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 9 },
  segUnset: { backgroundColor: unscheduled.bg, borderWidth: 1, borderColor: unscheduled.border },
  segText: { fontSize: 15, fontWeight: '600' },
  moreDays: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  moreDaysText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, paddingHorizontal: 6, borderRadius: 12 },
  endClear: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  endClearText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border },
  switchText: { fontSize: 16, color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 8 },
  error: { color: colors.danger, fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
