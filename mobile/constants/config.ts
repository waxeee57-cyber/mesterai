export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_KEY ?? '',
  appName: 'MesterAI',
  freeJobLimit: 10,
  trialDays: 14,
  pricing: {
    proMonthly: 4900,
    proYearly: 44100,
    businessMonthly: 9900,
    businessYearly: 89100,
  },
} as const;
