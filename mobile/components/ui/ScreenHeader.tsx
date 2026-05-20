import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, showBack, rightAction }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.rightBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={rightAction.icon} size={24} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.bg, paddingHorizontal: 20, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  rightBtn: { marginLeft: 12 },
});
