import { addDays, parseISODate } from './dates';
import { LOGO_DATA_URI } from './logo';
import { formatEuro } from './money';
import type { Company, Item, Quote, QuoteCondition, QuoteTeamRow } from './types';

export const VAT_OPTIONS = [0, 22, 10];
export const MARKUP_OPTIONS = [0, 15, 40];
export const FORFETTARIO_NOTE =
  "Operazione in regime forfettario, senza applicazione dell'IVA ai sensi dell'art. 1, commi 54-89, della Legge n. 190/2014.";

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const DEFAULT_TEAM = (): QuoteTeamRow[] => [
  { id: uid(), count: '2', role: "operatori certificati per l'accesso e il posizionamento mediante funi" },
  { id: uid(), count: '1', role: 'operatore a terra (groundman)' },
];

export const DEFAULT_CONDITIONS = (): QuoteCondition[] => [
  { id: uid(), label: 'Materiali e attrezzatura', value: 'A nostro onere e carico.' },
  { id: uid(), label: 'A carico del cliente', value: "Accesso all'area di cantiere." },
  { id: uid(), label: 'Tempi', value: 'Data da concordare, subordinata alle condizioni meteorologiche.' },
  { id: uid(), label: 'Pagamento', value: "30% all'accettazione, saldo a fine lavori." },
];

export function quoteTotals(q: Pick<Quote, 'total' | 'vatRate' | 'markup'>) {
  // La maggiorazione si applica alla base e resta invisibile: nel documento c'è solo il risultato.
  const imponibile = Math.round(q.total * (1 + (q.markup ?? 0) / 100) * 100) / 100;
  const iva = Math.round(imponibile * q.vatRate) / 100;
  return { imponibile, iva, totale: Math.round((imponibile + iva) * 100) / 100 };
}

/** Prossimo numero libero per l'anno, es. "2026/004". */
export function nextQuoteNumber(items: Item[], year: number): string {
  let max = 0;
  for (const it of items) {
    const m = it.quote?.number?.match(/^(\d{4})\/(\d+)$/);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  return `${year}/${String(max + 1).padStart(3, '0')}`;
}

/** "12/11/2026" */
export function formatShort(iso: string) {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Rende leggibile anche un preventivo salvato con una versione precedente dell'app. */
export function normalizeQuote(q: Partial<Quote> & Record<string, unknown>): Quote {
  const client = (q.client ?? {}) as Partial<Quote['client']>;
  return {
    number: q.number ?? '',
    client: { name: client.name ?? '', address: client.address ?? '', cityLine: client.cityLine ?? '', taxId: client.taxId ?? '', site: client.site ?? '' },
    subject: q.subject ?? '',
    team: q.team ?? [],
    works: q.works ?? [],
    total: q.total ?? 0,
    vatRate: q.vatRate ?? 0,
    markup: q.markup ?? 0,
    conditions: q.conditions ?? [],
    validityDays: q.validityDays ?? 60,
  };
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function nl(s: string) {
  return esc(s).replace(/\n/g, '<br>');
}

function spaced(s: string) {
  return esc(s.toUpperCase());
}

/** HTML del documento (stesso impianto del modello RAW), usato per il PDF. */
export function quoteHtml(item: Item, company: Company): string {
  const q = normalizeQuote(item.quote as never);
  const t = quoteTotals(q);
  const date = item.date ?? item.createdAt.slice(0, 10);
  const forf = q.vatRate === 0;
  const clientLines = [q.client.address, q.client.cityLine, q.client.taxId].filter(Boolean).map(esc).join('<br>');
  const works = q.works
    .map(
      (w, i) => `<tr><td class="idx">${i + 1}</td><td><b>${esc(w.title)}</b>${w.description ? `<div class="wdesc">${nl(w.description)}</div>` : ''}</td><td class="qty">${esc(w.qty)}</td></tr>`,
    )
    .join('');
  const team = q.team.map((r) => `<li><b>${esc(r.count)}</b> ${esc(r.role)}</li>`).join('');
  const conds = q.conditions
    .filter((c) => c.label || c.value)
    .map((c) => `<tr><th>${esc(c.label)}</th><td>${nl(c.value)}</td></tr>`)
    .join('');
  let n = 0;
  const sec = (title: string) => `<h2><span>${String(++n).padStart(2, '0')}</span> ${spaced(title)}</h2>`;

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
@page{size:A4;margin:11mm 13mm 10mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Liberation Sans',Helvetica,Arial,sans-serif;color:#2b2f2b;font-size:9pt;margin:0;line-height:1.35}
.stripe{display:flex;height:5px;margin-bottom:18px}.stripe i{flex:1}
.stripe i:nth-child(1){background:#d7ded5}.stripe i:nth-child(2){background:#b5c2b0}.stripe i:nth-child(3){background:#9fb09a}.stripe i:nth-child(4){background:#85997f}.stripe i:nth-child(5){background:#6e8668}.stripe i:nth-child(6){background:#587356}
.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.brand{display:flex;gap:18px;align-items:center}.brand img{height:84px}
.bname{font-size:15pt;font-weight:700;letter-spacing:.14em;color:#2f3e2f}.bowner{color:#555}.btag{color:#5e7a5a;margin-top:6px;font-size:9pt}
.doc{text-align:right;color:#666}.doc .t{font-size:24pt;font-weight:700;letter-spacing:.12em;color:#2f3e2f;margin-bottom:4px}.doc b{color:#2b2f2b}
.parties{display:flex;gap:14px;margin-bottom:14px}.party{flex:1;background:#eef2ec;padding:12px 14px}
.lbl{font-size:7.5pt;font-weight:700;letter-spacing:.28em;color:#5e7a5a;margin-bottom:6px}
.ph{color:#9aa39a;font-style:italic}
.subject{border-left:4px solid #5e7a5a;padding:4px 12px;margin:4px 0 10px;display:flex;gap:16px;align-items:baseline}
.subject b{font-size:10.5pt;color:#2f3e2f}
h2{font-size:10pt;letter-spacing:.12em;color:#2f3e2f;border-bottom:1px solid #2f3e2f;padding-bottom:3px;margin:12px 0 6px}h2 span{color:#5e7a5a}
ul{margin:0;padding-left:16px}li{margin:2px 0}li::marker{color:#9fb09a}
table{width:100%;border-collapse:collapse}
.works th{background:#2f3e2f;color:#fff;font-size:7.5pt;letter-spacing:.14em;text-align:left;padding:6px 8px}
.works td{padding:5px 8px;border-bottom:1px solid #d9dfd6;vertical-align:top}.works tr{page-break-inside:avoid}
.idx{color:#5e7a5a;font-weight:700;width:34px;text-align:center}.qty{text-align:center;width:80px;white-space:nowrap}.wdesc{margin-top:3px;color:#444}
.total{background:#2f3e2f;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin-top:4px}
.total .k{font-weight:700;letter-spacing:.2em;font-size:10.5pt}.total .s{font-size:8pt;opacity:.8}.total .v{font-size:16pt;font-weight:700}
.sub{display:flex;justify-content:space-between;padding:3px 12px;color:#444}
.foot{font-style:italic;font-size:7.5pt;color:#666;margin-top:6px}
.conds th{text-align:left;width:34%;padding:5px 0;border-bottom:1px solid #d9dfd6;font-weight:700;vertical-align:top}.conds td{padding:5px 0;border-bottom:1px solid #d9dfd6}
.sign{display:flex;gap:48px;margin-top:24px;page-break-inside:avoid}.sign div{flex:1}.sign .line{border-bottom:1px solid #555;height:34px}.sign small{color:#666;font-size:7.5pt}
.stripe.bottom{margin:18px 0 0}
@media screen{html{background:#fff}body{width:794px;padding:40px 49px 36px}}
</style></head><body>
<div class="stripe"><i></i><i></i><i></i><i></i><i></i><i></i></div>
<div class="head"><div class="brand"><img src="${LOGO_DATA_URI}" alt=""><div><div class="bname">${spaced(company.name)}</div><div class="bowner">${esc(company.owner)}</div><div class="btag">${esc(company.tagline)}</div></div></div>
<div class="doc"><div class="t">PREVENTIVO</div>N. <b>${esc(q.number)}</b><br>Data <b>${formatShort(date)}</b><br>Valido fino al <b>${formatShort(addDays(date, q.validityDays))}</b></div></div>
<div class="parties"><div class="party"><div class="lbl">FORNITORE</div><b>${esc(company.legalName)}</b><br>${esc(company.address)}<br>${esc(company.cityLine)}<br>P.IVA ${esc(company.vat)}${company.cf ? ` &nbsp;·&nbsp; C.F. ${esc(company.cf)}` : ''}<br>${[company.email, company.phone].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ')}</div>
<div class="party"><div class="lbl">CLIENTE</div><b>${esc(q.client.name)}</b>${clientLines ? `<br>${clientLines}` : ''}${q.client.site ? `<br><span style="color:#666">Luogo intervento:</span> ${esc(q.client.site)}` : ''}</div></div>
${q.subject ? `<div class="subject"><span class="lbl" style="margin:0">OGGETTO</span><b>${esc(q.subject)}</b></div>` : ''}
${team ? `${sec('Squadra impiegata')}<ul>${team}</ul>` : ''}
${works ? `${sec('Lavorazioni')}<table class="works"><thead><tr><th style="text-align:center">N.</th><th>DESCRIZIONE</th><th style="text-align:center">Q.TÀ</th></tr></thead><tbody>${works}</tbody></table>` : ''}
${sec('Riepilogo economico')}
${forf ? '' : `<div class="sub"><span>Imponibile</span><span>${formatEuro(t.imponibile)}</span></div><div class="sub"><span>IVA ${q.vatRate}%</span><span>${formatEuro(t.iva)}</span></div>`}
<div class="total"><div><div class="k">TOTALE A CORPO</div><div class="s">${forf ? 'IVA non applicata*' : `IVA ${q.vatRate}% inclusa`}</div></div><div class="v">${formatEuro(t.totale)}</div></div>
${forf ? `<div class="foot">* ${esc(FORFETTARIO_NOTE)}</div>` : ''}
${conds ? `${sec('Condizioni')}<table class="conds">${conds}</table>` : ''}
<div class="sign"><div><div class="lbl">PER ${spaced(company.name)}</div><div class="line"></div><small>Luogo, data e firma</small></div><div><div class="lbl">PER ACCETTAZIONE — IL CLIENTE</div><div class="line"></div><small>Luogo, data e firma</small></div></div>
<div class="stripe bottom"><i></i><i></i><i></i><i></i><i></i><i></i></div>
</body></html>`;
}
