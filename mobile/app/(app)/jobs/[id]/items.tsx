import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatHUF, calcItemTotal } from '@/lib/utils/format';

export default function JobItems() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { master } = useAuthStore();
  const qc = useQueryClient();

  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('db');
  const [price, setPrice] = useState('');
  const [vatRate, setVatRate] = useState(27);

  const { data: items = [] } = useQuery({
    queryKey: ['job-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('job_items').select('*').eq('job_id', id).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!desc.trim() || !price) throw new Error('Töltsd ki a kötelező mezőket!');
      const quantity = parseFloat(qty) || 1;
      const unit_price = parseFloat(price);
      const { net, gross } = calcItemTotal(quantity, unit_price, vatRate);
      const { error } = await supabase.from('job_items').insert({
        job_id: id, master_id: master!.id,
        description: desc.trim(), quantity, unit, unit_price, vat_rate: vatRate,
        total_net: net, total_gross: gross, sort_order: items.length,
      });
      if (error) throw error;
      setDesc(''); setQty('1'); setPrice('');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-items', id] }),
    onError: (e: Error) => Alert.alert('Hiba', e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('job_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-items', id] }),
  });

  const total = items.reduce((s, i) => s + calcItemTotal(i.quantity, i.unit_price, i.vat_rate).gross, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Tételek" showBack />
      <ScrollView style={styles.scroll}>
        <Card style={styles.addCard}>
          <Text style={styles.addTitle}>Tétel hozzáadása</Text>
          <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="Leírás *" placeholderTextColor={Colors.textMuted} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={qty} onChangeText={setQty} placeholder="Menny." placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} value={unit} onChangeText={setUnit} placeholder="Egység" placeholderTextColor={Colors.textMuted} />
            <TextInput style={[styles.input, { flex: 2 }]} value={price} onChangeText={setPrice} placeholder="Egységár *" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
          </View>
          <View style={styles.vatRow}>
            {[0, 5, 27].map(v => (
              <TouchableOpacity key={v} style={[styles.vatChip, vatRate === v && styles.vatChipActive]} onPress={() => setVatRate(v)}>
                <Text style={[styles.vatText, vatRate === v && { color: '#fff' }]}>{v}% ÁFA</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="+ Hozzáadás" onPress={() => addItem.mutate()} loading={addItem.isPending} style={{ marginTop: 8 }} />
        </Card>

        {items.map(item => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemMeta}>{item.quantity} {item.unit} × {formatHUF(item.unit_price)} (+{item.vat_rate}% ÁFA)</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemTotal}>{formatHUF(calcItemTotal(item.quantity, item.unit_price, item.vat_rate).gross)}</Text>
                <TouchableOpacity onPress={() => deleteItem.mutate(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        {items.length > 0 && (
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>Bruttó összesen</Text>
            <Text style={styles.totalValue}>{formatHUF(total)}</Text>
          </Card>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, padding: 20 },
  addCard: { marginBottom: 20 },
  addTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  vatRow: { flexDirection: 'row', gap: 8 },
  vatChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  vatChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  vatText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  itemCard: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDesc: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  itemTotal: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  deleteBtn: { padding: 4 },
  totalCard: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.accent },
});
