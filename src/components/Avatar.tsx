import { StyleSheet, Text, View } from 'react-native';

const PALETTE = ['#0EA5E9', '#F43F5E', '#14B8A6', '#F59E0B', '#8B5CF6', '#64748B', '#10B981', '#EC4899'];

/** Colore stabile per ogni nome: la stessa persona ha sempre lo stesso colore. */
export function colorForName(name: string): string {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialOf(name: string): string {
  const n = name.trim();
  return n ? n.charAt(0).toUpperCase() : '?';
}

/** Bollino tondo con l'iniziale di chi ha creato l'elemento. */
export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorForName(name) }]}
      accessibilityLabel={`Creato da ${name}`}
    >
      <Text style={[styles.text, { fontSize: size * 0.46 }]}>{initialOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
