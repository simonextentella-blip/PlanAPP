import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

/**
 * Versione web (PWA): le foto, ridotte a 1600 px in JPEG, stanno nel database del browser
 * (IndexedDB), perché il normale archivio dell'app è troppo piccolo per le immagini.
 * Nell'elemento salviamo il riferimento "idb:<id>".
 */
export type PhotoSource = 'camera' | 'library';

const MAX_SIDE = 1600;
const DB = 'planapp-photos';
const STORE = 'photos';
const PREFIX = 'idb:';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const cache = new Map<string, string>();

async function shrink(a: ImagePicker.ImagePickerAsset): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(a.uri);
    if (Math.max(a.width, a.height) > MAX_SIDE) {
      ctx.resize(a.width >= a.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
    }
    const img = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (img.base64) return `data:image/jpeg;base64,${img.base64}`;
    if (img.uri.startsWith('data:')) return img.uri;
  } catch {
    // ripiego qui sotto
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    if (a.file) r.readAsDataURL(a.file);
    else reject(new Error('file'));
  });
}

export async function addPhotos(source: PhotoSource): Promise<string[]> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true });
  if (res.canceled || !res.assets) return [];
  const out: string[] = [];
  for (const a of res.assets) {
    const data = await shrink(a);
    const id = newId();
    await tx('readwrite', (s) => s.put(data, id));
    cache.set(id, data);
    out.push(PREFIX + id);
  }
  return out;
}

export function deletePhotos(refs: string[]) {
  for (const r of refs) {
    if (!r.startsWith(PREFIX)) continue;
    const id = r.slice(PREFIX.length);
    cache.delete(id);
    tx('readwrite', (s) => s.delete(id)).catch(() => {});
  }
}

export function usePhotoUri(ref: string): string | null {
  const id = ref.startsWith(PREFIX) ? ref.slice(PREFIX.length) : null;
  const [uri, setUri] = useState<string | null>(id ? cache.get(id) ?? null : ref);
  useEffect(() => {
    if (!id) return setUri(ref);
    if (cache.has(id)) return setUri(cache.get(id)!);
    let alive = true;
    tx<string | undefined>('readonly', (s) => s.get(id))
      .then((v) => {
        if (v) cache.set(id, v);
        if (alive) setUri(v ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, ref]);
  return uri;
}
