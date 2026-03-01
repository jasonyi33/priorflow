import { useState } from 'react';
import { User, Bell, Sliders, Shield, Info } from 'lucide-react';

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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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

export function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // Profile state
  const [name, setName] = useState('Dr. Sarah Chen');
  const [email, setEmail] = useState('s.chen@westside.health');
  const [role, setRole] = useState('Attending Physician');
  const [npi, setNpi] = useState('1234567890');

  // Notification state
  const [notifApprovals, setNotifApprovals] = useState(true);
  const [notifDenials, setNotifDenials] = useState(true);
  const [notifInfoReq, setNotifInfoReq] = useState(true);
  const [notifAgent, setNotifAgent] = useState(false);

  // Preferences state
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [defaultTab, setDefaultTab] = useState('dashboard');
  const [compactMode, setCompactMode] = useState(false);

  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="flex flex-col relative w-full min-h-full">
      <div className="h-3 bg-muted shrink-0" />
      <div className="flex-1 flex gap-4 px-3 lg:px-5 pb-4 bg-background min-h-0">

        {/* ── Left: Nav ── */}
        <div className="w-[200px] flex-none flex flex-col gap-0.5 pt-1">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-left text-[11px] tracking-wider transition-colors ${
                  activeSection === s.key
                    ? 'bg-card border border-border font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="size-3.5 flex-none" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ── Right: Content ── */}
        <div className="flex-1 min-w-0 rounded border border-border bg-card overflow-hidden flex flex-col">

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Profile" sub="Your identity and clinical credentials" />
              <div className="max-w-xl">
                <Field label="Full Name">
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border" />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border" />
                </Field>
                <Field label="Role / Title">
                  <input value={role} onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border" />
                </Field>
                <Field label="Provider NPI">
                  <input value={npi} onChange={e => setNpi(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border" />
                </Field>
                <Field label="Practice">
                  <div className="px-3 py-2 bg-muted/40 border border-border rounded text-sm text-muted-foreground">Westside Medical Group</div>
                </Field>
                <div className="mt-6 flex items-center gap-3">
                  <button onClick={handleSave}
                    className="px-5 py-2 bg-foreground text-background rounded text-[11px] font-semibold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity">
                    {saved ? 'Saved ✓' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Notifications" sub="Control which in-app alerts you receive" />
              <div className="max-w-xl">
                {[
                  { label: 'PA Approvals', sub: 'Alert when a prior authorization is approved', value: notifApprovals, set: setNotifApprovals },
                  { label: 'PA Denials', sub: 'Alert when a request is denied by the payer', value: notifDenials, set: setNotifDenials },
                  { label: 'Info Requests', sub: 'Alert when additional information is required', value: notifInfoReq, set: setNotifInfoReq },
                  { label: 'Agent Activity', sub: 'Alert on agent run completions and errors', value: notifAgent, set: setNotifAgent },
                ].map(item => (
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

          {/* ── Preferences ── */}
          {activeSection === 'preferences' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Preferences" sub="Customize your dashboard experience" />
              <div className="max-w-xl">
                <Field label="Timezone">
                  <select value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border">
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                  </select>
                </Field>
                <Field label="Default Page">
                  <select value={defaultTab} onChange={e => setDefaultTab(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border">
                    <option value="dashboard">Dashboard</option>
                    <option value="patients">Patients</option>
                    <option value="pa-requests">PA Requests</option>
                  </select>
                </Field>
                <Field label="Compact Mode">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Reduce padding and spacing throughout the UI</span>
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </div>
                </Field>
                <div className="mt-6">
                  <button onClick={handleSave}
                    className="px-5 py-2 bg-foreground text-background rounded text-[11px] font-semibold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity">
                    {saved ? 'Saved ✓' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="Security" sub="Password and session management" />
              <div className="max-w-xl space-y-6">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-3">Change Password</div>
                  <div className="flex flex-col gap-3">
                    <input type="password" placeholder="Current password" className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30" />
                    <input type="password" placeholder="New password" className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30" />
                    <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30" />
                    <button onClick={handleSave} className="w-fit px-5 py-2 bg-foreground text-background rounded text-[11px] font-semibold tracking-[0.15em] uppercase hover:opacity-90 transition-opacity">
                      {saved ? 'Updated ✓' : 'Update Password'}
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-2">Active Session</div>
                  <div className="flex items-center justify-between p-3 rounded border border-border bg-muted/30">
                    <div>
                      <div className="text-xs font-semibold">Current session</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Chrome · macOS · Signed in just now</div>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] text-success">
                      <span className="size-1.5 rounded-full bg-success inline-block" />Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── About ── */}
          {activeSection === 'about' && (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <SectionHeader title="About PriorFlow" sub="Platform information and compliance" />
              <div className="max-w-xl space-y-4">
                {[
                  { label: 'Version', value: '2.4.1' },
                  { label: 'Environment', value: 'Production' },
                  { label: 'Compliance', value: 'HIPAA Compliant · SOC 2 Type II' },
                  { label: 'API Status', value: '99.9% uptime (30-day average)' },
                  { label: 'Data Region', value: 'US-West (GCP us-west1)' },
                  { label: 'Support', value: 'support@priorflow.health' },
                ].map(item => (
                  <Field key={item.label} label={item.label}>
                    <div className="text-sm text-muted-foreground">{item.value}</div>
                  </Field>
                ))}
                <div className="pt-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    PriorFlow automates prior authorization workflows using AI agents to reduce administrative burden on clinical staff and accelerate patient care approvals.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
