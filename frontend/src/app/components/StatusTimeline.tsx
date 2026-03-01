import { PARequest } from '../../lib/types';
import { CheckCircle2, Clock, FileText, Send, AlertCircle, Info } from 'lucide-react';

interface StatusTimelineProps {
  request: PARequest;
}

export function StatusTimeline({ request }: StatusTimelineProps) {
  const timeline = [
    {
      status: 'pending',
      label: 'Request Created',
      icon: FileText,
      completed: true,
    },
    {
      status: 'checking_eligibility',
      label: 'Checking Eligibility',
      icon: Clock,
      completed: ['checking_eligibility', 'generating_request', 'submitting', 'approved', 'denied', 'more_info_needed'].includes(request.status),
      active: request.status === 'checking_eligibility',
    },
    {
      status: 'generating_request',
      label: 'Generating Request',
      icon: FileText,
      completed: ['generating_request', 'submitting', 'approved', 'denied', 'more_info_needed'].includes(request.status),
      active: request.status === 'generating_request',
    },
    {
      status: 'submitting',
      label: 'Submitting to Payer',
      icon: Send,
      completed: ['submitting', 'approved', 'denied', 'more_info_needed'].includes(request.status),
      active: request.status === 'submitting',
    },
    {
      status: 'final',
      label: request.status === 'approved' ? 'Approved' : request.status === 'denied' ? 'Denied' : 'More Info Needed',
      icon: request.status === 'approved' ? CheckCircle2 : request.status === 'denied' ? AlertCircle : Info,
      completed: ['approved', 'denied', 'more_info_needed'].includes(request.status),
      active: ['approved', 'denied', 'more_info_needed'].includes(request.status),
    },
  ];

  return (
    <div className="space-y-4">
      {timeline.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === timeline.length - 1;

        return (
          <div key={item.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center size-8 rounded-md border transition-colors ${
                  item.completed
                    ? request.status === 'approved' && item.status === 'final'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : request.status === 'denied' && item.status === 'final'
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
                <div
                  className={`w-0.5 h-8 ${
                    item.completed ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className={`text-xs tracking-wider font-semibold ${item.completed || item.active ? '' : 'text-muted-foreground'}`}>
                {item.label.toUpperCase()}
              </p>
              {item.active && !item.completed && (
                <p className="text-[10px] text-emerald-600 mt-0.5 tracking-wider">[IN PROGRESS...]</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}