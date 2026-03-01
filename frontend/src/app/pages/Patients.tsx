import { useCallback, useMemo, useState } from 'react';
import { usePADashboardContext } from '../../lib/hooks';
import { Search, FileText, Upload, Users, Building2, FileCheck, CalendarDays } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { TabFocusRail } from '../components/TabFocusRail';
import { TabFocusSignal, getFocusBucket, useStickyFocusKey } from '../../lib/focusSignals';

function age(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function Patients() {
  const dashboard = usePADashboardContext();
  const [searchTerm, setSearchTerm] = useState('');

  const patients = dashboard.patients;
  const loading = dashboard.loading;

  const filtered = useMemo(
    () =>
      patients.filter((patient) =>
        [patient.name, patient.memberId, patient.insuranceProvider, patient.practiceName, patient.providerName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [patients, searchTerm]
  );

  const activePAsByPatientId = useMemo(() => {
    const activeStatuses = new Set(['pending', 'checking_eligibility', 'generating_request', 'submitting', 'more_info_needed']);
    const counts = new Map<string, number>();
    for (const request of dashboard.paRequests) {
      if (!activeStatuses.has(request.status)) continue;
      counts.set(request.patientId, (counts.get(request.patientId) || 0) + 1);
    }
    return counts;
  }, [dashboard.paRequests]);

  const sortedByCreated = useMemo(
    () =>
      [...patients].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [patients]
  );

  const insurers = new Set(patients.map((patient) => patient.insuranceProvider)).size;
  const withCharts = patients.filter((patient) => patient.chartUrl).length;
  const recentlyAdded = patients.filter(
    (patient) => differenceInDays(new Date(), new Date(patient.createdAt)) <= 7
  ).length;

  const focusSignalByPatientId = useMemo(() => {
    const map = new Map<string, TabFocusSignal>();
    const now = Date.now();

    for (const patient of sortedByCreated) {
      const createdMs = new Date(patient.createdAt).getTime();
      const activeCount = activePAsByPatientId.get(patient.id) || 0;
      const missingChartRecently = !patient.chartUrl && now - createdMs <= 24 * 60 * 60 * 1000;

      if (missingChartRecently) {
        map.set(patient.id, {
          key: patient.id,
          title: 'New Patient Added - Chart Missing',
          message: `${patient.name} was registered recently and still needs chart attachment.`,
          timestamp: patient.createdAt,
          severity: 'high',
          actionLabel: 'Reveal Focus Patient',
        });
        continue;
      }

      if (activeCount > 0) {
        map.set(patient.id, {
          key: patient.id,
          title: 'New Patient With Active Workflow',
          message: `${patient.name} currently has ${activeCount} in-flight prior authorization item${activeCount > 1 ? 's' : ''}.`,
          timestamp: patient.createdAt,
          severity: 'medium',
          actionLabel: 'Reveal Focus Patient',
        });
        continue;
      }

      map.set(patient.id, {
        key: patient.id,
        title: 'Latest Registration',
        message: `${patient.name} is the newest patient added to the registry.`,
        timestamp: patient.createdAt,
        severity: 'low',
        actionLabel: 'Reveal Focus Patient',
      });
    }

    return map;
  }, [activePAsByPatientId, sortedByCreated]);

  const focusCandidate = useMemo(() => {
    const now = Date.now();
    const high = sortedByCreated.find((patient) => {
      const createdMs = new Date(patient.createdAt).getTime();
      return !patient.chartUrl && now - createdMs <= 24 * 60 * 60 * 1000;
    });
    if (high) return focusSignalByPatientId.get(high.id) || null;

    const medium = sortedByCreated.find((patient) => (activePAsByPatientId.get(patient.id) || 0) > 0);
    if (medium) return focusSignalByPatientId.get(medium.id) || null;

    const low = sortedByCreated[0];
    if (!low) return null;
    return focusSignalByPatientId.get(low.id) || null;
  }, [activePAsByPatientId, focusSignalByPatientId, sortedByCreated]);

  const stickyFocusKey = useStickyFocusKey(
    focusCandidate ? { key: focusCandidate.key, severity: focusCandidate.severity } : null
  );

  const activeFocusSignal = (stickyFocusKey && focusSignalByPatientId.get(stickyFocusKey)) || focusCandidate;

  const scrollToRow = useCallback((key: string) => {
    const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const row = document.querySelector(`[data-focus-key="${escaped}"]`) as HTMLElement | null;
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const handleRevealFocus = useCallback(() => {
    if (!activeFocusSignal) return;
    setSearchTerm('');
    window.setTimeout(() => scrollToRow(activeFocusSignal.key), 50);
  }, [activeFocusSignal, scrollToRow]);

  const stats = [
    { label: 'Total Patients', value: String(patients.length), sub: 'on record', icon: Users },
    { label: 'Insurers', value: String(insurers), sub: 'distinct payers', icon: Building2 },
    { label: 'With Charts', value: String(withCharts), sub: `${patients.length - withCharts} missing chart`, icon: FileCheck },
    { label: 'Added This Week', value: String(recentlyAdded), sub: 'last 7 days', icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex flex-col gap-4 px-3 lg:px-5 pb-4 bg-background">
        <TabFocusRail
          signal={activeFocusSignal}
          onAction={handleRevealFocus}
          disabled={!activeFocusSignal}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-border bg-card px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">{stat.label}</div>
                <stat.icon className="size-4 text-muted-foreground/45" />
              </div>
              <div className="text-5xl font-bold leading-none mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>
                {loading ? '—' : stat.value}
              </div>
              <div className="text-xs text-muted-foreground/70">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
              <span className="text-sm font-semibold uppercase tracking-widest">Patient Registry</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50" />
                <input
                  placeholder="Search by name, ID, insurer, or practice…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:border-foreground/30 w-72"
                />
              </div>
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider whitespace-nowrap">
                {loading ? '…' : `${filtered.length} of ${patients.length}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 border-b border-border/50">
            <span className="col-span-3">Patient</span>
            <span className="col-span-2">Member ID</span>
            <span className="col-span-2">Insurance</span>
            <span className="col-span-2">Provider</span>
            <span className="col-span-1 text-center">Age</span>
            <span className="col-span-1 text-center">Active PAs</span>
            <span className="col-span-1 text-right">Chart</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-x-3 px-5 py-3 items-center">
                  <div className="col-span-3 h-4 bg-muted rounded animate-pulse" />
                  <div className="col-span-2 h-3 bg-muted rounded animate-pulse" />
                  <div className="col-span-2 h-3 bg-muted rounded animate-pulse" />
                  <div className="col-span-2 h-3 bg-muted rounded animate-pulse" />
                  <div className="col-span-1 h-3 bg-muted rounded animate-pulse mx-auto" />
                  <div className="col-span-1 h-5 bg-muted rounded animate-pulse mx-auto" />
                  <div className="col-span-1 h-5 bg-muted rounded animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No patients found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((patient) => {
                const activePAs = activePAsByPatientId.get(patient.id) || 0;
                const isFocus = activeFocusSignal?.key === patient.id;
                const focusBucket = isFocus ? getFocusBucket(activeFocusSignal.timestamp) : 'stale';

                return (
                  <div
                    key={patient.id}
                    data-focus-key={patient.id}
                    className={`grid grid-cols-12 gap-x-3 items-center px-5 py-3 transition-colors ${
                      isFocus
                        ? focusBucket === 'hot'
                          ? 'border-l-2 border-primary bg-primary/10 hover:bg-primary/12'
                          : 'border-l-2 border-primary/40 bg-primary/5 hover:bg-primary/8'
                        : 'hover:bg-accent/35'
                    }`}
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                        <span className="truncate">{patient.name}</span>
                        {isFocus && (
                          <span className={`px-1.5 py-0.5 text-[9px] rounded border font-semibold uppercase tracking-wider ${
                            focusBucket === 'hot'
                              ? 'bg-primary/20 text-primary border-primary/35'
                              : 'bg-primary/10 text-primary border-primary/25'
                          }`}>
                            focus
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 truncate">
                        DOB {new Date(patient.dateOfBirth).toLocaleDateString()} · Added{' '}
                        {formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground truncate">
                      {patient.memberId}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <div className="text-sm truncate">{patient.insuranceProvider}</div>
                      {patient.planName && (
                        <div className="text-[10px] text-muted-foreground/55 truncate">{patient.planName}</div>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <div className="text-sm truncate">{patient.providerName || '—'}</div>
                      {patient.practiceName && (
                        <div className="text-[10px] text-muted-foreground/55 truncate">{patient.practiceName}</div>
                      )}
                    </div>
                    <div className="col-span-1 text-sm text-muted-foreground text-center tabular-nums">
                      {age(patient.dateOfBirth)}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {activePAs > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] bg-warning/10 text-warning border border-warning/30 rounded font-semibold uppercase tracking-wide">
                          {activePAs}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-success/10 text-success border border-success/30 rounded font-semibold uppercase tracking-wide">
                          clear
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {patient.chartUrl ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/8 text-primary border border-primary/20 rounded font-semibold">
                          <FileText className="size-2.5" />
                          ON FILE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted text-muted-foreground border border-border rounded font-semibold">
                          <Upload className="size-2.5" />
                          MISSING
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
