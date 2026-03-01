import { formatDistanceToNow } from 'date-fns';
import { Bolt, Clock3 } from 'lucide-react';
import { FocusBucket, TabFocusSignal, getFocusBucket } from '../../lib/focusSignals';

function toneClass(signal: TabFocusSignal, bucket: FocusBucket): string {
  if (signal.severity === 'high') {
    return bucket === 'hot'
      ? 'border-destructive/45 bg-destructive/10 shadow-sm'
      : 'border-destructive/30 bg-destructive/5';
  }
  if (signal.severity === 'medium') {
    return bucket === 'hot'
      ? 'border-primary/45 bg-primary/10 shadow-sm'
      : 'border-primary/30 bg-primary/5';
  }
  return bucket === 'hot'
    ? 'border-warning/45 bg-warning/10 shadow-sm'
    : 'border-warning/30 bg-warning/5';
}

interface TabFocusRailProps {
  signal: TabFocusSignal | null;
  onAction?: () => void;
  disabled?: boolean;
}

export function TabFocusRail({ signal, onAction, disabled }: TabFocusRailProps) {
  if (!signal) {
    return (
      <div className="rounded border border-border bg-card px-5 py-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/65 mb-1">Tab Focus</div>
        <div className="text-sm text-muted-foreground">No recent operational changes yet.</div>
      </div>
    );
  }

  const bucket = getFocusBucket(signal.timestamp);

  return (
    <div className={`rounded border-2 px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${toneClass(signal, bucket)}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`size-2.5 rounded-full mt-1.5 flex-none ${
          signal.severity === 'high'
            ? 'bg-destructive'
            : signal.severity === 'medium'
            ? 'bg-primary'
            : 'bg-warning'
        } ${bucket === 'hot' ? 'animate-pulse' : ''}`} />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">Tab Focus</div>
          <div className="text-sm font-semibold truncate">{signal.title}</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{signal.message}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border bg-card/70 uppercase tracking-wider font-semibold">
          <Bolt className="size-3" />
          {bucket === 'hot' ? 'live now' : bucket}
        </span>
        {signal.timestamp && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border bg-card/70 uppercase tracking-wider font-semibold">
            <Clock3 className="size-3" />
            {formatDistanceToNow(new Date(signal.timestamp), { addSuffix: true })}
          </span>
        )}
        {onAction && (
          <button
            onClick={onAction}
            disabled={disabled}
            className="px-3 py-1.5 text-[10px] rounded border border-border bg-card hover:bg-accent uppercase tracking-wider font-semibold disabled:opacity-40"
          >
            {signal.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
