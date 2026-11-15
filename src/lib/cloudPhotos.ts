import { useEffect, useState } from 'react';
import { BUCKET, supabase } from './supabase';

/**
 * Foto su Supabase Storage (cartella privata "planapp-photos").
 * Nell'elemento salviamo il riferimento "sb:<percorso>"; per mostrarla chiediamo un indirizzo
 * temporaneo firmato, valido una settimana, che teniamo in memoria.
 */
export const CLOUD_PREFIX = 'sb:';
export const isCloudRef = (ref: string) => ref.startsWith(CLOUD_PREFIX);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const WEEK = 7 * 24 * 3600;

/** true se l'app è collegata e c'è un accesso attivo. */
export async function cloudReady(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Carica una foto JPEG e restituisce il suo riferimento. Lancia un errore se non riesce. */
export async function uploadPhoto(body: ArrayBuffer | Blob, localUri?: string): Promise<string> {
  if (!supabase) throw new Error('offline');
  const path = `${new Date().getFullYear()}/${newId()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const ref = CLOUD_PREFIX + path;
  if (localUri) local.set(ref, localUri);
  return ref;
}

export function removeCloudPhotos(refs: string[]) {
  const paths = refs.filter(isCloudRef).map((r) => r.slice(CLOUD_PREFIX.length));
  if (!supabase || !paths.length) return;
  for (const r of refs) {
    local.delete(r);
    signed.delete(r);
  }
  supabase.storage.from(BUCKET).remove(paths).then(() => {}, () => {});
}

/** Copia sul telefono appena caricata: si vede subito, senza aspettare la rete. */
const local = new Map<string, string>();
const signed = new Map<string, { url: string; exp: number }>();

function cached(ref: string): string | null {
  if (local.has(ref)) return local.get(ref)!;
  const s = signed.get(ref);
  return s && s.exp > Date.now() ? s.url : null;
}

async function resolve(ref: string): Promise<string | null> {
  const c = cached(ref);
  if (c || !supabase) return c;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ref.slice(CLOUD_PREFIX.length), WEEK);
  if (error || !data) return null;
  signed.set(ref, { url: data.signedUrl, exp: Date.now() + (WEEK - 3600) * 1000 });
  return data.signedUrl;
}

/**
 * Indirizzo da mostrare per una foto: le foto su Supabase vengono risolte qui,
 * le altre con la funzione della piattaforma (file del telefono o database del browser).
 */
export function useResolvedPhoto(ref: string, resolveLocal: (ref: string) => { now: string | null; later?: Promise<string | null> }): string | null {
  const cloud = isCloudRef(ref);
  const first = cloud ? { now: cached(ref) } : resolveLocal(ref);
  const [uri, setUri] = useState<string | null>(first.now);
  useEffect(() => {
    let alive = true;
    const res = cloud ? { now: cached(ref), later: cached(ref) ? undefined : resolve(ref) } : resolveLocal(ref);
    setUri(res.now);
    res.later?.then((u) => alive && setUri(u)).catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  return uri;
}
