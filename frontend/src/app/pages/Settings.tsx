import { useEffect, useMemo, useState } from 'react';
import { User, Bell, Sliders, Shield, Info, Clock3, Server, Globe, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePADashboardContext } from '../../lib/hooks';
import { getPrimaryProvider } from '../../lib/dashboard';

type Section = 'profile' | 'notifications' | 'preferences' | 'security' | 'about';

const sections: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'preferences', label: 'Preferences', icon: Sliders },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'about', label: 'About', icon: Info },
];

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
      <span className="inline-block size-2 bg-foreground rounded-sm rotate-45 flex-none" />
      <div>
        <div className="text-sm font-semibold uppercase tracking-widest">{title}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-border/50 last:border-0">
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-semibold pt-2.5">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-foreground' : 'bg-muted'}`}
    >
      <span className={`inline-block size-3.5 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function useStoredState(key: string, fallback: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready && !localStorage.getItem(key)) {
      return;
    }
    if (value === '' && !localStorage.getItem(key)) {
      return;
    }
    localStorage.setItem(key, value);
  }, [key, ready, value]);

  return [value, setValue] as const;
}

function useStoredBoolean(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function Settings() {
  const dashboard = usePADashboardContext();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);
  const [sessionStartedAt] = useState(() => new Date().toISOString());

  const providerSummary = useMemo(
    () => getPrimaryProvider(dashboard.patients),
    [dashboard.patients]
  );

  const topPayer = useMemo(() => {
    const counts = dashboard.patients.reduce((accumulator, patient) => {
      accumulator.set(patient.insuranceProvider, (accumulator.get(patient.insuranceProvider) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>());

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [dashboard.patients]);

  const defaultDisplayName = providerSummary.providerName || providerSummary.practiceName || 'PriorFlow Operator';
  const defaultPractice = providerSummary.practiceName || 'No practice metadata available';
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  const [displayName, setDisplayName] = useStoredState('settings.display_name', defaultDisplayName);
  const [practiceLabel, setPracticeLabel] = useStoredState('settings.practice_label', defaultPractice);
  const [notifApprovals, setNotifApprovals] = useStoredBoolean('settings.notif_approvals', true);
  const [notifDenials, setNotifDenials] = useStoredBoolean('settings.notif_denials', true);
  const [notifInfoReq, setNotifInfoReq] = useStoredBoolean('settings.notif_info_requests', true);
  const [notifAgent, setNotifAgent] = useStoredBoolean('settings.notif_agent', true);
  const [timezone, setTimezone] = useStoredState('settings.timezone', defaultTimezone);
  const [defaultTab, setDefaultTab] = useStoredState('settings.default_tab', 'dashboard');
  const [compactMode, setCompactMode] = useStoredBoolean('settings.compact_mode', false);

  useEffect(() => {
    if (!localStorage.getItem('settings.display_name') && defaultDisplayName) {
      setDisplayName(defaultDisplayName);
    }
    if (!localStorage.getItem('settings.practice_label') && defaultPractice) {
      setPracticeLabel(defaultPractice);
    }
  }, [defaultDisplayName, defaultPractice, setDisplayName, setPracticeLabel]);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const browserLabel = `${navigator.platform} · ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'}`;

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex gap-4 px-3 lg:px-5 pb-4 bg-background min-h-0">
        <div className="w-[200px] flex-none flex flex-col gap-0.5 pt-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-left text-[11px] tracking-wider transition-colors ${
                  activeSection === section.key
                    ? 'bg-card border border-border font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="size-3.5 flex-none" />
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0 rounded border border-border bg-card overflow-hidden flex flex-col">
          {activeSection === 'profile' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Profile" sub="Derived from current chart/provider data with local overrides" />
              <div className="max-w-xl">
                <Field label="Display Name">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border"
                  />
                </Field>
                <Field label="Practice">
                  <input
                    value={practiceLabel}
                    onChange={(e) => setPracticeLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border"
                  />
                </Field>
                <Field label="Provider NPI">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    {providerSummary.providerNpi || 'Unavailable from current chart data'}
                  </div>
                </Field>
                <Field label="Patient Census">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    {dashboard.totalPatients} synced patients · {dashboard.totalPAs} PA requests
                  </div>
                </Field>
                <Field label="Top Payer">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    {topPayer || 'No payer data yet'}
                  </div>
                </Field>
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2 bg-foreground text-background rounded text-[11px] font-semibold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
                  >
                    {saved ? 'Saved ✓' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Notifications" sub="Controls the live event feed in the right rail" />
              <div className="max-w-xl">
                {[
                  { label: 'PA Approvals', sub: `${dashboard.approvedCount} approvals currently tracked`, value: notifApprovals, set: setNotifApprovals },
                  { label: 'PA Denials', sub: `${dashboard.deniedCount} denials currently tracked`, value: notifDenials, set: setNotifDenials },
                  { label: 'Info Requests', sub: `${dashboard.paRequests.filter((request) => request.status === 'more_info_needed').length} active info requests`, value: notifInfoReq, set: setNotifInfoReq },
                  { label: 'Agent Activity', sub: `${dashboard.agentRuns.length} live agent runs available`, value: notifAgent, set: setNotifAgent },
                ].map((item) => (
                  <Field key={item.label} label={item.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.sub}</span>
                      <Toggle checked={item.value} onChange={item.set} />
                    </div>
                  </Field>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Preferences" sub="Frontend settings persisted in this browser" />
              <div className="max-w-xl">
                <Field label="Timezone">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border"
                  >
                    <option value={defaultTimezone}>{defaultTimezone}</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="America/Denver">America/Denver</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </Field>
                <Field label="Default Page">
                  <select
                    value={defaultTab}
                    onChange={(e) => setDefaultTab(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="patients">Patients</option>
                    <option value="eligibility">Eligibility</option>
                    <option value="pa-requests">PA Requests</option>
                    <option value="agent-activity">Agent Activity</option>
                  </select>
                </Field>
                <Field label="Compact Mode">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Reduce spacing for dense operational review</span>
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </div>
                </Field>
                <Field label="Polling">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    Live dashboard polling every 5 seconds
                  </div>
                </Field>
                <div className="mt-6">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2 bg-foreground text-background rounded text-[11px] font-semibold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
                  >
                    {saved ? 'Saved ✓' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Security" sub="Current frontend session and backend connectivity" />
              <div className="max-w-xl">
                <Field label="Session Started">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    <Clock3 className="size-4" />
                    {new Date(sessionStartedAt).toLocaleString()}
                  </div>
                </Field>
                <Field label="Browser">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    {browserLabel}
                  </div>
                </Field>
                <Field label="API Health">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    <Server className="size-4" />
                    {dashboard.health.status === 'ok' ? 'Connected' : 'Offline'} · {dashboard.health.apiBase}
                  </div>
                </Field>
                <Field label="Last Sync">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">
                    {dashboard.lastUpdatedAt
                      ? `${formatDistanceToNow(new Date(dashboard.lastUpdatedAt), { addSuffix: true })} (${new Date(dashboard.lastUpdatedAt).toLocaleTimeString()})`
                      : 'No successful poll yet'}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="About PriorFlow" sub="Live platform metadata from the current frontend session" />
              <div className="max-w-xl">
                <Field label="Version">
                  <div className="text-sm text-muted-foreground">v{__APP_VERSION__}</div>
                </Field>
                <Field label="Frontend Mode">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="size-4" />
                    {import.meta.env.MODE}
                  </div>
                </Field>
                <Field label="API Endpoint">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="size-4" />
                    {dashboard.health.apiBase}
                  </div>
                </Field>
                <Field label="Data Snapshot">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="size-4" />
                    {dashboard.totalPatients} patients · {dashboard.totalPAs} requests · {dashboard.agentRuns.length} runs · {dashboard.eligibilityResults.length} eligibility checks
                  </div>
                </Field>
                <Field label="Agent Health">
                  <div className="text-sm text-muted-foreground">
                    {dashboard.activeAgents} running · {dashboard.completedAgentRuns} completed · {dashboard.failedAgentRuns} failed
                  </div>
                </Field>
                <Field label="Last Refresh">
                  <div className="text-sm text-muted-foreground">
                    {dashboard.lastUpdatedAt ? new Date(dashboard.lastUpdatedAt).toLocaleString() : 'Waiting for first sync'}
                  </div>
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
