import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Foto dei sopralluoghi. Sul telefono ogni foto viene ridotta (lato lungo 1600 px, JPEG)
 * e copiata nella cartella documenti dell'app, così resta anche se il telefono svuota la cache.
 * Nell'elemento salviamo solo il riferimento (qui: l'indirizzo del file).
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
    out.push(dest.uri);
  }
  return out;
}

/** Cancella dal telefono le foto non più usate. */
export function deletePhotos(refs: string[]) {
  for (const r of refs) {
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
  return ref;
}
