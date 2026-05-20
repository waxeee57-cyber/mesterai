import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<Props> = ({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.accent} size="small" />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, flexDirection: 'row' },
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  disabled: { opacity: 0.5 },
  size_sm: { height: 40, paddingHorizontal: 16 },
  size_md: { height: 52, paddingHorizontal: 24 },
  size_lg: { height: 60, paddingHorizontal: 32 },
  text: { fontWeight: '600' },
  text_primary: { color: '#fff' },
  text_secondary: { color: Colors.text },
  text_ghost: { color: Colors.accent },
  text_danger: { color: '#fff' },
  textSize_sm: { fontSize: 14 },
  textSize_md: { fontSize: 16 },
  textSize_lg: { fontSize: 18 },
});
