import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';

const TRADES = [
  { key: 'villanyszerelo', label: 'Villanyszerelő', icon: '⚡' },
  { key: 'vizvezeték', label: 'Vízvezeték-szerelő', icon: '💧' },
  { key: 'festo', label: 'Festő-mázoló', icon: '🎨' },
  { key: 'burkolo', label: 'Burkoló', icon: '🪨' },
  { key: 'acs', label: 'Ács', icon: '🪵' },
  { key: 'komuves', label: 'Kőműves', icon: '🧱' },
  { key: 'kertesz', label: 'Kertész', icon: '🌿' },
  { key: 'egyeb', label: 'Egyéb', icon: '🔧' },
];

const TAX_TYPES = [
  { key: 'afa_kotes', label: 'ÁFA körös', desc: '27% ÁFA-t számolsz fel' },
  { key: 'kata', label: 'KATA', desc: 'Kisadózó, áfa-mentes' },
  { key: 'alanyi_mentes', label: 'Alanyi mentes', desc: '12M Ft/év alatt, ÁFA nélkül' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [taxType, setTaxType] = useState('afa_kotes');
  const [taxNumber, setTaxNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loadMaster } = useAuthStore();

  const handleFinish = async () => {
    if (!name.trim() || !trade) { Alert.alert('Hiba', 'Add meg a neved és szakmád!'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nem vagy bejelentkezve');

      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 14);

      const { error } = await supabase.from('masters').insert({
        auth_id: user.id,
        name: name.trim(),
        trade,
        tax_type: taxType,
        tax_number: taxNumber.trim() || null,
        company_name: companyName.trim() || null,
        email: user.email ?? null,
        subscription_tier: 'free',
        trial_expires_at: trialExpiry.toISOString(),
      });

      if (error) throw error;
      await loadMaster();
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return trade.length > 0;
    if (step === 3) return taxType.length > 0;
    return true;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.progressBar, step >= s && styles.progressBarActive]} />
        ))}
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Szia! Mi a neved?</Text>
            <Text style={styles.subtitle}>Ez fog megjelenni a számláidon</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Pl. Kovács János"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCapitalize="words"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🔨</Text>
            <Text style={styles.title}>Milyen szakmában dolgozol?</Text>
            <Text style={styles.subtitle}>Ezt utólag is módosíthatod</Text>
            <View style={styles.tradeGrid}>
              {TRADES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tradeCard, trade === t.key && styles.tradeCardActive]}
                  onPress={() => setTrade(t.key)}
                >
                  <Text style={styles.tradeIcon}>{t.icon}</Text>
                  <Text style={[styles.tradeLabel, trade === t.key && { color: Colors.accent }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🧾</Text>
            <Text style={styles.title}>Hogyan számlázol?</Text>
            <Text style={styles.subtitle}>Ez befolyásolja a számla ÁFA kezelését</Text>
            {TAX_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.taxCard, taxType === t.key && styles.taxCardActive]}
                onPress={() => setTaxType(t.key)}
              >
                <View style={[styles.radio, taxType === t.key && styles.radioActive]}>
                  {taxType === t.key && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taxLabel, taxType === t.key && { color: Colors.accent }]}>{t.label}</Text>
                  <Text style={styles.taxDesc}>{t.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🏢</Text>
            <Text style={styles.title}>Cég vagy egyéni?</Text>
            <Text style={styles.subtitle}>Opcionális — a számlán fog szerepelni</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, !isCompany && styles.typeBtnActive]} onPress={() => setIsCompany(false)}>
                <Text style={[styles.typeBtnText, !isCompany && { color: '#fff' }]}>Egyéni vállalkozó</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, isCompany && styles.typeBtnActive]} onPress={() => setIsCompany(true)}>
                <Text style={[styles.typeBtnText, isCompany && { color: '#fff' }]}>Cég (Kft, Bt...)</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={taxNumber} onChangeText={setTaxNumber} placeholder="Adószám (pl. 12345678-1-11)" placeholderTextColor={Colors.textMuted} />
            {isCompany && (
              <TextInput style={[styles.input, { marginTop: 12 }]} value={companyName} onChangeText={setCompanyName} placeholder="Cégnév" placeholderTextColor={Colors.textMuted} />
            )}
            <Text style={styles.skipNote}>Ezeket kihagyhatod, később is megadhatod a beállításokban.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 4 ? (
          <Button
            title="Tovább →"
            onPress={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            size="lg"
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            title="Kezdjük el! 🚀"
            onPress={handleFinish}
            loading={loading}
            size="lg"
            style={{ flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  progress: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.surface2 },
  progressBarActive: { backgroundColor: Colors.accent },
  scroll: { flex: 1 },
  stepContainer: { padding: 24, gap: 16 },
  emoji: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: -8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 16, color: Colors.text, fontSize: 16 },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  tradeCard: { width: '45%', flex: undefined, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  tradeCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  tradeIcon: { fontSize: 32 },
  tradeLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  taxCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14 },
  taxCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  taxLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  taxDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  skipNote: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: Colors.border },
});
