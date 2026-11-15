import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../lib/theme';

/** Pulsante tondo "+" in basso a destra; con `extended` mostra anche la scritta, con `square` è un quadrato piccolo. */
export function Fab({ onPress, label, extended = false, square = false }: { onPress: () => void; label: string; extended?: boolean; square?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, extended && styles.extended, square && styles.square, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="add" size={extended ? 24 : square ? 28 : 30} color="#fff" />
      {extended ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    minWidth: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  extended: { paddingLeft: 18, paddingRight: 22 },
  square: { minWidth: 52, width: 52, height: 52, borderRadius: 16 },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
