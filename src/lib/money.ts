import type { Item } from './types';

/** 1234.5 -> "€ 1.234,50" */
export function formatEuro(n: number): string {
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '−' : ''}€ ${withDots},${dec}`;
}

/** Accetta "1.234,50", "1234.5", "1234,5". Restituisce null se non è un numero. */
export function parseEuro(s: string): number | null {
  let t = s.replace(/[€\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/** Importo con segno per Soldi (uscite negative). */
export function signedAmount(it: Item): number {
  const a = it.amount ?? 0;
  return it.type === 'soldi' && it.direction === 'uscita' ? -a : a;
}

export function amountLabel(it: Item): string | null {
  if (it.amount == null) return null;
  if (it.type === 'soldi') return `${it.direction === 'uscita' ? '−' : '+'} ${formatEuro(it.amount)}`;
  return formatEuro(it.amount);
}

export function totals(items: Item[]) {
  let entrate = 0;
  let uscite = 0;
  for (const it of items) {
    if (it.type !== 'soldi' || it.amount == null) continue;
    if (it.direction === 'uscita') uscite += it.amount;
    else entrate += it.amount;
  }
  return { entrate, uscite, saldo: entrate - uscite };
}
