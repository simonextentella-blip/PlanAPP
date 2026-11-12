import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center' },
  text: { color: colors.muted, fontSize: 15, textAlign: 'center' },
});
