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
  /** Preventivo nato da un sopralluogo fatto: id del sopralluogo. */
  visitId?: string | null;
  /** Lavoro nato da un preventivo accettato: id del preventivo. */
  quoteId?: string | null;
  /** Entrata in Soldi nata da un lavoro completato: id del lavoro. */
  jobId?: string | null;
  /** Cliente collegato (anagrafica Clienti). */
  clientId?: string | null;
  /** Foto (riferimenti restituiti da lib/photos), aggiunte nei sopralluoghi. */
  photos?: string[] | null;
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
export const WITH_AMOUNT: ItemType[] = ['lavoro', 'soldi', 'preventivo'];

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
  /** Maggiorazione interna in % (es. 15 o 40): aumenta il totale ma non compare nel documento. */
  markup?: number;
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

/** Chiave con cui si salvano i dati fornitore di una persona (nome senza maiuscole/spazi). */
export const personKey = (name: string) => name.trim().toLowerCase();

/** Dati fornitore di partenza per una persona nuova: stesso marchio, dati personali da compilare. */
export function blankSupplier(name: string): Company {
  return {
    ...DEFAULT_COMPANY,
    owner: name ? `di ${name}` : '',
    legalName: name ? `${DEFAULT_COMPANY.name} di ${name}` : '',
    address: '',
    cityLine: '',
    vat: '',
    cf: '',
    email: '',
    phone: '',
  };
}

export interface Client {
  id: string;
  name: string;
  address: string;
  /** CAP Città (Prov.) */
  cityLine: string;
  /** C.F. / P.IVA */
  taxId: string;
  phone: string;
  email: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NewClient = Omit<Client, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export const EMPTY_CLIENT: NewClient = { name: '', address: '', cityLine: '', taxId: '', phone: '', email: '', notes: '' };

/** Tipi a cui si può collegare un cliente. */
export const WITH_CLIENT: ItemType[] = ['appuntamento', 'sopralluogo', 'lavoro', 'preventivo', 'soldi'];

/** Gruppo di foto da mostrare per un elemento: le sue e quelle ereditate lungo il percorso. */
export interface PhotoGroup {
  label: string;
  photos: string[];
}

/**
 * Foto di un elemento e di quelli da cui nasce:
 * lavoro ← preventivo ← sopralluogo. Così le foto del sopralluogo si vedono fino al lavoro fatto.
 */
export function chainPhotos(item: Item, getItem: (id: string) => Item | undefined): PhotoGroup[] {
  const groups: PhotoGroup[] = [];
  const seen = new Set<string>();
  let cur: Item | undefined = item;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.photos?.length) {
      const label = cur.id === item.id ? 'Foto' : `Foto ${cur.type === 'sopralluogo' ? 'del sopralluogo' : cur.type === 'preventivo' ? 'del preventivo' : `di ${TYPE_INFO[cur.type].label.toLowerCase()}`}`;
      groups.push({ label, photos: cur.photos });
    }
    const parent: string | null | undefined = cur.quoteId ?? cur.visitId;
    cur = parent ? getItem(parent) : undefined;
  }
  return groups;
}

export const countPhotos = (groups: PhotoGroup[]) => groups.reduce((n, g) => n + g.photos.length, 0);
