import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadCompany, localRepository, loadProfileName, saveCompany, saveProfileName, type ItemRepository } from './repository';
import { EMPTY_COMPANY, type Company, type Item, type NewItem } from './types';

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
  const [company, setCompanyState] = useState<Company>(EMPTY_COMPANY);

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
        const next = updater(prev);
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
