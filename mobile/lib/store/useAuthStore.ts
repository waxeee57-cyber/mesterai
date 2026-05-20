import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface Master {
  id: string;
  auth_id: string;
  name: string;
  trade: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  tax_number: string | null;
  tax_type: string;
  subscription_tier: 'free' | 'pro' | 'business';
  trial_expires_at: string | null;
  jobs_this_month: number;
}

interface AuthState {
  master: Master | null;
  isLoading: boolean;
  setMaster: (master: Master | null) => void;
  loadMaster: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  master: null,
  isLoading: true,

  setMaster: (master) => set({ master }),

  loadMaster: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ master: null, isLoading: false }); return; }

      const { data } = await supabase
        .from('masters')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      set({ master: data ?? null, isLoading: false });
    } catch {
      set({ master: null, isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ master: null });
  },
}));
