import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, FileText, Send, AlertCircle, Info, Activity } from 'lucide-react';
import { AgentRun, PARequest } from '../../lib/types';
import { getAgentTypeLabel } from '../../lib/dashboard';

interface StatusTimelineProps {
  request: PARequest;
  run?: AgentRun;
}

export function StatusTimeline({ request, run }: StatusTimelineProps) {
  const isFinal = ['approved', 'denied', 'more_info_needed'].includes(request.status);
  const timeline = [
    {
      id: 'created',
      label: 'Request Created',
      meta: request.submittedAt
        ? formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })
        : formatDistanceToNow(new Date(request.lastUpdated), { addSuffix: true }),
      icon: FileText,
      complete: true,
      active: !isFinal && request.status === 'pending',
    },
    {
      id: 'agent',
      label: run ? getAgentTypeLabel(run.type) : 'Agent Processing',
      meta: run
        ? `${run.status.toUpperCase()} · started ${formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}`
        : 'Awaiting linked run data',
      icon: Activity,
      complete: !!run && run.status !== 'running',
      active: !!run && run.status === 'running',
    },
    {
      id: 'submission',
      label:
        request.status === 'checking_eligibility'
          ? 'Checking Eligibility'
          : request.status === 'generating_request'
          ? 'Generating Request'
          : request.status === 'submitting'
          ? 'Submitting to Payer'
          : 'Submission Progress',
      meta: `Last updated ${formatDistanceToNow(new Date(request.lastUpdated), { addSuffix: true })}`,
      icon: request.status === 'submitting' ? Send : Clock,
      complete: isFinal || request.status === 'submitting',
      active: !isFinal && ['checking_eligibility', 'generating_request', 'submitting'].includes(request.status),
    },
    {
      id: 'decision',
      label:
        request.status === 'approved'
          ? 'Approved'
          : request.status === 'denied'
          ? 'Denied'
          : request.status === 'more_info_needed'
          ? 'More Info Needed'
          : 'Decision Pending',
      meta:
        request.status === 'denied' && request.denialReason
          ? request.denialReason
          : request.approvalCode
          ? `Authorization ${request.approvalCode}`
          : isFinal
          ? `Resolved ${formatDistanceToNow(new Date(request.lastUpdated), { addSuffix: true })}`
          : 'Waiting on payer response',
      icon:
        request.status === 'approved'
          ? CheckCircle2
          : request.status === 'denied'
          ? AlertCircle
          : request.status === 'more_info_needed'
          ? Info
          : Clock,
      complete: isFinal,
      active: isFinal,
    },
  ];

  return (
    <div className="space-y-4">
      {timeline.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === timeline.length - 1;
        const isDecision = item.id === 'decision';

        return (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center size-8 rounded-md border transition-colors ${
                  item.complete
                    ? isDecision && request.status === 'approved'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isDecision && request.status === 'denied'
                      ? 'bg-destructive border-destructive text-white'
                      : 'bg-primary border-primary text-primary-foreground'
                    : item.active
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <Icon className="size-4" />
              </div>
              {!isLast && (
                <div className={`w-0.5 h-10 ${item.complete ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className={`text-xs tracking-wider font-semibold ${item.complete || item.active ? '' : 'text-muted-foreground'}`}>
                {item.label.toUpperCase()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{item.meta}</p>
              {item.active && !item.complete && (
                <p className="text-[10px] text-emerald-600 mt-1 tracking-wider">[IN PROGRESS...]</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
