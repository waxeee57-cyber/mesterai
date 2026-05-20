import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/useAuthStore';

export type JobStatus = 'new' | 'scheduled' | 'in_progress' | 'done' | 'invoiced' | 'paid' | 'cancelled';

export interface Job {
  id: string;
  master_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: JobStatus;
  trade: string | null;
  address: string | null;
  city: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  photos: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  notes: string | null;
  ai_transcript: string | null;
  created_at: string;
  clients?: { name: string; phone: string | null } | null;
}

export const useJobs = (status?: JobStatus) => {
  const { master } = useAuthStore();

  return useQuery({
    queryKey: ['jobs', master?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*, clients(name, phone)')
        .eq('master_id', master!.id)
        .order('scheduled_at', { ascending: true });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!master,
  });
};

export const useTodayJobs = () => {
  const { master } = useAuthStore();
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  return useQuery({
    queryKey: ['jobs', 'today', master?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, clients(name, phone)')
        .eq('master_id', master!.id)
        .gte('scheduled_at', start)
        .lte('scheduled_at', end)
        .order('scheduled_at');
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!master,
  });
};

export const useUpdateJobStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'done') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('jobs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
};
