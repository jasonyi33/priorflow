import { PARequest } from '../../lib/types';
import { PAStatusBadge } from './PAStatusBadge';
import { Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PARequestCardProps {
  request: PARequest;
  onClick?: () => void;
}

export function PARequestCard({ request, onClick }: PARequestCardProps) {
  return (
    <div 
      className={`bg-card rounded-lg border border-border p-4 hover:border-emerald-500/30 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="space-y-1 flex-1">
          <h3 className="text-xs font-bold tracking-wider">{request.patientName.toUpperCase()}</h3>
          <p className="text-[11px] text-muted-foreground tracking-wider">{request.procedureName}</p>
        </div>
        <PAStatusBadge status={request.status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <FileText className="size-3" />
          <span className="tracking-wider">Code: {request.procedureCode}</span>
        </div>

        {request.approvalCode && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-600">
            <CheckCircle className="size-3" />
            <span className="tracking-wider font-semibold">Auth: {request.approvalCode}</span>
          </div>
        )}

        {request.denialReason && (
          <div className="flex items-start gap-2 text-[11px] text-destructive">
            <AlertCircle className="size-3 mt-0.5" />
            <span className="tracking-wider">{request.denialReason}</span>
          </div>
        )}

        <div className="pt-2 space-y-1">
          {request.submittedAt && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <Calendar className="size-3" />
              <span className="tracking-wider">Submitted {formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })}</span>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground/60 tracking-wider">
            Updated {formatDistanceToNow(new Date(request.lastUpdated), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}
