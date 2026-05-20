import React from 'react';
import { Badge } from '@/components/ui/Badge';
import type { JobStatus } from '@/lib/hooks/useJobs';

const STATUS_MAP: Record<JobStatus, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' | 'error' }> = {
  new: { label: 'Új', variant: 'default' },
  scheduled: { label: 'Tervezett', variant: 'accent' },
  in_progress: { label: 'Folyamatban', variant: 'warning' },
  done: { label: 'Kész', variant: 'success' },
  invoiced: { label: 'Számlázva', variant: 'accent' },
  paid: { label: 'Fizetve', variant: 'success' },
  cancelled: { label: 'Törölve', variant: 'error' },
};

export const JobStatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const { label, variant } = STATUS_MAP[status] ?? STATUS_MAP.new;
  return <Badge label={label} variant={variant} />;
};
