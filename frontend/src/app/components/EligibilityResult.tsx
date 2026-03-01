import { EligibilityResult } from '../../lib/types';
import { CheckCircle2, XCircle, Calendar, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EligibilityResultCardProps {
  result: EligibilityResult;
}

export function EligibilityResultCard({ result }: EligibilityResultCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:border-emerald-500/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold tracking-wider">{result.patientName.toUpperCase()}</h3>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
            <Building2 className="size-3" />
            <span className="tracking-wider">{result.insuranceProvider}</span>
          </div>
        </div>
        {result.isEligible ? (
          <span className="px-2 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 tracking-[0.15em] font-semibold flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            ELIGIBLE
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[9px] bg-destructive/10 text-destructive rounded border border-destructive/20 tracking-[0.15em] font-semibold flex items-center gap-1">
            <XCircle className="size-3" />
            NOT ELIGIBLE
          </span>
        )}
      </div>
      {result.coverageDetails && (
        <p className="text-[11px] text-muted-foreground leading-relaxed tracking-wider">{result.coverageDetails}</p>
      )}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-3">
        <Calendar className="size-3" />
        <span className="tracking-wider">Checked {formatDistanceToNow(new Date(result.checkDate), { addSuffix: true })}</span>
      </div>
    </div>
  );
}
