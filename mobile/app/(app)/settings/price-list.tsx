import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatHUF } from '@/lib/utils/format';

interface PriceItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
}

export default function PriceList() {
  const { master } = useAuthStore();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('work');
  const [unit, setUnit] = useState('ora');
  const [price, setPrice] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['price-list', master?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('price_list').select('*').eq('master_id', master!.id).eq('is_active', true).order('name');
      if (error) throw error;
      return data as PriceItem[];
    },
    enabled: !!master,
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !price) throw new Error('Töltsd ki a mezőket!');
      const { error } = await supabase.from('price_list').insert({
        master_id: master!.id, name: name.trim(), type, unit, unit_price: parseFloat(price), vat_rate: 27,
      });
      if (error) throw error;
      setName(''); setPrice('');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-list'] }),
    onError: (e: Error) => Alert.alert('Hiba', e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_list').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-list'] }),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Árjegyzék" showBack />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <Card style={styles.addCard}>
            <Text style={styles.addTitle}>Tétel hozzáadása</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Megnevezés" placeholderTextColor={Colors.textMuted} />
            <View style={styles.row}>
              <View style={styles.typeRow}>
                {['work', 'material'].map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                    <Text style={[styles.chipText, type === t && { color: '#fff' }]}>{t === 'work' ? 'Munka' : 'Anyag'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, { flex: 1 }]} value={unit} onChangeText={setUnit} placeholder="Egység" placeholderTextColor={Colors.textMuted} />
              <TextInput style={[styles.input, { flex: 2 }]} value={price} onChangeText={setPrice} placeholder="Ár (Ft)" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
            </View>
            <Button title="Hozzáadás" onPress={() => addItem.mutate()} loading={addItem.isPending} />
          </Card>
        )}
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.type === 'work' ? 'Munka' : 'Anyag'} · {item.unit}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatHUF(item.unit_price)}</Text>
              <TouchableOpacity onPress={() => deleteItem.mutate(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Üres az árjegyzék. Add hozzá a leggyakrabban számlázott tételeket!</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: 20, gap: 10 },
  addCard: { marginBottom: 8, gap: 10 },
  addTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  input: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  typeRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
  item: { },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  deleteBtn: { padding: 6 },
  empty: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
});
