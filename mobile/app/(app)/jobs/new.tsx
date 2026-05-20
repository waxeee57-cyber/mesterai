import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useClients } from '@/lib/hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';

const TRADES = [
  { key: 'villanyszerelo', label: 'Villanyszerelő', icon: '⚡' },
  { key: 'vizvezeték', label: 'Vízvezeték', icon: '💧' },
  { key: 'festo', label: 'Festő', icon: '🎨' },
  { key: 'burkolo', label: 'Burkoló', icon: '🪨' },
  { key: 'acs', label: 'Ács', icon: '🪵' },
  { key: 'komuves', label: 'Kőműves', icon: '🧱' },
  { key: 'egyeb', label: 'Egyéb', icon: '🔧' },
];

export default function NewJob() {
  const { master } = useAuthStore();
  const { data: clients = [] } = useClients();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState(master?.trade ?? 'egyeb');
  const [address, setAddress] = useState('');

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Hiba', 'Add meg a munka nevét!'); return; }
    setLoading(true);
    try {
      let finalClientId = clientId;

      if (showNewClient && newClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ master_id: master!.id, name: newClientName.trim(), phone: newClientPhone.trim() || null })
          .select()
          .single();
        if (clientError) throw clientError;
        finalClientId = newClient.id;
      }

      let scheduledAt: string | null = null;
      if (scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const { data: job, error } = await supabase
        .from('jobs')
        .insert({
          master_id: master!.id,
          client_id: finalClientId,
          title: title.trim(),
          trade,
          address: address.trim() || null,
          description: description.trim() || null,
          scheduled_at: scheduledAt,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          status: scheduledAt ? 'scheduled' : 'new',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('masters').update({ jobs_this_month: (master!.jobs_this_month ?? 0) + 1 }).eq('id', master!.id);
      qc.invalidateQueries({ queryKey: ['jobs'] });
      router.replace(`/(app)/jobs/${job.id}`);
    } catch (e: any) {
      Alert.alert('Hiba', e.message ?? 'Nem sikerült menteni');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Új munka" showBack />
      <View style={styles.steps}>
        {[1, 2, 3].map(s => (
          <View key={s} style={[styles.step, step >= s && styles.stepActive]} />
        ))}
      </View>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Alapadatok</Text>

            <Text style={styles.label}>Munka neve *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="pl. Duguláselhárítás fürdőszobában"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Ügyfél</Text>
            {!showNewClient ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientsScroll}>
                  {clients.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.clientChip, clientId === c.id && styles.clientChipActive]}
                      onPress={() => setClientId(c.id === clientId ? null : c.id)}
                    >
                      <Text style={[styles.clientChipText, clientId === c.id && { color: '#fff' }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.newClientBtn} onPress={() => setShowNewClient(true)}>
                  <Text style={styles.newClientBtnText}>+ Új ügyfél</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Card>
                <TextInput style={styles.input} value={newClientName} onChangeText={setNewClientName} placeholder="Ügyfél neve *" placeholderTextColor={Colors.textMuted} />
                <TextInput style={[styles.input, { marginTop: 8 }]} value={newClientPhone} onChangeText={setNewClientPhone} placeholder="Telefonszám" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                <TouchableOpacity onPress={() => setShowNewClient(false)}><Text style={{ color: Colors.textSecondary, marginTop: 8 }}>Vissza a listához</Text></TouchableOpacity>
              </Card>
            )}

            <Text style={styles.label}>Szakma</Text>
            <View style={styles.tradeGrid}>
              {TRADES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tradeChip, trade === t.key && styles.tradeChipActive]}
                  onPress={() => setTrade(t.key)}
                >
                  <Text style={styles.tradeIcon}>{t.icon}</Text>
                  <Text style={[styles.tradeLabel, trade === t.key && { color: Colors.accent }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Helyszín</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Cím" placeholderTextColor={Colors.textMuted} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Időpont és részletek</Text>

            <Text style={styles.label}>Dátum</Text>
            <TextInput style={styles.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="2026-05-20" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Időpont</Text>
            <TextInput style={styles.input} value={scheduledTime} onChangeText={setScheduledTime} placeholder="08:00" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Becsült időtartam</Text>
            <View style={styles.hoursRow}>
              {['1', '2', '4', '8'].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hourChip, estimatedHours === h && styles.hourChipActive]}
                  onPress={() => setEstimatedHours(h)}
                >
                  <Text style={[styles.hourText, estimatedHours === h && { color: '#fff' }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Leírás</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Munka részletei..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Tételek (opcionális)</Text>
            <Card>
              <Text style={styles.infoText}>A tételeket a munka létrehozása után is hozzáadhatod a munka részleteinél.</Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Button title="Vissza" onPress={() => setStep(s => s - 1)} variant="secondary" style={styles.footerBtn} />
        )}
        {step < 3 ? (
          <Button title="Tovább →" onPress={() => setStep(s => s + 1)} style={styles.footerBtn} />
        ) : (
          <Button title="Mentés" onPress={handleSave} loading={loading} style={styles.footerBtn} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  steps: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.surface2 },
  stepActive: { backgroundColor: Colors.accent },
  scroll: { flex: 1 },
  section: { padding: 20, gap: 8 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginTop: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 16 },
  textarea: { height: 100, textAlignVertical: 'top' },
  clientsScroll: { marginBottom: 8 },
  clientChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  clientChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  clientChipText: { color: Colors.text, fontWeight: '500' },
  newClientBtn: { paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.accent, borderRadius: 12, borderStyle: 'dashed' },
  newClientBtnText: { color: Colors.accent, fontWeight: '600' },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tradeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4, minWidth: 90 },
  tradeChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  tradeIcon: { fontSize: 20 },
  tradeLabel: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  hoursRow: { flexDirection: 'row', gap: 12 },
  hourChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  hourChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  hourText: { color: Colors.text, fontWeight: '600' },
  infoText: { color: Colors.textSecondary, lineHeight: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  footerBtn: { flex: 1 },
});
