import type { Item } from './types';

/**
 * "Torna indietro": per ogni elemento, i passi precedenti a cui si può tornare.
 * Percorso: sopralluogo → preventivo → lavoro da fare → lavoro fatto (da prendere) → pagato.
 */
export interface BackStep {
  key: 'unpay' | 'undo' | 'toQuote' | 'toVisit';
  label: string;
  /** Spiega cosa succede, in parole semplici. */
  hint: string;
  /** Se il passo elimina qualcosa, chiede un secondo tocco di conferma. */
  confirm?: boolean;
}

const find = (items: Item[], id: string | null | undefined) => (id ? items.find((it) => it.id === id) : undefined);

export function backSteps(item: Item, items: Item[]): BackStep[] {
  const steps: BackStep[] = [];
  if (item.type === 'soldi' && item.jobId) {
    const job = find(items, item.jobId);
    if (!job) return steps;
    if (!item.unpaid) steps.push({ key: 'unpay', label: 'Rimetti da prendere', hint: 'Torna in Soldi › Da prendere, come non ancora pagato.' });
    steps.push({ key: 'undo', label: 'Rimetti il lavoro da fare', hint: `Il lavoro "${job.title}" torna da fare e questo incasso sparisce.` });
    return steps;
  }
  if (item.type === 'lavoro') {
    if (item.done) {
      if (!item.unpaid) steps.push({ key: 'unpay', label: 'Rimetti da prendere', hint: "L'incasso torna in Soldi › Da prendere, come non ancora pagato." });
      steps.push({ key: 'undo', label: 'Rimetti da fare', hint: "Il lavoro torna da fare e l'incasso in Soldi sparisce." });
      return steps;
    }
    if (find(items, item.quoteId)) {
      steps.push({ key: 'toQuote', label: 'Rimetti come preventivo', hint: 'Il lavoro viene tolto e il preventivo torna In attesa.', confirm: true });
    }
    return steps;
  }
  if (item.type === 'preventivo') {
    if (item.done) {
      const job = items.find((it) => it.quoteId === item.id);
      if (job?.done) return steps; // prima va rimesso da fare il lavoro
      steps.push({ key: 'undo', label: 'Rimetti in attesa', hint: job ? 'Il preventivo torna In attesa e il lavoro creato da lui viene tolto.' : 'Il preventivo torna In attesa.', confirm: !!job });
      return steps;
    }
    if (find(items, item.visitId)) {
      steps.push({
        key: 'toVisit',
        label: 'Rimetti il sopralluogo da fare',
        hint: item.quote ? 'Il preventivo compilato viene eliminato e il sopralluogo torna da fare.' : 'Il preventivo viene tolto e il sopralluogo torna da fare.',
        confirm: true,
      });
    }
    return steps;
  }
  if (item.type === 'sopralluogo' && item.done) {
    const pv = items.find((it) => it.visitId === item.id);
    if (pv?.done) return steps; // prima va rimesso in attesa il preventivo
    steps.push({ key: 'undo', label: 'Rimetti da fare', hint: pv ? 'Il sopralluogo torna da fare e il preventivo creato da lui viene tolto.' : 'Il sopralluogo torna da fare.', confirm: !!pv });
    return steps;
  }
  if (item.type === 'todo' && item.done) steps.push({ key: 'undo', label: 'Rimetti da fare', hint: 'Torna tra le cose da fare.' });
  return steps;
}

/** Applica un passo indietro e restituisce il nuovo elenco (i collegamenti si sistemano poi in store). */
export function applyBackStep(items: Item[], id: string, key: BackStep['key']): Item[] {
  const item = find(items, id);
  if (!item) return items;
  const now = new Date().toISOString();
  const patch = (target: string, p: Partial<Item>) => (list: Item[]) => list.map((it) => (it.id === target ? { ...it, ...p, updatedAt: now } : it));
  /** Toglie un elemento; le sue foto (se ne ha) tornano a quello da cui era nato. */
  const drop = (gone: Item | undefined, parentId: string | null | undefined) => (list: Item[]) => {
    if (!gone) return list;
    const rest = list.filter((it) => it.id !== gone.id);
    if (!gone.photos?.length || !parentId) return rest;
    return rest.map((it) => (it.id === parentId ? { ...it, photos: [...(it.photos ?? []), ...gone.photos!.filter((p) => !(it.photos ?? []).includes(p))], updatedAt: now } : it));
  };

  // Un incasso da lavoro segue sempre il suo lavoro.
  const job = item.type === 'soldi' && item.jobId ? find(items, item.jobId) : item.type === 'lavoro' ? item : undefined;

  if (key === 'unpay' && job) return patch(job.id, { unpaid: true })(items);
  if (key === 'undo' && job) return patch(job.id, { done: false, unpaid: false })(items);

  if (key === 'toQuote' && item.type === 'lavoro' && item.quoteId) {
    return drop(item, item.quoteId)(patch(item.quoteId, { done: false })(items));
  }
  if (key === 'undo' && item.type === 'preventivo') {
    const child = items.find((it) => it.quoteId === item.id && !it.done);
    return drop(child, item.id)(patch(item.id, { done: false })(items));
  }
  if (key === 'toVisit' && item.type === 'preventivo' && item.visitId) {
    return drop(item, item.visitId)(patch(item.visitId, { done: false })(items));
  }
  if (key === 'undo' && item.type === 'sopralluogo') {
    const child = items.find((it) => it.visitId === item.id && !it.done);
    return drop(child, item.id)(patch(item.id, { done: false })(items));
  }
  if (key === 'undo') return patch(item.id, { done: false })(items);
  return items;
}
