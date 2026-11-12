const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

export const MONTH_NAMES = MONTHS.map(capitalize);
export const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
export const DAY_NAMES = DAYS.map(capitalize);
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "giovedì 12 novembre 2026" */
export function formatLong(iso: string): string {
  const d = parseISODate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Oggi", "Domani", "Ieri" oppure la data estesa. */
export function formatRelative(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Oggi';
  const d = parseISODate(today);
  d.setDate(d.getDate() + 1);
  if (iso === toISODate(d)) return 'Domani';
  d.setDate(d.getDate() - 2);
  if (iso === toISODate(d)) return 'Ieri';
  return capitalize(formatLong(iso));
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isValidTime(s: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s);
}

export function normalizeTime(s: string): string {
  const [h, m] = s.split(':');
  return `${pad(Number(h))}:${m}`;
}
