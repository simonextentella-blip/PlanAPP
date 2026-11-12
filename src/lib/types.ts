export type ItemType = 'appuntamento' | 'lavoro' | 'todo' | 'nota' | 'sopralluogo' | 'soldi' | 'preventivo';

export type Direction = 'entrata' | 'uscita';

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
  /** Importo in euro (Soldi e Preventivi). */
  amount?: number | null;
  /** Solo per Soldi: entrata o uscita. */
  direction?: Direction | null;
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
  sopralluogo: { label: 'Sopralluogo', plural: 'Sopralluoghi', color: '#0891B2', icon: 'location-outline' },
  soldi: { label: 'Soldi', plural: 'Soldi', color: '#0F766E', icon: 'cash-outline' },
  preventivo: { label: 'Preventivo', plural: 'Preventivi', color: '#CA8A04', icon: 'receipt-outline' },
};

export const ITEM_TYPES: ItemType[] = ['appuntamento', 'sopralluogo', 'lavoro', 'todo', 'nota', 'soldi', 'preventivo'];

/** Tipi che si possono segnare come completati. */
export const CHECKABLE: ItemType[] = ['sopralluogo', 'lavoro', 'todo', 'preventivo'];

/** Tipi con un importo in euro. */
export const WITH_AMOUNT: ItemType[] = ['soldi', 'preventivo'];

/** Come si chiama lo stato "fatto" per ogni tipo. */
export function doneLabel(type: ItemType): string {
  if (type === 'preventivo') return 'Accettato';
  if (type === 'sopralluogo') return 'Fatto';
  return 'Completato';
}
