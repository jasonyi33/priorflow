import { useEffect, useState } from 'react';

export type FocusSeverity = 'high' | 'medium' | 'low';
export type FocusBucket = 'hot' | 'recent' | 'stale';

export interface TabFocusSignal {
  key: string;
  title: string;
  message: string;
  timestamp?: string;
  severity: FocusSeverity;
  actionLabel: string;
}

const FOCUS_SEVERITY_RANK: Record<FocusSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export const DEFAULT_FOCUS_HOLD_MS = 20_000;

export function getFocusBucket(timestamp?: string): FocusBucket {
  if (!timestamp) return 'stale';
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'hot';
  if (ageMs <= 90_000) return 'hot';
  if (ageMs <= 15 * 60_000) return 'recent';
  return 'stale';
}

function shouldReplaceFocus(
  current: { key: string; severity: FocusSeverity; pinnedAt: number },
  incoming: { key: string; severity: FocusSeverity },
  holdMs: number
): boolean {
  if (incoming.key === current.key) {
    return incoming.severity !== current.severity;
  }

  if (FOCUS_SEVERITY_RANK[incoming.severity] > FOCUS_SEVERITY_RANK[current.severity]) {
    return true;
  }

  return Date.now() - current.pinnedAt >= holdMs;
}

export function useStickyFocusKey(
  candidate: { key: string; severity: FocusSeverity } | null,
  holdMs: number = DEFAULT_FOCUS_HOLD_MS
): string | null {
  const [sticky, setSticky] = useState<{ key: string; severity: FocusSeverity; pinnedAt: number } | null>(null);

  useEffect(() => {
    if (!candidate) {
      setSticky(null);
      return;
    }

    if (!sticky) {
      setSticky({ ...candidate, pinnedAt: Date.now() });
      return;
    }

    if (shouldReplaceFocus(sticky, candidate, holdMs)) {
      setSticky({ ...candidate, pinnedAt: Date.now() });
    }
  }, [candidate, holdMs, sticky]);

  return sticky?.key ?? candidate?.key ?? null;
}

