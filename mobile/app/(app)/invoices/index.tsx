import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { formatHUF, formatDate } from '@/lib/utils/format';

const STATUS_MAP = {
  draft: { label: 'Piszkozat', variant: 'default' as const },
  sent: { label: 'Kiküldve', variant: 'accent' as const },
  paid: { label: 'Fizetve', variant: 'success' as const },
  overdue: { label: 'Lejárt', variant: 'error' as const },
  cancelled: { label: 'Törölt', variant: 'error' as const },
};

export default function Invoices() {
  const { data: invoices = [], isLoading } = useInvoices();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Számlák" />
      <FlatList
        data={invoices}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sm = STATUS_MAP[item.status] ?? STATUS_MAP.draft;
          return (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.number}>{item.invoice_number}</Text>
                  <Text style={styles.client}>{item.clients?.name ?? '—'}</Text>
                  <Text style={styles.date}>{formatDate(item.issue_date)}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatHUF(item.total_gross ?? 0)}</Text>
                  <Badge label={sm.label} variant={sm.variant} />
                  {item.nav_status && (
                    <Badge label={item.nav_status === 'confirmed' ? 'NAV ✓' : 'NAV...'} variant={item.nav_status === 'confirmed' ? 'success' : 'warning'} />
                  )}
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="receipt-outline" title="Nincs számla" subtitle="A számlák a munkáknál keletkeznek" />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 20, gap: 12 },
  card: { },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  number: { fontSize: 15, fontWeight: '700', color: Colors.text },
  client: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.accent },
});
