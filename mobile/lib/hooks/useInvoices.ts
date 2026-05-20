import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';

export interface Invoice {
  id: string;
  master_id: string;
  client_id: string | null;
  job_id: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  payment_method: string;
  notes: string | null;
  total_net: number | null;
  total_vat: number | null;
  total_gross: number | null;
  paid_at: string | null;
  nav_id: string | null;
  nav_status: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
}

export const useInvoices = () => {
  const { master } = useAuthStore();

  return useQuery({
    queryKey: ['invoices', master?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .eq('master_id', master!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!master,
  });
};
