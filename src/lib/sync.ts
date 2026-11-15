import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLE } from './supabase';

/**
 * Sincronizzazione con Supabase.
 * Ogni cosa (elemento, cliente, conto, dati fornitore) è una riga della tabella planapp_records.
 * Le modifiche fatte sul telefono vanno prima in una coda salvata sul telefono, poi vengono inviate:
 * così non si perde niente anche senza campo. Le cancellazioni restano come righe "deleted",
 * così anche l'altro telefono sa che vanno tolte.
 */
export type Collection = 'items' | 'clients' | 'accounts' | 'suppliers' | 'profiles';

export interface RemoteRecord {
  collection: Collection;
  id: string;
  data: unknown;
  deleted: boolean;
}

interface Pending {
  collection: Collection;
  id: string;
  /** null = cancellato */
  data: unknown | null;
}

const PENDING_KEY = 'planapp.pending.v1';
const pending = new Map<string, Pending>();
const k = (c: Collection, id: string) => `${c}/${id}`;

let loaded: Promise<void> | null = null;
export function loadPending(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!raw) return;
        for (const p of JSON.parse(raw) as Pending[]) if (!pending.has(k(p.collection, p.id))) pending.set(k(p.collection, p.id), p);
      })
      .catch(() => {});
  }
  return loaded;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function savePending() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...pending.values()])).catch(() => {});
  }, 200);
}

const listeners = new Set<() => void>();
export function onPendingChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
// Avvisa dopo, mai durante un aggiornamento di React.
const notify = () => setTimeout(() => listeners.forEach((fn) => fn()), 0);

export const pendingCount = () => pending.size;
export const isPending = (c: Collection, id: string) => pending.has(k(c, id));

let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Mette in coda una modifica (data = null per una cancellazione) e la invia appena possibile. */
export function queue(c: Collection, id: string, data: unknown | null) {
  pending.set(k(c, id), { collection: c, id, data });
  savePending();
  notify();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 400);
}

/** Mette in coda le differenze tra due elenchi (per id): aggiunti, cambiati, tolti. */
export function queueListDiff<T extends { id: string }>(c: Collection, prev: T[], next: T[]) {
  if (!supabase) return;
  const before = new Map(prev.map((x) => [x.id, x]));
  for (const x of next) {
    if (before.get(x.id) !== x) queue(c, x.id, x);
    before.delete(x.id);
  }
  for (const id of before.keys()) queue(c, id, null);
}

/** Come queueListDiff, per un oggetto con chiavi (dati fornitore per persona). */
export function queueMapDiff<T>(c: Collection, prev: Record<string, T>, next: Record<string, T>) {
  if (!supabase) return;
  for (const [id, v] of Object.entries(next)) if (prev[id] !== v) queue(c, id, v);
  for (const id of Object.keys(prev)) if (!(id in next)) queue(c, id, null);
}

let flushing: Promise<boolean> | null = null;
/** Invia la coda. Restituisce true se è tutto inviato. */
export function flush(): Promise<boolean> {
  if (!flushing) {
    flushing = doFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function doFlush(): Promise<boolean> {
  if (!supabase) return true;
  await loadPending();
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return pending.size === 0;
  const batch = [...pending.entries()];
  for (let i = 0; i < batch.length; i += 200) {
    const part = batch.slice(i, i + 200);
    const now = new Date().toISOString();
    const rows = part.map(([, p]) => ({ collection: p.collection, id: p.id, data: p.data, deleted: p.data == null, updated_at: now }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'collection,id' });
    if (error) {
      savePending();
      notify();
      return false;
    }
    // Toglie dalla coda solo ciò che non è cambiato di nuovo nel frattempo.
    for (const [key, p] of part) if (pending.get(key) === p) pending.delete(key);
  }
  savePending();
  notify();
  return pending.size === 0;
}

/** Scarica tutte le righe. Lancia un errore se non c'è connessione. */
export async function pullAll(): Promise<RemoteRecord[]> {
  if (!supabase) return [];
  const out: RemoteRecord[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('collection,id,data,deleted')
      .order('collection')
      .order('id')
      .range(from, from + size - 1);
    if (error) throw error;
    out.push(...((data ?? []) as RemoteRecord[]));
    if (!data || data.length < size) break;
  }
  return out;
}

/** Ascolta in tempo reale le modifiche fatte dall'altro telefono. */
export function subscribe(onRecord: (r: RemoteRecord) => void, onReconnect: () => void): () => void {
  if (!supabase) return () => {};
  const sb = supabase;
  let first = true;
  const ch = sb
    .channel('planapp-records')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      const row = payload.new as RemoteRecord | undefined;
      if (row && row.collection && row.id) onRecord(row);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Dopo una riconnessione ricarica tutto, per non perdere ciò che è cambiato nel frattempo.
        if (!first) onReconnect();
        first = false;
      }
    });
  return () => {
    sb.removeChannel(ch);
  };
}

/**
 * Applica righe remote a un elenco locale. Le cose ancora in coda sul telefono vincono.
 * Con full = true (scaricamento completo) quello che c'è solo sul telefono viene messo in coda
 * per essere caricato: così i dati già presenti passano su Supabase al primo accesso.
 */
export function mergeList<T extends { id: string }>(c: Collection, prev: T[], recs: RemoteRecord[], full: boolean): T[] {
  const map = new Map(prev.map((x) => [x.id, x]));
  const remote = new Set<string>();
  let changed = false;
  for (const r of recs) {
    if (r.collection !== c) continue;
    remote.add(r.id);
    if (isPending(c, r.id)) continue;
    if (r.deleted || r.data == null) {
      if (map.delete(r.id)) changed = true;
    } else {
      const cur = map.get(r.id);
      if (!cur || JSON.stringify(cur) !== JSON.stringify(r.data)) {
        map.set(r.id, r.data as T);
        changed = true;
      }
    }
  }
  if (full) for (const [id, x] of map) if (!remote.has(id) && !isPending(c, id)) queue(c, id, x);
  return changed ? [...map.values()] : prev;
}

export function mergeMap<T>(c: Collection, prev: Record<string, T>, recs: RemoteRecord[], full: boolean): Record<string, T> {
  const asList = Object.entries(prev).map(([id, v]) => ({ id, v }));
  const wrapped = recs.filter((r) => r.collection === c).map((r) => ({ ...r, data: r.data == null ? null : { id: r.id, v: r.data } }));
  const merged = mergeList(c, asList, wrapped as RemoteRecord[], false);
  if (full) {
    const remote = new Set(wrapped.map((r) => r.id));
    for (const [id, v] of Object.entries(prev)) if (!remote.has(id) && !isPending(c, id)) queue(c, id, v);
  }
  if (merged === asList) return prev;
  return Object.fromEntries(merged.map((x) => [x.id, x.v]));
}
