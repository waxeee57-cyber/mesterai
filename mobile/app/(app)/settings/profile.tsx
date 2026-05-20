import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function Profile() {
  const { master, loadMaster } = useAuthStore();
  const [name, setName] = useState(master?.name ?? '');
  const [phone, setPhone] = useState(master?.phone ?? '');
  const [email, setEmail] = useState(master?.email ?? '');
  const [companyName, setCompanyName] = useState(master?.company_name ?? '');
  const [taxNumber, setTaxNumber] = useState(master?.tax_number ?? '');
  const [bankAccount, setBankAccount] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('masters').update({
        name: name.trim(), phone: phone.trim() || null, email: email.trim() || null,
        company_name: companyName.trim() || null, tax_number: taxNumber.trim() || null,
        bank_account: bankAccount.trim() || null, address: address.trim() || null,
      }).eq('id', master!.id);
      if (error) throw error;
      await loadMaster();
      Alert.alert('Mentve', 'Az adatok frissültek.');
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Teljes név *', value: name, setter: setName, placeholder: 'Kovács János' },
    { label: 'Telefonszám', value: phone, setter: setPhone, placeholder: '+36 30 123 4567', keyboard: 'phone-pad' },
    { label: 'Email', value: email, setter: setEmail, placeholder: 'email@example.com', keyboard: 'email-address' },
    { label: 'Cégnév', value: companyName, setter: setCompanyName, placeholder: 'Kovács Kft.' },
    { label: 'Adószám', value: taxNumber, setter: setTaxNumber, placeholder: '12345678-1-11' },
    { label: 'Bankszámlaszám', value: bankAccount, setter: setBankAccount, placeholder: '11111111-22222222-33333333' },
    { label: 'Cím', value: address, setter: setAddress, placeholder: '1234 Budapest, Példa u. 1.' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Profil" showBack />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {fields.map(f => (
            <View key={f.label}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType={f.keyboard as any}
                autoCapitalize={f.keyboard ? 'none' : 'words'}
              />
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Mentés" onPress={handleSave} loading={loading} size="lg" style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
});
