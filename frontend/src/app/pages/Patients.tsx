import { useMemo, useState } from 'react';
import { usePADashboardContext } from '../../lib/hooks';
import { Search, FileText, Upload, Users, Building2, FileCheck, CalendarDays } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

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

  const insurers = new Set(patients.map((patient) => patient.insuranceProvider)).size;
  const withCharts = patients.filter((patient) => patient.chartUrl).length;
  const recentlyAdded = patients.filter(
    (patient) => differenceInDays(new Date(), new Date(patient.createdAt)) <= 7
  ).length;

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
            <span className="col-span-1 text-center">Chart</span>
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
                  <div className="col-span-1 h-5 bg-muted rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No patients found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((patient) => {
                const activePAs = dashboard.paRequests.filter(
                  (request) => request.patientId === patient.id && !['approved', 'denied'].includes(request.status)
                ).length;

                return (
                  <div
                    key={patient.id}
                    className="grid grid-cols-12 gap-x-3 items-center px-5 py-3 hover:bg-accent/35 transition-colors"
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="text-sm font-semibold truncate">{patient.name}</div>
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
                    <div className="col-span-1 flex justify-center">
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
