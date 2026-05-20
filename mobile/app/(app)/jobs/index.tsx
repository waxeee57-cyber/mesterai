import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useJobs } from '@/lib/hooks/useJobs';
import { formatDate, formatHUF } from '@/lib/utils/format';

const STATUSES = [
  { key: undefined, label: 'Mind' },
  { key: 'new', label: 'Új' },
  { key: 'scheduled', label: 'Tervezett' },
  { key: 'in_progress', label: 'Folyamatban' },
  { key: 'done', label: 'Kész' },
  { key: 'invoiced', label: 'Számlázva' },
  { key: 'paid', label: 'Fizetve' },
] as const;

export default function JobsList() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: jobs = [], isLoading } = useJobs(filter as any);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Munkák"
        rightAction={{ icon: 'add', onPress: () => router.push('/(app)/jobs/new') }}
      />
      <View style={styles.filters}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={String(s.key)}
            style={[styles.filterChip, filter === s.key && styles.filterChipActive]}
            onPress={() => setFilter(s.key)}
          >
            <Text style={[styles.filterText, filter === s.key && styles.filterTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/jobs/${item.id}`)}>
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.meta}>{item.clients?.name ?? 'Nincs ügyfél'}</Text>
                  {item.scheduled_at && <Text style={styles.date}>{formatDate(item.scheduled_at)}</Text>}
                </View>
                <JobStatusBadge status={item.status} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="hammer-outline"
              title="Nincs munka"
              subtitle="Hozz létre az első munkát!"
              actionLabel="+ Új munka"
              onAction={() => router.push('/(app)/jobs/new')}
            />
          ) : null
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/jobs/new')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 20, gap: 12 },
  card: { },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
