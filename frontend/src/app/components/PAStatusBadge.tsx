import { PAStatus } from '../../lib/types';

interface PAStatusBadgeProps {
  status: PAStatus;
}

const statusConfig: Record<PAStatus, { label: string; colors: string }> = {
  pending: { label: 'PENDING', colors: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  checking_eligibility: { label: 'CHECKING', colors: 'bg-primary/5 text-primary border-primary/10' },
  generating_request: { label: 'GENERATING', colors: 'bg-primary/5 text-primary border-primary/10' },
  submitting: { label: 'SUBMITTING', colors: 'bg-primary/5 text-primary border-primary/10' },
  approved: { label: 'APPROVED', colors: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  denied: { label: 'DENIED', colors: 'bg-destructive/10 text-destructive border-destructive/20' },
  more_info_needed: { label: 'INFO NEEDED', colors: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

export function PAStatusBadge({ status }: PAStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`px-2 py-0.5 text-[9px] rounded border tracking-[0.15em] font-semibold ${config.colors}`}>
      {config.label}
    </span>
  );
}