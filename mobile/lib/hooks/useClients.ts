import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';

export interface Client {
  id: string;
  master_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  tax_number: string | null;
  notes: string | null;
  jobs_count: number;
  total_revenue: number;
  created_at: string;
}

export const useClients = (search?: string) => {
  const { master } = useAuthStore();

  return useQuery({
    queryKey: ['clients', master?.id, search],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('master_id', master!.id)
        .order('name');

      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!master,
  });
};

export const useCreateClient = () => {
  const qc = useQueryClient();
  const { master } = useAuthStore();

  return useMutation({
    mutationFn: async (input: Partial<Client>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, master_id: master!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};
