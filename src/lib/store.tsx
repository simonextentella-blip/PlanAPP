import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadAccounts, saveAccounts, loadClients, saveClients, loadSuppliers, localRepository, loadProfileName, saveSuppliers, saveProfileName, type ItemRepository } from './repository';
import { formatEuro } from './money';
import { useAuth } from './auth';
import { deletePhotos, uploadLocalPhoto } from './photos';
import { isCloudRef } from './cloudPhotos';
import { flush, loadPending, mergeList, mergeMap, onPendingChange, pendingCount, pullAll, queueListDiff, queueMapDiff, subscribe, type RemoteRecord } from './sync';
import { blankSupplier, DEFAULT_COMPANY, personKey, type Account, type Client, type Company, type Item, type NewClient, type NewItem } from './types';

interface StoreValue {
  ready: boolean;
  items: Item[];
  userName: string;
  setUserName(name: string): void;
  /** Dati fornitore della persona che usa l'app adesso. */
  company: Company;
  setCompany(c: Company): void;
  /** Dati fornitore di una persona (es. chi ha creato un preventivo). */
  supplierFor(name: string): Company;
  addItem(data: NewItem): Item;
  updateItem(id: string, patch: Partial<NewItem>): void;
  removeItem(id: string): void;
  toggleDone(id: string): void;
  getItem(id: string): Item | undefined;
  clients: Client[];
  getClient(id: string | null | undefined): Client | undefined;
  addClient(data: NewClient): Client;
  updateClient(id: string, patch: Partial<NewClient>): void;
  removeClient(id: string): void;
  /** Conti lavori dentro Soldi. */
  accounts: Account[];
  getAccount(id: string | null | undefined): Account | undefined;
  addAccount(name: string): Account;
  updateAccount(id: string, name: string): void;
  /** Elimina il conto e tutti i suoi movimenti. */
  removeAccount(id: string): void;
  /** Stato del collegamento con Supabase. */
  sync: SyncState;
  /** Ricarica subito da Supabase e invia ciò che è in attesa. */
  syncNow(): void;
}

export interface SyncState {
  /** off = app non collegata o nessun accesso; offline = ultimo tentativo fallito. */
  status: 'off' | 'syncing' | 'ok' | 'offline';
  /** Modifiche fatte qui e non ancora inviate. */
  pending: number;
  lastSync: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Quando un sopralluogo viene segnato come fatto, crea un preventivo "da fare" collegato.
 * Se il sopralluogo torna da fare (o viene eliminato) e il preventivo non è ancora stato compilato, lo toglie.
 */
export function linkVisitsToQuotes(prev: Item[], next: Item[], author: string): Item[] {
  const before = new Map(prev.map((it) => [it.id, it]));
  const doneVisits = new Set(next.filter((it) => it.type === 'sopralluogo' && it.done).map((it) => it.id));
  let out = next.filter((it) => !(it.visitId && !it.quote && !it.done && !doneVisits.has(it.visitId)));
  const now = new Date().toISOString();
  for (const v of next) {
    if (v.type !== 'sopralluogo' || !v.done || before.get(v.id)?.done) continue;
    if (out.some((it) => it.visitId === v.id)) continue;
    out = [
      ...out,
      {
        id: newId(),
        type: 'preventivo',
        title: v.title,
        description: v.description,
        date: null,
        time: null,
        done: false,
        amount: null,
        direction: null,
        quote: null,
        visitId: v.id,
        clientId: v.clientId ?? null,
        createdBy: author,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  return linkJobsToMoney(prev, linkQuotesToJobs(prev, out, author), author);
}

/**
 * Quando un preventivo viene accettato, crea il lavoro collegato (senza data, quindi "da organizzare").
 * Se l'accettazione viene tolta e il lavoro non è ancora stato programmato né completato, lo toglie.
 */
export function linkQuotesToJobs(prev: Item[], next: Item[], author: string): Item[] {
  const before = new Map(prev.map((it) => [it.id, it]));
  const accepted = new Set(next.filter((it) => it.type === 'preventivo' && it.done).map((it) => it.id));
  let out = next
    .filter((it) => !(it.quoteId && !it.done && !it.date && !accepted.has(it.quoteId)))
    .map((it) => {
      if (!it.quoteId || it.amount != null) return it;
      const pv = next.find((x) => x.id === it.quoteId);
      return pv?.amount != null ? { ...it, amount: pv.amount } : it;
    });
  const now = new Date().toISOString();
  for (const pv of next) {
    if (pv.type !== 'preventivo' || !pv.done || before.get(pv.id)?.done) continue;
    if (out.some((it) => it.quoteId === pv.id)) continue;
    const q = pv.quote;
    const title = q ? `${q.client.name}${q.subject ? ` – ${q.subject}` : ''}` : pv.title;
    const details = [
      q ? `Preventivo N. ${q.number} accettato${pv.amount != null ? ` · ${formatEuro(pv.amount)}` : ''}` : 'Preventivo accettato',
      q?.client.site ? `Luogo: ${q.client.site}` : '',
      ...(q?.works ?? []).map((w) => `• ${w.title}${w.qty ? ` (${w.qty})` : ''}`),
    ].filter(Boolean);
    out = [
      ...out,
      {
        id: newId(),
        type: 'lavoro',
        title,
        description: details.join('\n'),
        date: null,
        time: null,
        done: false,
        direction: null,
        quote: null,
        quoteId: pv.id,
        clientId: pv.clientId ?? null,
        amount: pv.amount ?? null,
        createdBy: author,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  return out;
}

/**
 * Quando un lavoro viene segnato come fatto, crea l'entrata in Soldi con il suo importo.
 * Se la spunta viene tolta, l'entrata collegata viene eliminata.
 * Se il lavoro è "non ancora pagato", l'entrata resta in Soldi › Da prendere (fuori dal saldo) finché non viene pagato.
 */
export function linkJobsToMoney(prev: Item[], next: Item[], author: string): Item[] {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const before = new Map(prev.map((it) => [it.id, it]));
  // Importo del lavoro: il suo, oppure quello del preventivo da cui nasce.
  const jobAmount = (job: Item): number | null => {
    if (job.amount != null) return job.amount;
    const pv = job.quoteId ? next.find((it) => it.id === job.quoteId) : undefined;
    return pv?.amount ?? null;
  };
  const jobs = new Map(next.filter((it) => it.type === 'lavoro').map((it) => [it.id, it]));
  const doneJobs = new Set([...jobs.values()].filter((it) => it.done).map((it) => it.id));
  let out = next
    .filter((it) => !(it.jobId && !doneJobs.has(it.jobId)))
    // Entrate rimaste senza importo: lo completa appena il lavoro (o il suo preventivo) ce l'ha.
    .map((it) => {
      if (!it.jobId) return it;
      const job = jobs.get(it.jobId)!;
      let out = it;
      if (it.amount == null) {
        const a = jobAmount(job);
        if (a != null) out = { ...out, amount: a };
      }
      // Pagato / non ancora pagato segue il lavoro. Quando viene pagato, l'incasso prende la data di oggi.
      const unpaid = !!job.unpaid;
      if (!!it.unpaid !== unpaid) out = { ...out, unpaid, updatedAt: now, ...(unpaid ? {} : { date: today }) };
      return out;
    });
  for (const job of next) {
    if (job.type !== 'lavoro' || !job.done || before.get(job.id)?.done) continue;
    if (out.some((it) => it.jobId === job.id)) continue;
    const quote = job.quoteId ? next.find((it) => it.id === job.quoteId)?.quote : null;
    const d = new Date();
    const when = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    out = [
      ...out,
      {
        id: newId(),
        type: 'soldi',
        title: `Incasso lavoro: ${job.title}`,
        description: [`Da lavoro completato il ${when}`, quote ? `Preventivo N. ${quote.number}` : '']
          .filter(Boolean)
          .join(' · '),
        date: today,
        time: null,
        done: false,
        amount: jobAmount(job),
        direction: 'entrata',
        quote: null,
        jobId: job.id,
        unpaid: !!job.unpaid,
        clientId: job.clientId ?? null,
        createdBy: author,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  return out;
}

/** Ordina per data, poi orario (senza orario prima), poi data di creazione. */
export function compareItems(a: Item, b: Item): number {
  const da = a.date ?? '9999-99-99';
  const db = b.date ?? '9999-99-99';
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.time ?? '';
  const tb = b.time ?? '';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

export function StoreProvider({ children, repository = localRepository }: { children: React.ReactNode; repository?: ItemRepository }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [userName, setUserNameState] = useState('');
  const [suppliers, setSuppliers] = useState<Record<string, Company>>({ simone: DEFAULT_COMPANY });
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const userRef = useRef('');
  userRef.current = userName;
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const { session } = useAuth();
  const [sync, setSync] = useState<SyncState>({ status: 'off', pending: 0, lastSync: null });

  useEffect(() => {
    Promise.all([repository.loadAll(), loadProfileName(), loadSuppliers(), loadClients(), loadAccounts()])
      .then(([loaded, name, comp, cl, acc]) => {
        setClients(cl);
        // Movimenti di un conto che non esiste più nell'elenco: lo ricrea, così non si perdono.
        const known = new Set(acc.map((a) => a.id));
        const now = new Date().toISOString();
        const missing = [...new Set(loaded.filter((it) => it.account && !known.has(it.account)).map((it) => it.account as string))];
        if (missing.length) {
          acc = [...acc, ...missing.map((id) => ({ id, name: 'Conto lavori', createdBy: name || 'Io', createdAt: now, updatedAt: now }))];
          saveAccounts(acc).catch(() => {});
          queueListDiff('accounts', [], acc.filter((a) => missing.includes(a.id)));
        }
        setAccounts(acc);
        setSuppliers(comp);
        const linked = linkVisitsToQuotes(loaded, loaded, name || 'Io');
        if (linked !== loaded) queueListDiff('items', loaded, linked);
        setItems(linked);
        setUserNameState(name);
      })
      .catch(() => {
        // Archivio non disponibile: si parte vuoti invece di bloccare l'app.
      })
      .finally(() => setReady(true));
  }, [repository]);

  const commit = useCallback(
    (updater: (prev: Item[]) => Item[]) => {
      setItems((prev) => {
        const next = linkVisitsToQuotes(prev, updater(prev), userRef.current || 'Io');
        repository.saveAll(next).catch(() => {});
        queueListDiff('items', prev, next);
        return next;
      });
    },
    [repository],
  );

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    saveProfileName(name).catch(() => {});
  }, []);

  const supplierFor = useCallback(
    (name: string) => suppliers[personKey(name)] ?? (['simone', 'io', ''].includes(personKey(name)) ? suppliers.simone ?? DEFAULT_COMPANY : blankSupplier(name.trim())),
    [suppliers],
  );
  const company = useMemo(() => supplierFor(userName), [supplierFor, userName]);

  const setCompany = useCallback(
    (c: Company) => {
      setSuppliers((prev) => {
        const next = { ...prev, [personKey(userRef.current)]: c };
        saveSuppliers(next).catch(() => {});
        queueMapDiff('suppliers', prev, next);
        return next;
      });
    },
    [],
  );

  const addItem = useCallback(
    (data: NewItem) => {
      const now = new Date().toISOString();
      const item: Item = { ...data, id: newId(), createdBy: userName || 'Io', createdAt: now, updatedAt: now };
      commit((prev) => [...prev, item]);
      return item;
    },
    [commit, userName],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<NewItem>) => {
      const now = new Date().toISOString();
      commit((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: now } : it)));
    },
    [commit],
  );

  const removeItem = useCallback(
    (id: string) =>
      commit((prev) => {
        const gone = prev.find((it) => it.id === id);
        const rest = prev.filter((it) => it.id !== id);
        const photos = gone?.photos ?? [];
        if (!photos.length) return rest;
        // Le foto passano all'elemento che ne è nato (preventivo o lavoro), così non si perdono.
        // (solo se resta: un preventivo ancora vuoto o un lavoro non programmato vengono tolti insieme)
        const child = rest.find((it) => (it.visitId === id && (it.quote || it.done)) || (it.quoteId === id && (it.done || it.date)));
        if (!child) {
          deletePhotos(photos);
          return rest;
        }
        return rest.map((it) => (it.id === child.id ? { ...it, photos: [...photos, ...(it.photos ?? [])] } : it));
      }),
    [commit],
  );

  const toggleDone = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      commit((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done, updatedAt: now } : it)));
    },
    [commit],
  );

  const commitClients = useCallback((updater: (prev: Client[]) => Client[]) => {
    setClients((prev) => {
      const next = updater(prev);
      saveClients(next).catch(() => {});
      queueListDiff('clients', prev, next);
      return next;
    });
  }, []);

  const addClient = useCallback(
    (data: NewClient) => {
      const now = new Date().toISOString();
      const c: Client = { ...data, id: newId(), createdBy: userRef.current || 'Io', createdAt: now, updatedAt: now };
      commitClients((prev) => [...prev, c]);
      return c;
    },
    [commitClients],
  );
  const updateClient = useCallback(
    (id: string, patch: Partial<NewClient>) => {
      const now = new Date().toISOString();
      commitClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now } : c)));
    },
    [commitClients],
  );
  const removeClient = useCallback(
    (id: string) => {
      commitClients((prev) => prev.filter((c) => c.id !== id));
      commit((prev) => prev.map((it) => (it.clientId === id ? { ...it, clientId: null } : it)));
    },
    [commitClients, commit],
  );

  const commitAccounts = useCallback((updater: (prev: Account[]) => Account[]) => {
    setAccounts((prev) => {
      const next = updater(prev);
      saveAccounts(next).catch(() => {});
      queueListDiff('accounts', prev, next);
      return next;
    });
  }, []);
  const addAccount = useCallback(
    (name: string) => {
      const now = new Date().toISOString();
      const a: Account = { id: newId(), name, createdBy: userRef.current || 'Io', createdAt: now, updatedAt: now };
      commitAccounts((prev) => [...prev, a]);
      return a;
    },
    [commitAccounts],
  );
  const updateAccount = useCallback(
    (id: string, name: string) => {
      const now = new Date().toISOString();
      commitAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name, updatedAt: now } : a)));
    },
    [commitAccounts],
  );
  const removeAccount = useCallback(
    (id: string) => {
      commitAccounts((prev) => prev.filter((a) => a.id !== id));
      commit((prev) => prev.filter((it) => it.account !== id));
    },
    [commitAccounts, commit],
  );

  // ---- Supabase ----
  /** Applica righe arrivate da Supabase a tutti gli elenchi (e alla copia sul telefono). */
  const applyRemote = useCallback(
    (recs: RemoteRecord[], full: boolean) => {
      setItems((prev) => {
        const next = mergeList('items', prev, recs, full);
        if (next !== prev) repository.saveAll(next).catch(() => {});
        return next;
      });
      setClients((prev) => {
        const next = mergeList('clients', prev, recs, full);
        if (next !== prev) saveClients(next).catch(() => {});
        return next;
      });
      setAccounts((prev) => {
        const next = mergeList('accounts', prev, recs, full);
        if (next !== prev) saveAccounts(next).catch(() => {});
        return next;
      });
      setSuppliers((prev) => {
        const next = mergeMap('suppliers', prev, recs, full);
        if (next !== prev) saveSuppliers(next).catch(() => {});
        return next;
      });
    },
    [repository],
  );

  /** Foto rimaste solo sul telefono (fatte senza campo o prima del collegamento): le carica online. */
  const uploadingPhotos = useRef(false);
  const uploadPendingPhotos = useCallback(async () => {
    if (uploadingPhotos.current) return;
    uploadingPhotos.current = true;
    try {
      const todo = itemsRef.current.filter((it) => it.photos?.some((p) => !isCloudRef(p)));
      for (const it of todo) {
        const map: Record<string, string> = {};
        for (const p of it.photos ?? []) {
          if (isCloudRef(p)) continue;
          const ref = await uploadLocalPhoto(p);
          if (ref) map[p] = ref;
        }
        if (!Object.keys(map).length) continue;
        const now = new Date().toISOString();
        commit((prev) => prev.map((x) => (x.id === it.id && x.photos ? { ...x, photos: x.photos.map((p) => map[p] ?? p), updatedAt: now } : x)));
      }
    } finally {
      uploadingPhotos.current = false;
    }
  }, [commit]);

  const fullSync = useCallback(async () => {
    setSync((s) => ({ ...s, status: 'syncing' }));
    try {
      await loadPending();
      const recs = await pullAll();
      applyRemote(recs, true);
      // Lascia a React il tempo di applicare (e di mettere in coda ciò che c'è solo qui).
      await new Promise((r) => setTimeout(r, 50));
      const ok = await flush();
      await uploadPendingPhotos();
      setSync({ status: ok ? 'ok' : 'offline', pending: pendingCount(), lastSync: new Date().toISOString() });
    } catch {
      setSync((s) => ({ ...s, status: 'offline', pending: pendingCount() }));
    }
  }, [applyRemote, uploadPendingPhotos]);

  const loggedIn = !!session;
  useEffect(() => {
    if (!ready || !loggedIn) {
      setSync({ status: 'off', pending: pendingCount(), lastSync: null });
      return;
    }
    // Nome non ancora scritto: usa la prima parte dell'email (es. "simone").
    if (!userRef.current && session?.user.email) {
      const n = session.user.email.split('@')[0].split(/[._-]/)[0];
      if (n) {
        const name = n[0].toUpperCase() + n.slice(1);
        setUserNameState(name);
        saveProfileName(name).catch(() => {});
      }
    }
    fullSync();
    const unsub = subscribe((r) => applyRemote([r], false), () => fullSync());
    const offPending = onPendingChange(() => setSync((s) => ({ ...s, pending: pendingCount() })));
    const app = AppState.addEventListener('change', (st) => st === 'active' && fullSync());
    // Riprova a inviare ogni 30 secondi se è rimasto qualcosa in coda.
    const retry = setInterval(() => {
      if (pendingCount() > 0) flush().then((ok) => setSync((s) => ({ ...s, status: ok ? 'ok' : 'offline', pending: pendingCount() })));
    }, 30000);
    return () => {
      unsub();
      offPending();
      app.remove();
      clearInterval(retry);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loggedIn, fullSync, applyRemote]);

  const syncNow = useCallback(() => {
    if (loggedIn) fullSync();
  }, [loggedIn, fullSync]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      items: [...items].sort(compareItems),
      userName,
      setUserName,
      company,
      setCompany,
      supplierFor,
      addItem,
      updateItem,
      removeItem,
      toggleDone,
      getItem: (id) => items.find((it) => it.id === id),
      clients: [...clients].sort((a, b) => a.name.localeCompare(b.name, 'it')),
      getClient: (id) => (id ? clients.find((c) => c.id === id) : undefined),
      addClient,
      updateClient,
      removeClient,
      accounts: [...accounts].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
      getAccount: (id) => (id ? accounts.find((a) => a.id === id) : undefined),
      addAccount,
      updateAccount,
      removeAccount,
      sync,
      syncNow,
    }),
    [sync, syncNow, ready, items, userName, setUserName, company, setCompany, supplierFor, addItem, updateItem, removeItem, toggleDone, clients, addClient, updateClient, removeClient, accounts, addAccount, updateAccount, removeAccount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve essere usato dentro StoreProvider');
  return ctx;
}
