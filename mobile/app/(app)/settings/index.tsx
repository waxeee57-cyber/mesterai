import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: string;
  badgeVariant?: 'accent' | 'success' | 'warning';
  danger?: boolean;
}

export default function Settings() {
  const { master, signOut } = useAuthStore();

  const TIER_MAP = { free: 'Ingyenes', pro: 'Pro', business: 'Business' };
  const tierLabel = TIER_MAP[master?.subscription_tier ?? 'free'];

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Fiók',
      items: [
        { icon: 'person-circle-outline', label: 'Profil szerkesztése', onPress: () => router.push('/(app)/settings/profile') },
        { icon: 'document-text-outline', label: 'Számlázási adatok', onPress: () => router.push('/(app)/settings/profile') },
        { icon: 'card-outline', label: 'Előfizetés', onPress: () => router.push('/(app)/settings/billing'), badge: tierLabel, badgeVariant: master?.subscription_tier === 'pro' ? 'accent' : master?.subscription_tier === 'business' ? 'success' : undefined },
      ],
    },
    {
      title: 'Integrációk',
      items: [
        { icon: 'receipt-outline', label: 'NAV Online Számla', onPress: () => router.push('/(app)/settings/nav') },
        { icon: 'calendar-outline', label: 'Google Calendar', onPress: () => {}, badge: 'Pro', badgeVariant: 'accent' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'pricetags-outline', label: 'Árjegyzék', onPress: () => router.push('/(app)/settings/price-list') },
        { icon: 'people-outline', label: 'Csapat', onPress: () => {}, badge: 'Business', badgeVariant: 'success' },
        { icon: 'notifications-outline', label: 'Értesítések', onPress: () => {} },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out-outline', label: 'Kijelentkezés', onPress: () => {
          Alert.alert('Kijelentkezés', 'Biztosan ki akarsz lépni?', [
            { text: 'Mégse', style: 'cancel' },
            { text: 'Kilépés', style: 'destructive', onPress: signOut },
          ]);
        }, danger: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Beállítások" />
      <ScrollView style={styles.scroll}>
        {/* Profile card */}
        <TouchableOpacity onPress={() => router.push('/(app)/settings/profile')}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{master?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{master?.name ?? 'Mesterember'}</Text>
              <Text style={styles.profileTrade}>{master?.trade ?? ''}</Text>
              {master?.phone && <Text style={styles.profilePhone}>{master.phone}</Text>}
            </View>
            <Badge
              label={tierLabel}
              variant={master?.subscription_tier === 'pro' ? 'accent' : master?.subscription_tier === 'business' ? 'success' : 'default'}
            />
          </View>
        </TouchableOpacity>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <Card style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.item, idx < section.items.length - 1 && styles.itemBorder]}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon} size={22} color={item.danger ? Colors.error : Colors.textSecondary} />
                  <Text style={[styles.itemLabel, item.danger && { color: Colors.error }]}>{item.label}</Text>
                  {item.badge && <Badge label={item.badge} variant={item.badgeVariant ?? 'default'} />}
                  {!item.danger && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <Text style={styles.version}>MesterAI v1.0.0 · mesterai.hu</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 20, padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 24, fontWeight: '700', color: Colors.accent },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  profileTrade: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profilePhone: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  sectionCard: { overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLabel: { flex: 1, fontSize: 15, color: Colors.text },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 16 },
});
