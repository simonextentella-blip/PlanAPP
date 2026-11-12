import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadCompany, localRepository, loadProfileName, saveCompany, saveProfileName, type ItemRepository } from './repository';
import { formatEuro } from './money';
import { DEFAULT_COMPANY, type Company, type Item, type NewItem } from './types';

interface StoreValue {
  ready: boolean;
  items: Item[];
  userName: string;
  setUserName(name: string): void;
  company: Company;
  setCompany(c: Company): void;
  addItem(data: NewItem): Item;
  updateItem(id: string, patch: Partial<NewItem>): void;
  removeItem(id: string): void;
  toggleDone(id: string): void;
  getItem(id: string): Item | undefined;
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
  let out = next.filter((it) => !(it.quoteId && !it.done && !it.date && !accepted.has(it.quoteId)));
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
 */
export function linkJobsToMoney(prev: Item[], next: Item[], author: string): Item[] {
  const before = new Map(prev.map((it) => [it.id, it]));
  const doneJobs = new Set(next.filter((it) => it.type === 'lavoro' && it.done).map((it) => it.id));
  let out = next.filter((it) => !(it.jobId && !doneJobs.has(it.jobId)));
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
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
        amount: job.amount ?? null,
        direction: 'entrata',
        quote: null,
        jobId: job.id,
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
  const [company, setCompanyState] = useState<Company>(DEFAULT_COMPANY);
  const userRef = useRef('');
  userRef.current = userName;

  useEffect(() => {
    Promise.all([repository.loadAll(), loadProfileName(), loadCompany()])
      .then(([loaded, name, comp]) => {
        setCompanyState(comp);
        setItems(loaded);
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
        return next;
      });
    },
    [repository],
  );

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    saveProfileName(name).catch(() => {});
  }, []);

  const setCompany = useCallback((c: Company) => {
    setCompanyState(c);
    saveCompany(c).catch(() => {});
  }, []);

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

  const removeItem = useCallback((id: string) => commit((prev) => prev.filter((it) => it.id !== id)), [commit]);

  const toggleDone = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      commit((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done, updatedAt: now } : it)));
    },
    [commit],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      items: [...items].sort(compareItems),
      userName,
      setUserName,
      company,
      setCompany,
      addItem,
      updateItem,
      removeItem,
      toggleDone,
      getItem: (id) => items.find((it) => it.id === id),
    }),
    [ready, items, userName, setUserName, company, setCompany, addItem, updateItem, removeItem, toggleDone],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve essere usato dentro StoreProvider');
  return ctx;
}
