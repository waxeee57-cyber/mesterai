import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useCreateClient } from '@/lib/hooks/useClients';

export default function NewClient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');

  const createClient = useCreateClient();

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Hiba', 'Add meg az ügyfél nevét!'); return; }
    try {
      const client = await createClient.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        tax_number: taxNumber.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace(`/(app)/clients/${client.id}`);
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    }
  };

  const fields: { label: string; value: string; setter: (v: string) => void; placeholder: string; keyboardType?: any }[] = [
    { label: 'Név *', value: name, setter: setName, placeholder: 'Teljes név' },
    { label: 'Telefonszám', value: phone, setter: setPhone, placeholder: '+36 30 123 4567', keyboardType: 'phone-pad' },
    { label: 'Email', value: email, setter: setEmail, placeholder: 'email@example.com', keyboardType: 'email-address' },
    { label: 'Cím', value: address, setter: setAddress, placeholder: 'Utca, házszám' },
    { label: 'Város', value: city, setter: setCity, placeholder: 'Budapest' },
    { label: 'Adószám (cégnél)', value: taxNumber, setter: setTaxNumber, placeholder: '12345678-1-11' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Új ügyfél" showBack />
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
                keyboardType={f.keyboardType}
                autoCapitalize={f.keyboardType ? 'none' : 'words'}
              />
            </View>
          ))}
          <Text style={styles.label}>Megjegyzés</Text>
          <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes} placeholder="Egyéb infók..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Mentés" onPress={handleSave} loading={createClient.isPending} size="lg" style={{ flex: 1 }} />
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
  textarea: { height: 80, textAlignVertical: 'top' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
});
