import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useTodayJobs, useUpdateJobStatus } from '@/lib/hooks/useJobs';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { formatHUF, formatTime, getGreeting } from '@/lib/utils/format';

export default function Dashboard() {
  const { master } = useAuthStore();
  const { data: todayJobs = [], refetch, isRefetching } = useTodayJobs();
  const { data: invoices = [] } = useInvoices();
  const updateStatus = useUpdateJobStatus();

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const paidThisMonth = invoices
    .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((sum, i) => sum + (i.total_gross ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {master?.name?.split(' ')[0]}!</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/settings')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/jobs/new')} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={28} color="#fff" />
            <Text style={styles.actionText}>Új munka</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => router.push('/(app)/jobs/new')} activeOpacity={0.8}>
            <Ionicons name="camera" size={28} color={Colors.accent} />
            <Text style={[styles.actionText, { color: Colors.accent }]}>Fotó</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => {}} activeOpacity={0.8}>
            <Ionicons name="mic" size={28} color={Colors.accent} />
            <Text style={[styles.actionText, { color: Colors.accent }]}>Hangjegyzet</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{formatHUF(paidThisMonth)}</Text>
            <Text style={styles.statLabel}>Havi bevétel</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, unpaidInvoices.length > 0 && { color: Colors.warning }]}>
              {unpaidInvoices.length}
            </Text>
            <Text style={styles.statLabel}>Kifizetetlen számla</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{master?.jobs_this_month ?? 0}</Text>
            <Text style={styles.statLabel}>Munka (hónap)</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todayJobs.length}</Text>
            <Text style={styles.statLabel}>Mai munkák</Text>
          </Card>
        </View>

        {/* Today's Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mai munkák</Text>
          {todayJobs.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Ma nincs tervezett munka</Text>
            </Card>
          ) : (
            todayJobs.map(job => (
              <TouchableOpacity key={job.id} onPress={() => router.push(`/(app)/jobs/${job.id}`)}>
                <Card style={styles.jobCard}>
                  <View style={styles.jobRow}>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.jobMeta}>
                        {job.scheduled_at ? formatTime(job.scheduled_at) : ''} · {job.clients?.name ?? 'Ismeretlen ügyfél'}
                      </Text>
                      {job.address && <Text style={styles.jobAddress}>{job.address}</Text>}
                    </View>
                    <JobStatusBadge status={job.status} />
                  </View>
                  {job.status === 'scheduled' && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => updateStatus.mutate({ id: job.id, status: 'in_progress' })}
                    >
                      <Text style={styles.startBtnText}>Megkezdem</Text>
                    </TouchableOpacity>
                  )}
                  {job.status === 'in_progress' && (
                    <TouchableOpacity
                      style={[styles.startBtn, { backgroundColor: Colors.success }]}
                      onPress={() => updateStatus.mutate({ id: job.id, status: 'done' })}
                    >
                      <Text style={styles.startBtnText}>Befejeztem</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: '700', color: Colors.text },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  notifBtn: { padding: 8, backgroundColor: Colors.surface, borderRadius: 12 },
  quickActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginVertical: 16 },
  actionBtn: { flex: 1, backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, minHeight: 80 },
  actionBtnSecondary: { backgroundColor: Colors.accentMuted, borderWidth: 1, borderColor: Colors.accent },
  actionText: { fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%' },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.accent },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  section: { paddingHorizontal: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  jobCard: { marginBottom: 0 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobInfo: { flex: 1, marginRight: 12 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  jobMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  jobAddress: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  startBtn: { marginTop: 12, backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
});
