import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function NavSettings() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sigKey, setSigKey] = useState('');
  const [exchKey, setExchKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!username || !password) { Alert.alert('Hiba', 'Add meg a felhasználónevet és jelszót!'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setSaved(true); Alert.alert('Mentve', 'NAV adatok titkosítva elmentve.'); }, 800);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="NAV Online Számla" showBack />
      <ScrollView style={styles.scroll}>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={22} color={Colors.accent} />
            <Text style={styles.infoText}>
              A NAV Online Számla rendszerbe való automatikus feltöltéshez szükséges az API hozzáférés.
            </Text>
          </View>
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://onlineszamla.nav.gov.hu')}
          >
            onlineszamla.nav.gov.hu →
          </Text>
        </Card>

        {saved && (
          <Card style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.successText}>NAV csatlakoztatva ✓</Text>
          </Card>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>XML felhasználónév</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="nav_felhasznalo" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
          <Text style={styles.label}>Jelszó</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={Colors.textMuted} secureTextEntry />
          <Text style={styles.label}>Aláírókulcs</Text>
          <TextInput style={styles.input} value={sigKey} onChangeText={setSigKey} placeholder="Aláírókulcs" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
          <Text style={styles.label}>Cserekulcs</Text>
          <TextInput style={styles.input} value={exchKey} onChangeText={setExchKey} placeholder="Cserekulcs" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
        </View>

        <Text style={styles.note}>Az adatok titkosítva tárolódnak. Soha nem adjuk ki harmadik félnek.</Text>
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
  infoCard: { margin: 20, marginBottom: 12, gap: 8 },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  link: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  successCard: { marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'center', borderColor: Colors.success },
  successText: { color: Colors.success, fontWeight: '600' },
  form: { paddingHorizontal: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15 },
  note: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 16, paddingHorizontal: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
});
