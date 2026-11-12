export type ItemType = 'appuntamento' | 'lavoro' | 'todo' | 'nota';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  /** Giorno nel formato YYYY-MM-DD; null per le note generali senza data. */
  date: string | null;
  /** Orario nel formato HH:MM, opzionale. */
  time: string | null;
  done: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NewItem = Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

export const TYPE_INFO: Record<ItemType, { label: string; plural: string; color: string; icon: string }> = {
  appuntamento: { label: 'Appuntamento', plural: 'Appuntamenti', color: '#2563EB', icon: 'people-outline' },
  lavoro: { label: 'Lavoro', plural: 'Lavori', color: '#EA580C', icon: 'construct-outline' },
  todo: { label: 'Da fare', plural: 'Da fare', color: '#16A34A', icon: 'checkbox-outline' },
  nota: { label: 'Nota', plural: 'Note', color: '#9333EA', icon: 'document-text-outline' },
};

export const ITEM_TYPES: ItemType[] = ['appuntamento', 'lavoro', 'todo', 'nota'];

/** Tipi che si possono segnare come completati. */
export const CHECKABLE: ItemType[] = ['lavoro', 'todo'];
