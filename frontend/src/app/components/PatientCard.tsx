import { Patient } from '../../lib/types';
import { FileText, Calendar, CreditCard, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <div 
      className={`bg-card rounded-lg border border-border p-4 hover:border-emerald-500/30 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold tracking-wider">{patient.name.toUpperCase()}</h3>
        </div>
        {patient.chartUrl && (
          <span className="px-2 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 tracking-[0.15em] font-semibold flex items-center gap-1">
            <FileText className="size-2.5" />
            CHART
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="size-3" />
          <span className="tracking-wider">DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CreditCard className="size-3" />
          <span className="tracking-wider">{patient.memberId}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Building2 className="size-3" />
          <span className="tracking-wider">{patient.insuranceProvider}</span>
        </div>
        <div className="text-[10px] text-muted-foreground/60 pt-2 tracking-wider">
          Added {formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
