import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../lib/theme';

export function Chip({ label, active, color = colors.primary, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? color : colors.border, backgroundColor: active ? color : colors.card }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, marginRight: 8 },
  text: { fontSize: 14, fontWeight: '500' },
});
