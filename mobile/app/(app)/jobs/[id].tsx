import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useUpdateJobStatus } from '@/lib/hooks/useJobs';
import { formatDate, formatTime, formatHUF, calcItemTotal } from '@/lib/utils/format';

interface JobItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  total_net: number | null;
  total_gross: number | null;
}

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const updateStatus = useUpdateJobStatus();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, clients(name, phone, email)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['job-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('job_items').select('*').eq('job_id', id).order('sort_order');
      if (error) throw error;
      return data as JobItem[];
    },
  });

  const totalGross = items.reduce((sum, item) => {
    const { gross } = calcItemTotal(item.quantity, item.unit_price, item.vat_rate);
    return sum + gross;
  }, 0);

  if (isLoading || !job) return <SafeAreaView style={styles.safe}><Text style={{ color: Colors.text, padding: 20 }}>Betöltés...</Text></SafeAreaView>;

  const callClient = () => {
    if (job.clients?.phone) Linking.openURL(`tel:${job.clients.phone}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={job.title}
        showBack
        rightAction={{ icon: 'create-outline', onPress: () => {} }}
      />
      <ScrollView style={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <JobStatusBadge status={job.status} />
          </View>
          {job.clients && (
            <TouchableOpacity style={styles.clientRow} onPress={callClient}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{job.clients.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{job.clients.name}</Text>
                {job.clients.phone && <Text style={styles.clientPhone}>{job.clients.phone}</Text>}
              </View>
              {job.clients.phone && <Ionicons name="call" size={22} color={Colors.accent} />}
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {job.status === 'new' || job.status === 'scheduled' ? (
            <Button title="Megkezdem" onPress={() => updateStatus.mutate({ id: job.id, status: 'in_progress' })} />
          ) : job.status === 'in_progress' ? (
            <Button title="Befejeztem ✓" onPress={() => updateStatus.mutate({ id: job.id, status: 'done' })} />
          ) : null}
          {(job.status === 'done' || job.status === 'invoiced') && (
            <Button title="Számla készítése" onPress={() => router.push(`/(app)/jobs/${job.id}/invoice`)} />
          )}
          <Button title="Árajánlat" onPress={() => {}} variant="secondary" />
        </View>

        {/* Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Részletek</Text>
          {job.scheduled_at && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{formatDate(job.scheduled_at)} · {formatTime(job.scheduled_at)}</Text>
            </View>
          )}
          {job.address && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`)}
            >
              <Ionicons name="location" size={18} color={Colors.textSecondary} />
              <Text style={[styles.detailText, { color: Colors.accent }]}>{job.address}</Text>
            </TouchableOpacity>
          )}
          {job.description && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={18} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{job.description}</Text>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Tételek</Text>
            <TouchableOpacity onPress={() => router.push(`/(app)/jobs/${job.id}/items`)}>
              <Text style={{ color: Colors.accent }}>Szerkesztés</Text>
            </TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>Nincs tétel hozzáadva</Text>
          ) : (
            <>
              {items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                    <Text style={styles.itemMeta}>{item.quantity} {item.unit} × {formatHUF(item.unit_price)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatHUF(calcItemTotal(item.quantity, item.unit_price, item.vat_rate).gross)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Összesen (bruttó)</Text>
                <Text style={styles.totalValue}>{formatHUF(totalGross)}</Text>
              </View>
            </>
          )}
        </Card>

        {/* Photos */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Fotók</Text>
            <TouchableOpacity><Text style={{ color: Colors.accent }}>+ Fotó</Text></TouchableOpacity>
          </View>
          <Text style={styles.emptyText}>Nincs fotó csatolva</Text>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  hero: { padding: 20, gap: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 16, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.accent, fontSize: 18, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  clientPhone: { fontSize: 13, color: Colors.textSecondary },
  actions: { paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  card: { marginHorizontal: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  detailText: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemDesc: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  itemMeta: { fontSize: 12, color: Colors.textSecondary },
  itemTotal: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  totalValue: { fontSize: 18, fontWeight: '700', color: Colors.accent },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
