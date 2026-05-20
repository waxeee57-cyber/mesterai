import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const formattedPhone = (): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('06')) return '+36' + cleaned.slice(1);
    if (cleaned.startsWith('36')) return '+' + cleaned;
    if (cleaned.startsWith('+')) return cleaned;
    return '+36' + cleaned;
  };

  const sendOtp = async () => {
    if (phone.length < 8) { Alert.alert('Hiba', 'Add meg a telefonszámodat!'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone() });
      if (error) throw error;
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { Alert.alert('Hiba', 'Add meg a 6 jegyű kódot!'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone(), token: otp, type: 'sms' });
      if (error) throw error;

      const { data: existing } = await supabase.from('masters').select('id').eq('auth_id', data.user!.id).single();
      if (!existing) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(app)/dashboard');
      }
    } catch (e: any) {
      Alert.alert('Hiba', e.message);
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'demo@mesterai.hu',
        password: 'demo12345',
      });
      if (error) throw error;
      router.replace('/(app)/dashboard');
    } catch {
      Alert.alert('Demo', 'Demo fiók nem elérhető ebben a környezetben');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="hammer" size={36} color="#fff" />
            </View>
            <Text style={styles.logoText}>MesterAI</Text>
            <Text style={styles.logoSub}>Magyar mesteremberek appja</Text>
          </View>

          {/* Trial badge */}
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>🎁 14 napos ingyenes próba — bankkártya nélkül</Text>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Belépés telefonszámmal</Text>
              <View style={styles.phoneInput}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>🇭🇺 +36</Text>
                </View>
                <TextInput
                  style={styles.phoneField}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="30 123 4567"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>
              <Button title="Kód küldése →" onPress={sendOtp} loading={loading} size="lg" style={styles.btn} />
              <TouchableOpacity onPress={demoLogin} style={styles.demoBtn}>
                <Text style={styles.demoBtnText}>Demo belépés</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>SMS kód megadása</Text>
              <Text style={styles.subtitle}>Kódot küldtük: {formattedPhone()}</Text>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                placeholder="• • • • • •"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Button title="Belépés →" onPress={verifyOtp} loading={loading} size="lg" style={styles.btn} />
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.demoBtn}>
                <Text style={styles.demoBtnText}>Új kód kérése</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  kav: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 8, gap: 8 },
  logoIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 32, fontWeight: '800', color: Colors.text },
  logoSub: { fontSize: 15, color: Colors.textSecondary },
  trialBadge: { backgroundColor: Colors.accentMuted, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent, padding: 12, alignItems: 'center' },
  trialText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: -8 },
  phoneInput: { flexDirection: 'row', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden', height: 60 },
  prefix: { paddingHorizontal: 16, justifyContent: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  prefixText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  phoneField: { flex: 1, paddingHorizontal: 16, fontSize: 18, color: Colors.text },
  otpInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, height: 68, textAlign: 'center', fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: 8 },
  btn: { marginTop: 8 },
  demoBtn: { alignItems: 'center', paddingVertical: 12 },
  demoBtnText: { color: Colors.textSecondary, fontSize: 14 },
});
