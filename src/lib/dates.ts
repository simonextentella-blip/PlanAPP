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

/** Data corta per le righe della Home: "08:00" oggi, "dom 08:00" nei prossimi giorni, "mar 17", "17 dic". */
export function formatShort(iso: string, time?: string | null): string {
  const today = todayISO();
  if (iso === today) return time ?? 'oggi';
  const d = parseISODate(iso);
  const diff = Math.round((d.getTime() - parseISODate(today).getTime()) / 86400000);
  const day = DAYS[d.getDay()].slice(0, 3);
  if (diff > 0 && diff < 7 && time) return `${day} ${time}`;
  if (Math.abs(diff) < 28) return `${day} ${d.getDate()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "sabato 14 novembre" (senza anno) */
export function formatDayMonth(iso: string): string {
  const d = parseISODate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Data per le schede: "Oggi", "Domani", "Martedì 17" se vicina, "17 dicembre", oppure con l'anno se lontana. */
export function formatCardDate(iso: string): string {
  const rel = formatRelative(iso);
  if (rel === 'Oggi' || rel === 'Domani' || rel === 'Ieri') return rel;
  const today = parseISODate(todayISO());
  const d = parseISODate(iso);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (Math.abs(diff) < 28) return `${capitalize(DAYS[d.getDay()])} ${d.getDate()}`;
  if (d.getFullYear() === today.getFullYear()) return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return rel;
}

/** Data nel bottone del giorno: "Oggi", "Domani", altrimenti "Mer 18 nov" (con l'anno se diverso). */
export function formatPickerDate(iso: string): string {
  const rel = formatRelative(iso);
  if (rel === 'Oggi' || rel === 'Domani' || rel === 'Ieri') return rel;
  const d = parseISODate(iso);
  const s = `${capitalize(DAYS[d.getDay()].slice(0, 3))} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return d.getFullYear() === parseISODate(todayISO()).getFullYear() ? s : `${s} ${d.getFullYear()}`;
}
