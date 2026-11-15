import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brand } from '../lib/brand';
import { addPhotos, usePhotoUri, type PhotoSource } from '../lib/photos';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { chainPhotos, countPhotos, type Item } from '../lib/types';

const THUMB = 92;

function Thumb({ photo, onPress, onRemove }: { photo: string; onPress: () => void; onRemove?: () => void }) {
  const uri = usePhotoUri(photo);
  return (
    <View style={styles.thumbWrap}>
      <Pressable onPress={onPress} style={styles.thumb} accessibilityRole="imagebutton" accessibilityLabel="Apri foto">
        {uri ? <Image source={{ uri }} style={styles.thumbImg} /> : <ActivityIndicator color={brand.green} />}
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.remove} accessibilityRole="button" accessibilityLabel="Togli foto">
          <Ionicons name="close" size={14} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function FullPhoto({ photo, width, height }: { photo: string; width: number; height: number }) {
  const uri = usePhotoUri(photo);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={{ width, height }} resizeMode="contain" /> : <ActivityIndicator color="#fff" />}
    </View>
  );
}

/** Foto a schermo intero, con frecce per passare alla precedente/successiva. */
export function PhotoViewer({ photos, start, onClose }: { photos: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [shownFor, setShownFor] = useState<number | null>(null);
  if (start !== shownFor) {
    setShownFor(start);
    if (start != null) setIndex(start);
  }
  const i = Math.min(index, photos.length - 1);
  const many = photos.length > 1;
  return (
    <Modal visible={start != null} animationType="fade" onRequestClose={onClose} transparent>
      <SafeAreaView style={styles.viewer}>
        <View style={styles.viewerBar}>
          <Text style={styles.viewerCount}>{many ? `${i + 1} di ${photos.length}` : ''}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {start != null && photos[i] ? <FullPhoto photo={photos[i]} width={width} height={height - 160} /> : null}
          {many ? (
            <>
              <Pressable onPress={() => setIndex((i - 1 + photos.length) % photos.length)} style={[styles.arrow, { left: 10 }]} accessibilityRole="button" accessibilityLabel="Foto precedente">
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </Pressable>
              <Pressable onPress={() => setIndex((i + 1) % photos.length)} style={[styles.arrow, { right: 10 }]} accessibilityRole="button" accessibilityLabel="Foto successiva">
                <Ionicons name="chevron-forward" size={26} color="#fff" />
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** Riga di miniature; tocca per vedere a schermo intero. */
export function PhotoStrip({ photos, onRemove }: { photos: string[]; onRemove?: (photo: string) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {photos.map((p, i) => (
          <Thumb key={p} photo={p} onPress={() => setOpen(i)} onRemove={onRemove ? () => onRemove(p) : undefined} />
        ))}
      </ScrollView>
      <PhotoViewer photos={photos} start={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Sezione Foto modificabile (sopralluogo): Scatta / Galleria + miniature. */
export function PhotoEditor({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function add(source: PhotoSource) {
    setMsg('');
    setBusy(true);
    try {
      const added = await addPhotos(source);
      if (added.length) onChange([...photos, ...added]);
    } catch (e) {
      setMsg(e instanceof Error && e.message === 'permission' ? 'Serve il permesso per usare la fotocamera (Impostazioni del telefono).' : 'Non sono riuscito ad aggiungere la foto. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text style={styles.label}>Foto{photos.length ? ` (${photos.length})` : ''}</Text>
      {photos.length ? <PhotoStrip photos={photos} onRemove={(p) => onChange(photos.filter((x) => x !== p))} /> : null}
      <View style={styles.addRow}>
        <AddButton icon="camera-outline" label="Scatta foto" onPress={() => add('camera')} disabled={busy} />
        <AddButton icon="images-outline" label="Dalla galleria" onPress={() => add('library')} disabled={busy} />
      </View>
      {busy ? <Text style={styles.hint}>Salvo le foto…</Text> : null}
      {msg ? <Text style={styles.error}>{msg}</Text> : null}
      {!photos.length && !busy && !msg ? <Text style={styles.hint}>Le foto restano visibili nel preventivo e nel lavoro che nascono da questo sopralluogo.</Text> : null}
    </View>
  );
}

function AddButton({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.addBtn, (pressed || disabled) && { opacity: 0.6 }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={brand.green} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

/** Foto ereditate lungo il percorso (sola lettura), per preventivi e lavori. */
export function ChainPhotos({ item, label }: { item: Item; label?: boolean }) {
  const { getItem } = useStore();
  const groups = chainPhotos(item, getItem);
  if (!countPhotos(groups)) return null;
  return (
    <View style={{ gap: 12 }}>
      {groups.map((g) => (
        <View key={g.label}>
          {label !== false ? (
            <Text style={styles.label}>
              {g.label} ({g.photos.length})
            </Text>
          ) : null}
          <PhotoStrip photos={g.photos} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  strip: { gap: 8, paddingBottom: 2, paddingTop: 6, paddingRight: 6 },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: 12, overflow: 'hidden', backgroundColor: brand.light, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: brand.dark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  addText: { fontSize: 15, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 8 },
  error: { fontSize: 13, color: colors.danger, marginTop: 8 },
  viewer: { flex: 1, backgroundColor: '#0B0F0B' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  viewerCount: { color: '#fff', fontSize: 15, fontWeight: '600' },
  arrow: { position: 'absolute', top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
});
