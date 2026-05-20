import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { master, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!master) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)/dashboard" />;
}
