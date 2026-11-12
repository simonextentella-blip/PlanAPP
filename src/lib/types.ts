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
  /** Solo per Preventivi creati con il modulo completo. */
  quote?: Quote | null;
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

export interface QuoteTeamRow {
  id: string;
  count: string;
  role: string;
}

export interface QuoteWork {
  id: string;
  title: string;
  description: string;
  /** Numero oppure "a corpo". */
  qty: string;
}

export interface QuoteCondition {
  id: string;
  label: string;
  value: string;
}

export interface Quote {
  /** Es. "2026/001" */
  number: string;
  client: { name: string; address: string; cityLine: string; taxId: string; site: string };
  subject: string;
  team: QuoteTeamRow[];
  works: QuoteWork[];
  /** Importo a corpo (imponibile se c'è IVA). */
  total: number;
  /** 0 = regime forfettario, IVA non applicata. */
  vatRate: number;
  conditions: QuoteCondition[];
  /** Giorni di validità dell'offerta. */
  validityDays: number;
}

export interface Company {
  name: string;
  owner: string;
  tagline: string;
  legalName: string;
  address: string;
  cityLine: string;
  vat: string;
  cf: string;
  email: string;
  phone: string;
}

export const DEFAULT_COMPANY: Company = {
  name: 'Rope Access Workers',
  owner: 'di Simone Tentella',
  tagline: 'Lavori in quota su funi · Tree climbing · Potature',
  legalName: 'Rope Access Workers di Simone Tentella',
  address: 'Via Don Giovanni Vivenzi 12',
  cityLine: '00060 Canale Monterano (RM)',
  vat: '16031971001',
  cf: 'TNTSMN91T11H501R',
  email: 'siimonextentella@gmail.com',
  phone: '320 375 1083',
};

/** Tipi che non compaiono nel calendario. */
export const NOT_IN_CALENDAR: ItemType[] = ['preventivo'];
export const inCalendar = (it: { type: ItemType }) => !NOT_IN_CALENDAR.includes(it.type);
