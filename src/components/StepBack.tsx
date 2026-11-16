import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { backSteps, type BackStep } from '../lib/steps';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import type { Item } from '../lib/types';

/** Riquadro "Torna indietro": un tasto per ogni passo precedente possibile. */
export function StepBack({ item }: { item: Item }) {
  const { items, stepBack } = useStore();
  const [armed, setArmed] = useState<BackStep['key'] | null>(null);
  const steps = backSteps(item, items);
  if (!steps.length) return null;

  function press(s: BackStep) {
    // I passi che tolgono qualcosa chiedono un secondo tocco, come Elimina.
    if (s.confirm && armed !== s.key) return setArmed(s.key);
    stepBack(item.id, s.key);
    router.back();
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Torna indietro</Text>
      {steps.map((s) => {
        const on = armed === s.key;
        return (
          <View key={s.key} style={styles.step}>
            <Pressable
              onPress={() => press(s)}
              style={({ pressed }) => [styles.btn, on && styles.btnArmed, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={s.label}
            >
              <Ionicons name="arrow-undo-outline" size={18} color={on ? '#fff' : colors.text} />
              <Text style={[styles.btnText, on && { color: '#fff' }]}>{on ? 'Tocca di nuovo per confermare' : s.label}</Text>
            </Pressable>
            <Text style={styles.hint}>{s.hint}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 12 },
  title: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  step: { gap: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, backgroundColor: colors.bg },
  btnArmed: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
});
