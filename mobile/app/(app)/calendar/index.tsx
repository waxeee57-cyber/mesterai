import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { addDays, startOfWeek, format, isSameDay, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatTime } from '@/lib/utils/format';

export default function CalendarScreen() {
  const { master } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: jobs = [] } = useQuery({
    queryKey: ['calendar-jobs', master?.id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const from = format(weekStart, "yyyy-MM-dd'T'00:00:00");
      const to = format(addDays(weekStart, 7), "yyyy-MM-dd'T'23:59:59");
      const { data, error } = await supabase
        .from('jobs')
        .select('*, clients(name)')
        .eq('master_id', master!.id)
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .order('scheduled_at');
      if (error) throw error;
      return data;
    },
    enabled: !!master,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayJobs = jobs.filter(j => j.scheduled_at && isSameDay(parseISO(j.scheduled_at), selectedDate));

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00–22:00

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Naptár"
        rightAction={{ icon: 'add', onPress: () => router.push('/(app)/jobs/new') }}
      />

      {/* Week strip */}
      <View style={styles.weekStrip}>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, -7))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
          {weekDays.map(day => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            const hasJobs = jobs.some(j => j.scheduled_at && isSameDay(parseISO(j.scheduled_at), day));
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.dayBtn, isSelected && styles.dayBtnSelected]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {format(day, 'EEE', { locale: hu }).slice(0, 2).toUpperCase()}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isToday && styles.dayNumToday]}>
                  {format(day, 'd')}
                </Text>
                {hasJobs && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, 7))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.dayHeader}>
        {format(selectedDate, 'EEEE, MMMM d.', { locale: hu })}
        {dayJobs.length > 0 && <Text style={styles.jobCount}> · {dayJobs.length} munka</Text>}
      </Text>

      {/* Time slots */}
      <ScrollView style={styles.timeScroll}>
        {HOURS.map(hour => {
          const hourJobs = dayJobs.filter(j => {
            if (!j.scheduled_at) return false;
            return parseISO(j.scheduled_at).getHours() === hour;
          });
          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={styles.hourLabel}>{String(hour).padStart(2, '0')}:00</Text>
              <View style={styles.hourContent}>
                {hourJobs.map(job => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobBlock}
                    onPress={() => router.push(`/(app)/jobs/${job.id}`)}
                  >
                    <Text style={styles.jobBlockTitle}>{job.title}</Text>
                    <Text style={styles.jobBlockClient}>{job.clients?.name}</Text>
                  </TouchableOpacity>
                ))}
                {hourJobs.length === 0 && (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => router.push('/(app)/jobs/new')}
                  />
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  weekStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
  navBtn: { padding: 8 },
  daysScroll: { flex: 1 },
  dayBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, gap: 4, minWidth: 44 },
  dayBtnSelected: { backgroundColor: Colors.accent },
  dayName: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  dayNameSelected: { color: '#fff' },
  dayNum: { fontSize: 17, fontWeight: '700', color: Colors.text },
  dayNumSelected: { color: '#fff' },
  dayNumToday: { color: Colors.accent },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent },
  dotSelected: { backgroundColor: '#fff' },
  dayHeader: { fontSize: 16, fontWeight: '600', color: Colors.text, paddingHorizontal: 20, marginBottom: 12 },
  jobCount: { color: Colors.textSecondary, fontWeight: '400' },
  timeScroll: { flex: 1 },
  hourRow: { flexDirection: 'row', minHeight: 56, borderTopWidth: 1, borderTopColor: Colors.border },
  hourLabel: { width: 48, paddingTop: 6, paddingLeft: 12, fontSize: 12, color: Colors.textMuted },
  hourContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  jobBlock: { backgroundColor: Colors.accent, borderRadius: 8, padding: 8, marginBottom: 4 },
  jobBlockTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  jobBlockClient: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  emptySlot: { flex: 1, minHeight: 44 },
});
