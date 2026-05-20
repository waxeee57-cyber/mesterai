import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
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
import { formatHUF, calcItemTotal, generateInvoiceNumber } from '@/lib/utils/format';
import { sendWhatsAppInvoice } from '@/lib/utils/whatsapp';

export default function CreateInvoice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { master } = useAuthStore();
  const qc = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 8);
    return d.toISOString().split('T')[0];
  });
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*, clients(name, phone, email, tax_number)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['job-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('job_items').select('*').eq('job_id', id).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: invoiceCount } = useQuery({
    queryKey: ['invoice-count', master?.id],
    queryFn: async () => {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('master_id', master!.id);
      return count ?? 0;
    },
    enabled: !!master,
  });

  useEffect(() => {
    if (invoiceCount !== undefined) setInvoiceNumber(generateInvoiceNumber(invoiceCount + 1));
  }, [invoiceCount]);

  const isKataOrMentes = master?.tax_type === 'kata' || master?.tax_type === 'alanyi_mentes';

  const totals = items.reduce((acc, item) => {
    const vatRateToUse = isKataOrMentes ? 0 : item.vat_rate;
    const { net, vat, gross } = calcItemTotal(item.quantity, item.unit_price, vatRateToUse);
    return { net: acc.net + net, vat: acc.vat + vat, gross: acc.gross + gross };
  }, { net: 0, vat: 0, gross: 0 });

  const handleCreate = async () => {
    if (items.length === 0) { Alert.alert('Hiba', 'Adj hozzá tételeket a munkához!'); return; }
    setLoading(true);
    try {
      const { data: invoice, error } = await supabase.from('invoices').insert({
        master_id: master!.id,
        client_id: job?.client_id,
        job_id: id,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        payment_method: paymentMethod,
        notes: notes || null,
        total_net: totals.net,
        total_vat: totals.vat,
        total_gross: totals.gross,
      }).select().single();

      if (error) throw error;

      await supabase.from('jobs').update({ status: 'invoiced' }).eq('id', id);
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });

      Alert.alert('Számla létrehozva!', `Számlaszám: ${invoiceNumber}`, [
        { text: 'Bezárás', onPress: () => router.back() },
        {
          text: 'Küldés WhatsApp-on',
          onPress: () => {
            if (job?.clients?.phone) {
              sendWhatsAppInvoice(job.clients.phone, `https://mesterai.hu/invoice/${invoice.id}/public`, formatHUF(totals.gross));
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    } finally {
      setLoading(false);
    }
  };

  const PAYMENT_METHODS = [
    { key: 'transfer', label: 'Átutalás' },
    { key: 'cash', label: 'Készpénz' },
    { key: 'card', label: 'Bankkártya' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Számla készítése" showBack />
      <ScrollView style={styles.scroll}>
        {/* Invoice data */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Számla adatai</Text>
          <Text style={styles.label}>Számlaszám</Text>
          <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholderTextColor={Colors.textMuted} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Kiállítás dátuma</Text>
              <TextInput style={styles.input} value={issueDate} onChangeText={setIssueDate} placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fizetési határidő</Text>
              <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
          <Text style={styles.label}>Fizetési mód</Text>
          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodChip, paymentMethod === m.key && styles.methodChipActive]}
                onPress={() => setPaymentMethod(m.key)}
              >
                <Text style={[styles.methodText, paymentMethod === m.key && { color: '#fff' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Parties */}
        <Card style={styles.card}>
          <View style={styles.partyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyLabel}>Eladó</Text>
              <Text style={styles.partyName}>{master?.name}</Text>
              {master?.company_name && <Text style={styles.partyMeta}>{master.company_name}</Text>}
              {master?.tax_number && <Text style={styles.partyMeta}>Adószám: {master.tax_number}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyLabel}>Vevő</Text>
              <Text style={styles.partyName}>{job?.clients?.name ?? '—'}</Text>
              {job?.clients?.tax_number && <Text style={styles.partyMeta}>Adószám: {job.clients.tax_number}</Text>}
            </View>
          </View>
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tételek</Text>
          {items.map(item => {
            const vatRateToUse = isKataOrMentes ? 0 : item.vat_rate;
            const { gross } = calcItemTotal(item.quantity, item.unit_price, vatRateToUse);
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  <Text style={styles.itemMeta}>{item.quantity} {item.unit} × {formatHUF(item.unit_price)}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatHUF(gross)}</Text>
              </View>
            );
          })}
        </Card>

        {/* Totals */}
        <Card style={styles.totalCard}>
          {isKataOrMentes ? (
            <Text style={styles.taxNote}>Alanyi adómentes</Text>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Nettó összeg</Text>
                <Text style={styles.totalAmt}>{formatHUF(totals.net)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ÁFA</Text>
                <Text style={styles.totalAmt}>{formatHUF(totals.vat)}</Text>
              </View>
            </>
          )}
          <View style={[styles.totalRow, styles.grossRow]}>
            <Text style={styles.grossLabel}>Bruttó összesen</Text>
            <Text style={styles.grossValue}>{formatHUF(totals.gross)}</Text>
          </View>
        </Card>

        <Text style={styles.label} style={{ paddingHorizontal: 20 }}>Megjegyzés</Text>
        <TextInput
          style={[styles.input, styles.textarea, { marginHorizontal: 20 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Pl. fizetési információk..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Számla létrehozása" onPress={handleCreate} loading={loading} size="lg" style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  card: { margin: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 15 },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  methodChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  methodText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  partyRow: { flexDirection: 'row', gap: 20 },
  partyLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  partyMeta: { fontSize: 12, color: Colors.textSecondary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemDesc: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  itemMeta: { fontSize: 12, color: Colors.textSecondary },
  itemTotal: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.surface },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalAmt: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  grossRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 12 },
  grossLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  grossValue: { fontSize: 24, fontWeight: '800', color: Colors.accent },
  taxNote: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
});
