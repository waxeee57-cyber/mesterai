import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatHUF } from '@/lib/utils/format';

const PLANS = [
  {
    key: 'free',
    name: 'Ingyenes',
    monthly: 0,
    yearly: 0,
    features: ['10 munka/hó', 'Alap számla (PDF)', 'Email küldés', 'Ügyféladatbázis'],
    limit: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 4900,
    yearly: 44100,
    badge: 'Legjobb választás',
    features: ['Korlátlan munka', 'NAV Online Számla', 'SMS emlékeztető', 'Google Calendar szinkron', 'WhatsApp küldés', 'PDF export', 'Árajánlat kezelés'],
  },
  {
    key: 'business',
    name: 'Business',
    monthly: 9900,
    yearly: 89100,
    features: ['Minden Pro funkció', 'Csapat (5 technikus)', 'AI hangos munkafelvétel', 'Diszpécser nézet', 'Foglalási widget', 'Prioritás support'],
  },
] as const;

export default function Billing() {
  const { master } = useAuthStore();
  const [yearly, setYearly] = useState(false);

  const handleUpgrade = (planKey: string) => {
    if (planKey === master?.subscription_tier) {
      Alert.alert('Jelenlegi csomag', 'Ez a jelenlegi előfizetésed.');
      return;
    }
    Alert.alert('Hamarosan', 'A Stripe fizetés a végső verziót fogja tartalmazni.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Előfizetés" showBack />
      <ScrollView style={styles.scroll}>
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity style={[styles.toggleBtn, !yearly && styles.toggleBtnActive]} onPress={() => setYearly(false)}>
            <Text style={[styles.toggleText, !yearly && styles.toggleTextActive]}>Havi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, yearly && styles.toggleBtnActive]} onPress={() => setYearly(true)}>
            <Text style={[styles.toggleText, yearly && styles.toggleTextActive]}>Éves</Text>
            <View style={styles.saveBadge}><Text style={styles.saveText}>-25%</Text></View>
          </TouchableOpacity>
        </View>

        {PLANS.map(plan => {
          const isCurrent = master?.subscription_tier === plan.key;
          const price = yearly ? plan.yearly : plan.monthly;
          const monthlyEquiv = yearly && plan.monthly > 0 ? Math.round(plan.yearly / 12) : plan.monthly;

          return (
            <Card key={plan.key} style={[styles.planCard, plan.key === 'pro' && styles.planCardPro]}>
              {plan.key === 'pro' && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>⭐ Legjobb választás</Text>
                </View>
              )}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Jelenlegi csomag</Text>
                </View>
              )}
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>{plan.monthly === 0 ? 'Ingyenes' : formatHUF(monthlyEquiv)}</Text>
                {plan.monthly > 0 && <Text style={styles.pricePer}>/hó</Text>}
              </View>
              {yearly && plan.yearly > 0 && (
                <Text style={styles.yearlyNote}>{formatHUF(plan.yearly)} számlázva évente</Text>
              )}
              <View style={styles.features}>
                {plan.features.map(f => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {!isCurrent && plan.key !== 'free' && (
                <Button
                  title={`Válassz ${plan.name}-t`}
                  onPress={() => handleUpgrade(plan.key)}
                  style={styles.planBtn}
                  variant={plan.key === 'pro' ? 'primary' : 'secondary'}
                />
              )}
              {isCurrent && <Text style={styles.activeNote}>✓ Ez az aktív előfizetésed</Text>}
            </Card>
          );
        })}

        <Text style={styles.note}>Az éves csomagok 25% kedvezménnyel érhetők el. Bármikor lemondható.</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, padding: 20 },
  toggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  toggleBtnActive: { backgroundColor: Colors.accent },
  toggleText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  saveBadge: { backgroundColor: '#22C55E30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  saveText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  planCard: { marginBottom: 16 },
  planCardPro: { borderColor: Colors.accent, borderWidth: 2 },
  bestBadge: { backgroundColor: Colors.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  bestBadgeText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  currentBadge: { backgroundColor: Colors.success + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  currentBadgeText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  planName: { fontSize: 20, fontWeight: '800', color: Colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: Colors.accent },
  pricePer: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  yearlyNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  features: { marginTop: 16, gap: 8 },
  featureRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  featureText: { fontSize: 14, color: Colors.textSecondary },
  planBtn: { marginTop: 16 },
  activeNote: { marginTop: 12, color: Colors.success, fontWeight: '600', textAlign: 'center' },
  note: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
});
