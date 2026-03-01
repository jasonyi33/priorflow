import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PriorFlowLogo } from '../components/priorflow-logo';
import {
  ArrowRight, CheckCircle2, Clock, FileText, TrendingUp, Shield,
  Zap, Brain, Activity, ChevronRight, Menu, X
} from 'lucide-react';

// ── Intersection observer hook for fade-in animations ──
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className}
      style={{ transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(24px)' }}>
      {children}
    </div>
  );
}

// ── Section label (01 | PROBLEM style) ──
function SectionLabel({ n, label, light = false }: { n: string; label: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-8 ${light ? 'opacity-50' : 'opacity-40'}`}>
      <span className="text-[11px] font-semibold tracking-[0.25em] uppercase">{n}</span>
      <span className="w-6 h-px bg-current" />
      <span className="text-[11px] font-semibold tracking-[0.25em] uppercase">{label}</span>
    </div>
  );
}

// ── Pipeline step (for How It Works) ──
function PipelineStep({ n, title, desc, icon: Icon }: { n: string; title: string; desc: string; icon: React.ElementType }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center size-10 rounded border border-white/10 bg-white/5 flex-none">
          <Icon className="size-4 text-white/60" />
        </div>
        <div className="w-px flex-1 bg-white/10 mt-3" />
      </div>
      <div className="pb-10">
        <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-1.5">{n}</div>
        <div className="text-base font-semibold mb-2">{title}</div>
        <div className="text-sm text-white/50 leading-relaxed max-w-xs">{desc}</div>
      </div>
    </div>
  );
}

// ── Feature card ──
function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="p-6 rounded border border-[oklch(0.835_0.024_78)] bg-[oklch(0.980_0.015_80)] hover:border-[oklch(0.700_0.030_78)] transition-colors group">
      <div className="flex items-center justify-center size-9 rounded bg-[oklch(0.944_0.026_78)] mb-4 group-hover:bg-[oklch(0.920_0.030_78)] transition-colors">
        <Icon className="size-4 text-[oklch(0.07_0.006_60)]/60" />
      </div>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="text-[13px] text-[oklch(0.38_0.016_70)] leading-relaxed">{desc}</div>
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const baseFont = { fontFamily: '"Playfair Display", "Georgia", serif' };

  return (
    <div style={{ ...baseFont, fontVariantNumeric: 'lining-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
      className="min-h-screen bg-[oklch(0.07_0.006_60)] text-white">

      {/* ══════════════════════════════════════════ NAV ══════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[oklch(0.07_0.006_60)]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PriorFlowLogo className="size-7 text-white" />
            <span className="text-base font-bold tracking-tight">PriorFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50">
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#impact" className="hover:text-white transition-colors">Impact</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/signin')}
              className="px-4 py-2 text-[12px] font-semibold tracking-[0.1em] uppercase text-white/60 hover:text-white transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/signin')}
              className="px-4 py-2 text-[12px] font-semibold tracking-[0.1em] uppercase bg-white text-[oklch(0.07_0.006_60)] rounded hover:bg-white/90 transition-colors flex items-center gap-1.5">
              Get Started <ArrowRight className="size-3" />
            </button>
          </div>
          <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 px-6 py-4 flex flex-col gap-4 text-[13px] text-white/60">
            <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <button onClick={() => navigate('/signin')} className="text-left">Sign In</button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════ HERO ══════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col justify-center pt-24 pb-20 px-6 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Warm glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, oklch(0.70 0.08 75 / 0.06) 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto w-full">
          <div className="max-w-3xl">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] text-white/50 tracking-[0.15em] uppercase mb-8">
                <span className="size-1.5 rounded-full bg-[oklch(0.70_0.08_78)]" />
                AI-Powered Prior Authorization
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
                Prior auth,<br />
                <span style={{ color: 'oklch(0.80 0.06 78)' }}>handled end&#8209;to&#8209;end</span><br />
                by AI.
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-lg md:text-xl text-white/45 leading-relaxed mb-10 max-w-xl">
                PriorFlow's autonomous agent reads clinical documentation, verifies eligibility, and submits prior authorization requests — reducing 14 hours of weekly physician overhead to minutes.
              </p>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={() => navigate('/signin')}
                  className="px-6 py-3 bg-white text-[oklch(0.07_0.006_60)] rounded text-[13px] font-semibold tracking-[0.1em] uppercase hover:bg-white/90 transition-colors flex items-center gap-2">
                  Start Free Trial <ArrowRight className="size-4" />
                </button>
                <button onClick={() => navigate('/app')}
                  className="px-6 py-3 border border-white/15 rounded text-[13px] font-semibold tracking-[0.1em] uppercase text-white/60 hover:text-white hover:border-white/30 transition-colors flex items-center gap-2">
                  View Dashboard <ChevronRight className="size-4" />
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Dashboard preview */}
          <FadeIn delay={450} className="mt-16">
            <div className="rounded-lg border border-white/10 bg-white/3 overflow-hidden shadow-2xl"
              style={{ background: 'oklch(0.10 0.006 60)' }}>
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/3">
                <span className="size-2.5 rounded-full bg-white/10" />
                <span className="size-2.5 rounded-full bg-white/10" />
                <span className="size-2.5 rounded-full bg-white/10" />
                <div className="flex-1 mx-4 h-6 rounded bg-white/5 flex items-center px-3">
                  <span className="text-[11px] text-white/20 tracking-wider">app.priorflow.health/dashboard</span>
                </div>
              </div>
              {/* Mock dashboard content */}
              <div className="p-6 grid grid-cols-12 gap-4 min-h-[280px]">
                {/* Sidebar mock */}
                <div className="col-span-2 space-y-2">
                  <div className="h-5 bg-white/8 rounded w-3/4" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${60 + i * 5}%` }} />
                  ))}
                </div>
                {/* Main area mock */}
                <div className="col-span-7 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {['87%', '14', '3', '6h'].map((v, i) => (
                      <div key={i} className="rounded border border-white/8 bg-white/3 p-2">
                        <div className="text-[10px] text-white/25 mb-1">metric</div>
                        <div className="text-lg font-bold text-white/70">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded border border-white/8 bg-white/3 p-3 h-32 flex flex-col justify-between">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider">PA Pipeline</div>
                    <div className="flex items-end gap-2">
                      {[40, 65, 30, 80, 55, 70, 45, 90].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Right panel mock */}
                <div className="col-span-3 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded border border-white/8 bg-white/3 p-2 space-y-1">
                      <div className="h-2.5 bg-white/10 rounded w-4/5" />
                      <div className="h-2 bg-white/5 rounded w-3/5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 01 | PROBLEM ══════════════════════════════════════════ */}
      <section className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionLabel n="01" label="The Problem" light />
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <FadeIn delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Prior auth is breaking healthcare.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed">
                Insurance companies require prior authorization for thousands of procedures — creating an administrative gauntlet that delays care, consumes clinical time, and costs the healthcare system billions annually.
              </p>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="space-y-5">
                {[
                  { stat: '14 hrs', label: 'per physician per week spent on PA paperwork', icon: Clock },
                  { stat: '93%', label: 'of physicians report delays in care due to PA requirements', icon: Activity },
                  { stat: '$3.2B', label: 'annual administrative cost of PA burden in the US', icon: TrendingUp },
                  { stat: '28 days', label: 'average wait time for a PA decision from major payers', icon: FileText },
                ].map(({ stat, label, icon: Icon }) => (
                  <div key={stat} className="flex items-start gap-4 p-4 rounded border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
                    <Icon className="size-4 text-[oklch(0.70_0.08_78)] mt-0.5 flex-none" />
                    <div>
                      <div className="text-2xl font-bold mb-0.5" style={{ color: 'oklch(0.80 0.06 78)' }}>{stat}</div>
                      <div className="text-[13px] text-white/40 leading-snug">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 02 | SOLUTION ══════════════════════════════════════════ */}
      <section id="platform" className="py-28 px-6 border-t border-white/5" style={{ background: 'oklch(0.095 0.007 60)' }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionLabel n="02" label="The Solution" light />
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4 max-w-2xl">
              An autonomous agent that does the work.
            </h2>
            <p className="text-white/45 text-lg leading-relaxed max-w-xl mb-16">
              PriorFlow embeds AI directly into the prior authorization workflow — from reading clinical notes to submitting to payer portals — eliminating manual steps entirely.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Reads Your Documentation', desc: 'Upload any clinical PDF — referral notes, chart documentation, imaging reports. The agent extracts all relevant clinical data automatically.', n: '01', icon: FileText },
              { title: 'Reasons Like a Clinician', desc: 'PriorFlow\'s AI understands ICD-10 codes, CPT procedures, and payer-specific medical necessity criteria to build the strongest possible case.', n: '02', icon: Brain },
              { title: 'Submits & Tracks', desc: 'The agent interfaces directly with payer portals to submit requests and monitor status in real time — surfacing alerts only when your attention is needed.', n: '03', icon: CheckCircle2 },
            ].map(({ title, desc, n, icon: Icon }) => (
              <FadeIn key={title} delay={parseInt(n) * 100}>
                <div className="p-6 rounded border border-white/8 bg-white/3 h-full hover:bg-white/5 transition-colors">
                  <div className="text-[10px] tracking-[0.2em] text-white/25 uppercase mb-4">{n}</div>
                  <div className="flex items-center justify-center size-10 rounded border border-white/10 bg-white/5 mb-4">
                    <Icon className="size-4 text-[oklch(0.70_0.08_78)]" />
                  </div>
                  <div className="text-base font-semibold mb-3">{title}</div>
                  <div className="text-[13px] text-white/40 leading-relaxed">{desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 03 | HOW IT WORKS ══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionLabel n="03" label="How It Works" light />
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <FadeIn delay={100}>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                  From upload to authorization in minutes.
                </h2>
                <p className="text-white/45 text-lg leading-relaxed mb-12">
                  The entire prior authorization lifecycle — what used to take days of back-and-forth — handled automatically by the PriorFlow agent.
                </p>
              </FadeIn>
              <FadeIn delay={200}>
                <div>
                  <PipelineStep n="01" title="Upload Clinical Documentation" desc="Drag and drop a PDF — referral, chart notes, or order. No template required." icon={FileText} />
                  <PipelineStep n="02" title="AI Reads & Extracts" desc="The agent parses patient demographics, diagnosis codes, procedure codes, and clinical justification." icon={Brain} />
                  <PipelineStep n="03" title="Eligibility Verified" desc="Insurance coverage is confirmed in real time before any request is submitted." icon={Shield} />
                  <PipelineStep n="04" title="PA Submitted to Payer" desc="A complete, payer-optimized prior authorization package is submitted automatically." icon={Zap} />
                  <div className="flex gap-5">
                    <div className="flex items-center justify-center size-10 rounded border border-white/10 bg-white/5 flex-none">
                      <CheckCircle2 className="size-4 text-[oklch(0.65_0.15_145)]" />
                    </div>
                    <div>
                      <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-1.5">05</div>
                      <div className="text-base font-semibold mb-2">Approval Delivered</div>
                      <div className="text-sm text-white/50 leading-relaxed max-w-xs">Authorization codes returned, results surfaced in the dashboard. Your team notified instantly.</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
            {/* Live agent log mockup */}
            <FadeIn delay={300}>
              <div className="rounded border border-white/8 bg-[oklch(0.095_0.007_60)] overflow-hidden sticky top-28">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <Activity className="size-3.5 text-white/30" />
                  <span className="text-[11px] tracking-[0.15em] text-white/30 uppercase">Agent Activity Log</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[oklch(0.65_0.15_145)]">
                    <span className="size-1.5 rounded-full bg-[oklch(0.65_0.15_145)] animate-pulse" />Live
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { t: '09:41:02', msg: 'PDF received — 4 pages', done: true },
                    { t: '09:41:03', msg: 'Extracting patient: Sarah Johnson, DOB 1982-04-15', done: true },
                    { t: '09:41:04', msg: 'Procedure identified: CPT 72148 — MRI Lumbar Spine', done: true },
                    { t: '09:41:06', msg: 'Diagnosis: M54.4 — Lumbago with sciatica', done: true },
                    { t: '09:41:08', msg: 'Eligibility check → Blue Cross Blue Shield', done: true },
                    { t: '09:41:10', msg: 'Coverage confirmed — PPO Plan, active', done: true },
                    { t: '09:41:12', msg: 'Generating PA package for BCBS portal…', done: true },
                    { t: '09:41:18', msg: 'Submitting to payer portal…', active: true },
                    { t: '09:41:xx', msg: 'Awaiting payer response…', pending: true },
                  ].map(({ t, msg, done, active, pending }) => (
                    <div key={t} className={`flex items-start gap-3 text-[12px] ${pending ? 'opacity-20' : active ? 'opacity-100' : 'opacity-50'}`}>
                      <span className="text-white/30 text-[10px] w-16 flex-none pt-px">{t}</span>
                      <div className={`size-1.5 rounded-full flex-none mt-1.5 ${done ? 'bg-[oklch(0.65_0.15_145)]' : active ? 'bg-[oklch(0.70_0.08_78)] animate-pulse' : 'bg-white/20'}`} />
                      <span className={active ? 'text-white' : 'text-white/60'}>{msg}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-[oklch(0.70_0.08_78)] animate-pulse" />
                  <span className="text-[11px] text-white/30">Agent running · step 8 of 9</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 04 | FEATURES ══════════════════════════════════════════ */}
      <section id="features" className="py-28 px-6 border-t border-white/5"
        style={{ background: 'oklch(0.961 0.021 82)', color: 'oklch(0.07 0.006 60)' }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="flex items-center gap-3 mb-8 opacity-40">
              <span className="text-[11px] font-semibold tracking-[0.25em] uppercase">04</span>
              <span className="w-6 h-px bg-current" />
              <span className="text-[11px] font-semibold tracking-[0.25em] uppercase">Platform Features</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Built for the complexity of healthcare.
            </h2>
            <p className="text-[oklch(0.38_0.016_70)] text-lg leading-relaxed max-w-xl mb-14">
              Every feature designed around the real workflows of clinical teams managing prior authorization at scale.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: 'Clinical AI Reasoning', desc: 'Understands medical necessity criteria, payer policies, and ICD/CPT semantics — not just text extraction.' },
              { icon: Shield, title: 'Real-Time Eligibility', desc: 'Instant insurance verification before any submission, catching coverage gaps before they cause denials.' },
              { icon: Zap, title: 'Autonomous Submission', desc: 'Interfaces directly with payer portals. No manual form-filling. No faxes. No phone holds.' },
              { icon: Activity, title: 'Live Pipeline View', desc: 'Track every PA request in real time — from eligibility check through payer decision — in one unified dashboard.' },
              { icon: FileText, title: 'Document Intelligence', desc: 'Upload any clinical PDF. The agent reads referrals, chart notes, imaging reports, and lab results without templates.' },
              { icon: TrendingUp, title: 'Denial Analytics', desc: 'Identify why requests get denied, surface patterns, and improve submission quality over time with AI insights.' },
              { icon: CheckCircle2, title: 'Audit-Ready Records', desc: 'Every decision, every log entry, every submission timestamped and stored for compliance and peer review.' },
              { icon: Clock, title: 'Smart Follow-Up', desc: 'The agent monitors pending decisions and automatically follows up with payers when responses are overdue.' },
              { icon: ArrowRight, title: 'EHR Agnostic', desc: 'Works alongside any EHR system. No integration required — just upload the clinical document and go.' },
            ].map(f => (
              <FadeIn key={f.title} delay={50}>
                <FeatureCard {...f} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ 05 | IMPACT ══════════════════════════════════════════ */}
      <section id="impact" className="py-28 px-6 border-t border-white/5"
        style={{ background: 'oklch(0.095 0.007 60)' }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionLabel n="05" label="Impact" light />
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-14 max-w-2xl">
              Measurable outcomes from day one.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: '87%', label: 'First-pass approval rate', sub: 'vs 67% industry average' },
              { value: '6 min', label: 'Average PA turnaround', sub: 'vs 14+ days manually' },
              { value: '14 hrs', label: 'Weekly time saved', sub: 'per physician per week' },
              { value: '99.9%', label: 'Platform uptime', sub: 'HIPAA compliant infrastructure' },
            ].map(({ value, label, sub }) => (
              <FadeIn key={value} delay={100}>
                <div className="p-5 rounded border border-white/8 bg-white/3">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'oklch(0.80 0.06 78)' }}>{value}</div>
                  <div className="text-sm font-semibold mb-1">{label}</div>
                  <div className="text-[12px] text-white/30">{sub}</div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={200}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { quote: '"PriorFlow cut our PA backlog from 3 weeks to same-day. Our care coordinators now spend their time with patients, not on hold with insurance."', role: 'Medical Director, Regional Health System' },
                { quote: '"The clinical reasoning is impressive — it catches documentation gaps before submission, which has dramatically improved our approval rates."', role: 'VP Operations, Multi-Specialty Practice' },
                { quote: '"Setup took an afternoon. Within the first week, the agent had processed 40 PA requests without a single manual intervention."', role: 'Practice Administrator, Orthopedic Group' },
              ].map(({ quote, role }) => (
                <div key={role} className="p-6 rounded border border-white/8 bg-white/3">
                  <div className="text-[oklch(0.70_0.08_78)] text-2xl mb-3 leading-none">"</div>
                  <p className="text-[13px] text-white/60 leading-relaxed mb-4">{quote}</p>
                  <p className="text-[11px] text-white/30 tracking-wide">{role}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════ CTA ══════════════════════════════════════════ */}
      <section className="py-28 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] text-white/40 tracking-[0.15em] uppercase mb-8">
              <span className="size-1.5 rounded-full bg-[oklch(0.70_0.08_78)]" />
              Now Available
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Ready to reclaim your time?
            </h2>
            <p className="text-white/45 text-xl leading-relaxed mb-10 max-w-xl mx-auto">
              Join healthcare teams using PriorFlow to eliminate prior authorization burden and get back to delivering care.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => navigate('/signin')}
                className="px-8 py-4 bg-white text-[oklch(0.07_0.006_60)] rounded text-[13px] font-semibold tracking-[0.12em] uppercase hover:bg-white/90 transition-colors flex items-center gap-2">
                Get Started Free <ArrowRight className="size-4" />
              </button>
              <button onClick={() => navigate('/app')}
                className="px-8 py-4 border border-white/15 rounded text-[13px] font-semibold tracking-[0.12em] uppercase text-white/60 hover:text-white hover:border-white/30 transition-colors">
                Explore the Dashboard
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════ FOOTER ══════════════════════════════════════════ */}
      <footer className="border-t border-white/5 px-6 py-12" style={{ background: 'oklch(0.05 0.004 60)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PriorFlowLogo className="size-6 text-white" />
                <span className="text-sm font-bold">PriorFlow</span>
              </div>
              <p className="text-[12px] text-white/30 leading-relaxed">AI-powered prior authorization for modern healthcare teams.</p>
            </div>
            {[
              { title: 'Product', links: ['Dashboard', 'PA Requests', 'Eligibility', 'Agent Activity', 'Mock Portal'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'HIPAA Compliance', 'Security'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-[11px] tracking-[0.2em] uppercase text-white/30 mb-4">{title}</div>
                <div className="space-y-2">
                  {links.map(l => (
                    <div key={l} className="text-[13px] text-white/40 hover:text-white transition-colors cursor-pointer">{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/20">© 2025 PriorFlow. All rights reserved.</p>
            <div className="flex items-center gap-6 text-[12px] text-white/20">
              <span className="flex items-center gap-1.5"><Shield className="size-3" />HIPAA Compliant</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3" />SOC 2 Type II</span>
              <span>PriorFlow v2.4.1</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
