import { formatEuro } from './money';
import { formatLong, addDays } from './dates';
import type { Company, Item, Quote } from './types';

export const VAT_RATES = [22, 10, 4, 0];

export function lineTotal(qty: number, unitPrice: number) {
  return Math.round(qty * unitPrice * 100) / 100;
}

export function quoteTotals(q: Pick<Quote, 'lines' | 'vatRate'>) {
  const imponibile = Math.round(q.lines.reduce((s, l) => s + lineTotal(l.qty, l.unitPrice), 0) * 100) / 100;
  const iva = Math.round(imponibile * q.vatRate) / 100;
  return { imponibile, iva, totale: Math.round((imponibile + iva) * 100) / 100 };
}

/** Prossimo numero libero per l'anno, es. "4/2026". */
export function nextQuoteNumber(items: Item[], year: number): string {
  let max = 0;
  for (const it of items) {
    const m = it.quote?.number.match(/^(\d+)\/(\d{4})$/);
    if (m && Number(m[2]) === year) max = Math.max(max, Number(m[1]));
  }
  return `${max + 1}/${year}`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function nl(s: string) {
  return esc(s).replace(/\n/g, '<br>');
}

/** HTML del documento, usato per creare il PDF. */
export function quoteHtml(item: Item, company: Company): string {
  const q = item.quote!;
  const t = quoteTotals(q);
  const date = item.date ?? item.createdAt.slice(0, 10);
  const rows = q.lines
    .map(
      (l) => `<tr><td>${nl(l.description)}</td><td class="n">${l.qty.toLocaleString('it-IT')}</td><td class="n">${formatEuro(l.unitPrice)}</td><td class="n">${formatEuro(lineTotal(l.qty, l.unitPrice))}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111827;font-size:12px;margin:36px}
  h1{font-size:22px;margin:0 0 4px}.muted{color:#6B7280}
  .top{display:flex;justify-content:space-between;gap:24px;margin-bottom:28px}
  .box{border:1px solid #E5E7EB;border-radius:8px;padding:12px;min-width:220px}
  .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:8px;border-bottom:1px solid #E5E7EB;text-align:left;vertical-align:top}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280}.n{text-align:right;white-space:nowrap}
  .tot{margin-left:auto;width:260px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .big{font-size:16px;font-weight:700;border-top:2px solid #111827;margin-top:4px;padding-top:8px}
  </style></head><body>
  <div class="top"><div><h1>${esc(company.name || 'La tua azienda')}</h1>
  <div class="muted">${nl(company.address)}${company.vat ? `<br>P.IVA ${esc(company.vat)}` : ''}${company.contact ? `<br>${esc(company.contact)}` : ''}</div></div>
  <div class="box"><div class="lbl">Preventivo</div><div style="font-size:16px;font-weight:700">N. ${esc(q.number)}</div>
  <div class="muted">del ${formatLong(date)}<br>valido fino al ${formatLong(addDays(date, q.validityDays))}</div></div></div>
  <div class="box" style="max-width:320px"><div class="lbl">Cliente</div><strong>${esc(q.client.name)}</strong><br><span class="muted">${nl(q.client.address)}${q.client.contact ? `<br>${esc(q.client.contact)}` : ''}</span></div>
  ${q.subject ? `<p style="margin-top:20px"><strong>Oggetto:</strong> ${esc(q.subject)}</p>` : ''}
  <table><thead><tr><th>Descrizione</th><th class="n">Q.tà</th><th class="n">Prezzo</th><th class="n">Importo</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><div><span>Imponibile</span><span>${formatEuro(t.imponibile)}</span></div><div><span>IVA ${q.vatRate}%</span><span>${formatEuro(t.iva)}</span></div>
  <div class="big"><span>Totale</span><span>${formatEuro(t.totale)}</span></div></div>
  ${q.notes ? `<div style="margin-top:28px"><div class="lbl">Note e condizioni</div>${nl(q.notes)}</div>` : ''}
  </body></html>`;
}
