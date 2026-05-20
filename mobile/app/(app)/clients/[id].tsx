import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, FlatList } from 'react-native';
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
import { formatDate, formatHUF } from '@/lib/utils/format';

export default function ClientDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['client-jobs', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!client) return null;

  const contactActions = [
    { icon: 'call' as const, label: 'Hívás', action: () => client.phone && Linking.openURL(`tel:${client.phone}`), disabled: !client.phone },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp', action: () => client.phone && Linking.openURL(`https://wa.me/${client.phone.replace(/\D/g, '')}`), disabled: !client.phone },
    { icon: 'mail' as const, label: 'Email', action: () => client.email && Linking.openURL(`mailto:${client.email}`), disabled: !client.email },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={client.name} showBack />
      <ScrollView style={styles.scroll}>
        {/* Avatar + contact */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.name[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{client.name}</Text>
          {client.city && <Text style={styles.city}>{client.city}</Text>}
          <View style={styles.contactRow}>
            {contactActions.map(a => (
              <TouchableOpacity
                key={a.label}
                style={[styles.contactBtn, a.disabled && styles.contactBtnDisabled]}
                onPress={a.action}
                disabled={a.disabled}
              >
                <Ionicons name={a.icon} size={22} color={a.disabled ? Colors.textMuted : Colors.accent} />
                <Text style={[styles.contactLabel, a.disabled && { color: Colors.textMuted }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="+ Új munka"
          onPress={() => router.push({ pathname: '/(app)/jobs/new', params: { clientId: id } })}
          style={styles.newJobBtn}
        />

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{client.jobs_count}</Text>
            <Text style={styles.statLabel}>Összes munka</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.accent }]}>{formatHUF(client.total_revenue)}</Text>
            <Text style={styles.statLabel}>Összes bevétel</Text>
          </Card>
        </View>

        {/* Details */}
        <Card style={styles.card}>
          {client.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{client.phone}</Text>
            </View>
          )}
          {client.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{client.email}</Text>
            </View>
          )}
          {client.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{client.address}</Text>
            </View>
          )}
          {client.tax_number && (
            <View style={styles.detailRow}>
              <Ionicons name="document" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>Adószám: {client.tax_number}</Text>
            </View>
          )}
          {client.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{client.notes}</Text>
            </View>
          )}
        </Card>

        {/* Jobs history */}
        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>Munkák előzményei</Text>
          {jobs.map(job => (
            <TouchableOpacity key={job.id} onPress={() => router.push(`/(app)/jobs/${job.id}`)}>
              <Card style={styles.jobCard}>
                <View style={styles.jobRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    {job.created_at && <Text style={styles.jobDate}>{formatDate(job.created_at)}</Text>}
                  </View>
                  <JobStatusBadge status={job.status} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {jobs.length === 0 && <Text style={styles.emptyText}>Nincs korábbi munka</Text>}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.accent },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text },
  city: { fontSize: 14, color: Colors.textSecondary },
  contactRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  contactBtn: { alignItems: 'center', gap: 4, padding: 12, backgroundColor: Colors.surface, borderRadius: 16, minWidth: 70 },
  contactBtnDisabled: { opacity: 0.4 },
  contactLabel: { fontSize: 12, color: Colors.accent, fontWeight: '500' },
  newJobBtn: { marginHorizontal: 20, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  card: { marginHorizontal: 20, marginBottom: 16 },
  detailRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 },
  detailText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  jobsSection: { paddingHorizontal: 20, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  jobCard: { marginBottom: 0 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  jobDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
});
