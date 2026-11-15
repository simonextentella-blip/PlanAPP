import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { cloudReady, isCloudRef, removeCloudPhotos, uploadPhoto, useResolvedPhoto } from './cloudPhotos';

/**
 * Foto dei sopralluoghi. Sul telefono ogni foto viene ridotta (lato lungo 1600 px, JPEG)
 * e copiata nella cartella documenti dell'app, così resta anche se il telefono svuota la cache.
 * Se l'app è collegata a Supabase la foto viene anche caricata online e il riferimento diventa "sb:…";
 * senza campo resta l'indirizzo del file, e verrà caricata più tardi (uploadLocalPhoto).
 */
export type PhotoSource = 'camera' | 'library';

const MAX_SIDE = 1600;

function photoDir() {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Apre fotocamera o galleria e restituisce i riferimenti delle foto salvate (vuoto se annullato). */
export async function addPhotos(source: PhotoSource): Promise<string[]> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('permission');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 20 });
  if (res.canceled) return [];
  const dir = photoDir();
  const out: string[] = [];
  for (const a of res.assets) {
    const big = Math.max(a.width, a.height) > MAX_SIDE;
    const ctx = ImageManipulator.manipulate(a.uri);
    if (big) ctx.resize(a.width >= a.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
    const img = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    const dest = new File(dir, `${newId()}.jpg`);
    await new File(img.uri).copy(dest);
    out.push(await tryUpload(dest.uri));
  }
  return out;
}

async function tryUpload(uri: string): Promise<string> {
  try {
    if (!(await cloudReady())) return uri;
    return await uploadPhoto(await new File(uri).arrayBuffer(), uri);
  } catch {
    return uri;
  }
}

/** Carica online una foto rimasta solo sul telefono. Restituisce il nuovo riferimento, o null. */
export async function uploadLocalPhoto(ref: string): Promise<string | null> {
  if (isCloudRef(ref)) return null;
  try {
    const f = new File(ref);
    if (!f.exists) return null;
    return await uploadPhoto(await f.arrayBuffer(), ref);
  } catch {
    return null;
  }
}

/** Cancella dal telefono le foto non più usate. */
export function deletePhotos(refs: string[]) {
  removeCloudPhotos(refs);
  for (const r of refs) {
    if (isCloudRef(r)) continue;
    try {
      const f = new File(r);
      if (f.exists) f.delete();
    } catch {
      // già cancellata
    }
  }
}

/** Indirizzo da mostrare in <Image> per un riferimento. */
export function usePhotoUri(ref: string): string | null {
  return useResolvedPhoto(ref, (r) => ({ now: r }));
}
