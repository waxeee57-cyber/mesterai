import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useClients } from '@/lib/hooks/useClients';
import { formatHUF } from '@/lib/utils/format';

export default function Clients() {
  const [search, setSearch] = useState('');
  const { data: clients = [], isLoading } = useClients(search);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Ügyfelek"
        rightAction={{ icon: 'add', onPress: () => router.push('/(app)/clients/new') }}
      />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Keresés névvel, telefonnal..."
          placeholderTextColor={Colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={clients}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/clients/${item.id}`)}>
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
                  {item.city && <Text style={styles.meta}>{item.city}</Text>}
                </View>
                <View style={styles.stats}>
                  <Text style={styles.jobCount}>{item.jobs_count} munka</Text>
                  {item.total_revenue > 0 && (
                    <Text style={styles.revenue}>{formatHUF(item.total_revenue)}</Text>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="people-outline"
              title="Nincs ügyfél"
              subtitle="Add hozzá az első ügyfeled!"
              actionLabel="+ Új ügyfél"
              onAction={() => router.push('/(app)/clients/new')}
            />
          ) : null
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/clients/new')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { },
  search: { flex: 1, height: 48, color: Colors.text, fontSize: 15 },
  list: { padding: 20, gap: 10 },
  card: { },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  stats: { alignItems: 'flex-end', gap: 4 },
  jobCount: { fontSize: 12, color: Colors.textSecondary },
  revenue: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
