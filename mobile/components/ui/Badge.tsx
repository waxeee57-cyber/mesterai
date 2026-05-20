import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'accent';

interface Props {
  label: string;
  variant?: Variant;
}

const variantColors: Record<Variant, { bg: string; text: string }> = {
  default: { bg: Colors.surface2, text: Colors.textSecondary },
  success: { bg: '#22C55E20', text: Colors.success },
  warning: { bg: '#EAB30820', text: Colors.warning },
  error: { bg: '#EF444420', text: Colors.error },
  accent: { bg: Colors.accentMuted, text: Colors.accent },
};

export const Badge: React.FC<Props> = ({ label, variant = 'default' }) => {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 12, fontWeight: '600' },
});
