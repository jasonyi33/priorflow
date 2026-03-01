import { Link } from 'react-router';
import { ArrowRight, Check, Shield, Brain, Zap, FileText, Activity, Users, Clock } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */
function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img src="/priorflow-logo.png" alt="priorflow" className="h-7 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </nav>

        <Link to="/signin" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
          Sign In
        </Link>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
              <span>AI PRIOR AUTHORIZATION AGENT V1.0</span>
            </div>

            <div className="flex items-stretch gap-5">
              <div className="flex-1">
                <div className="font-serif text-[4.5rem] md:text-[5.5rem] font-bold leading-none tracking-tight">$35B</div>
                <p className="text-sm text-muted-foreground leading-snug mt-2 max-w-[220px]">of US healthcare spending wasted on prior authorization annually</p>
              </div>
              <div className="w-px bg-border self-stretch" />
              <div className="flex-1">
                <div className="font-serif text-[4.5rem] md:text-[5.5rem] font-bold leading-none tracking-tight">90%</div>
                <p className="text-sm text-muted-foreground leading-snug mt-2 max-w-[220px]">of physicians say prior authorization is a critical bottleneck in care delivery</p>
              </div>
            </div>

            <Link to="/signin" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Agent Activity Log mockup */}
          <div className="relative">
            <div className="relative bg-secondary/50 rounded-3xl p-8 border border-border/50">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-4">
                <span>NO.01 — AGENT_PIPELINE</span>
                <span>HIPAA_COMPLIANT CONNECTION</span>
              </div>

              <div className="absolute -left-4 top-20 bg-[#fffef0] p-3 rounded shadow-sm rotate-[-3deg] border border-amber-100 w-40">
                <p className="text-xs font-mono text-foreground/80">CLINICAL_INPUT</p>
                <p className="text-sm font-serif italic mt-1">"MRI Lumbar Spine, CPT 72148"</p>
              </div>

              <div className="bg-[#2d4a3e] rounded-2xl p-5 my-6 mx-auto">
                <div className="flex justify-between text-[8px] text-white/60 font-mono mb-3 px-1">
                  <span>AGENT_LOG — LIVE</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />RUNNING</span>
                </div>
                <div className="space-y-2">
                  {[
                    { t: '09:41:03', msg: 'Patient extracted — Sarah Johnson', done: true },
                    { t: '09:41:05', msg: 'CPT 72148 — MRI Lumbar identified', done: true },
                    { t: '09:41:08', msg: 'Eligibility check → BCBS PPO active', done: true },
                    { t: '09:41:12', msg: 'PA package generated', done: true },
                    { t: '09:41:18', msg: 'Submitting to payer portal…', done: false, active: true },
                  ].map(({ t, msg, done, active }) => (
                    <div key={t} className={`flex items-center gap-2 text-[11px] ${active ? 'opacity-100' : 'opacity-60'}`}>
                      <span className="text-white/40 font-mono text-[9px] w-14 flex-none">{t}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-none ${done ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
                      <span className="text-white/80">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -right-2 top-32 space-y-2">
                <div className="bg-card border border-border rounded-xl p-3 shadow-sm max-w-[180px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium">Approved</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Auth #PA-2024-8841</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 shadow-sm max-w-[180px]">
                  <p className="text-xs font-mono text-muted-foreground">TURNAROUND</p>
                  <p className="text-lg font-serif font-bold">6 min</p>
                  <p className="text-[10px] text-muted-foreground">vs 14 days manual</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow                                                          */
/* ------------------------------------------------------------------ */
const workflowSteps = [
  { number: '01', title: 'Upload the Chart', description: 'Drop any clinical PDF — referral notes, imaging orders, chart documentation. No template required.', visual: 'upload' as const },
  { number: '02', title: 'AI Reads & Reasons', description: 'The agent extracts patient data, ICD-10/CPT codes, and builds a medical necessity argument.', visual: 'scan' as const },
  { number: '03', title: 'Eligibility Verified', description: 'Insurance coverage confirmed in real time. Coverage gaps caught before a single form is submitted.', visual: 'verify' as const },
  { number: '04', title: 'Authorization Submitted', description: 'A complete PA package submitted directly to the payer portal. Decision tracked automatically.', visual: 'send' as const },
];

function WorkflowSection() {
  return (
    <section id="workflow" className="py-24 bg-secondary/30">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ WORKFLOW_AUTOMATION</span>
            <h2 className="font-serif text-3xl md:text-4xl mt-3 leading-tight">
              From upload to authorization in minutes.
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs hidden md:block">
            What used to take 14 days of phone calls and faxes, handled end-to-end by an autonomous agent.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {workflowSteps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="bg-card border border-border rounded-2xl p-6 h-full">
                <div className="aspect-square bg-secondary/50 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden">
                  {step.visual === 'upload' && (
                    <div className="bg-[#fffef0] p-4 rounded shadow-sm rotate-[-2deg] border border-amber-100">
                      <p className="text-xs font-mono text-muted-foreground">CLINICAL_DOC</p>
                      <p className="text-sm font-serif italic mt-1">"Referral_MRI_Lumbar.pdf"</p>
                    </div>
                  )}
                  {step.visual === 'scan' && (
                    <div className="space-y-2 w-full px-4">
                      <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-muted-foreground">ICD-10</span><div className="flex-1 h-2 bg-primary/30 rounded" /></div>
                      <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-muted-foreground">CPT</span><div className="flex-1 h-2 bg-primary/40 rounded" /></div>
                      <div className="flex items-center gap-2"><span className="text-[9px] font-mono text-muted-foreground">DOB</span><div className="flex-1 h-2 bg-primary/20 rounded" /></div>
                      <div className="flex gap-1 mt-3">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <div className="flex-1 h-3 bg-border rounded" />
                      </div>
                    </div>
                  )}
                  {step.visual === 'verify' && (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-sm w-4/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">BCBS PPO</span>
                        <span className="text-[10px] font-mono text-green-600">ACTIVE</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono"><span className="text-muted-foreground">Deductible</span><span>$1,200 met</span></div>
                        <div className="flex justify-between text-[9px] font-mono"><span className="text-muted-foreground">PA Required</span><span>Yes</span></div>
                      </div>
                    </div>
                  )}
                  {step.visual === 'send' && (
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 border border-primary/20">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-mono text-primary">APPROVED</span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">Auth #PA-2024-8841</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{step.number}</span>
                </div>
                <h3 className="font-medium text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              {index < workflowSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                          */
/* ------------------------------------------------------------------ */
function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ SYSTEM_MODULES</span>
            <h2 className="font-serif text-3xl md:text-4xl mt-3 leading-tight">
              Built for the complexity of healthcare.
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm hidden md:block">
            Every feature designed around the real workflows of clinical teams managing prior authorization at scale.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Clinical AI */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">CLINICAL_REASONING</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-mono"><span className="text-muted-foreground">ICD-10</span><div className="flex-1 h-1.5 bg-primary/40 rounded-full" /></div>
                <div className="flex items-center gap-2 text-[10px] font-mono"><span className="text-muted-foreground">CPT</span><div className="flex-1 h-1.5 bg-primary/60 rounded-full" /></div>
                <div className="flex items-center gap-2 text-[10px] font-mono"><span className="text-muted-foreground">MED_NEC</span><div className="flex-1 h-1.5 bg-primary/80 rounded-full" /></div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Clinical AI Reasoning</h3>
            <p className="text-sm text-muted-foreground">
              Understands medical necessity criteria, payer policies, and ICD/CPT semantics — not just text extraction.
            </p>
          </div>

          {/* Real-Time Eligibility */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">ELIGIBILITY_CHECK</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                {['BCBS', 'Aetna', 'UHC', 'Cigna', 'Humana', 'More'].map((payer, i) => (
                  <div key={payer} className={`text-center p-2 rounded-lg ${i < 5 ? 'bg-card border border-border' : 'border border-dashed border-border'}`}>
                    <span className="text-[10px] font-mono text-muted-foreground">{payer}</span>
                  </div>
                ))}
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Real-Time Eligibility</h3>
            <p className="text-sm text-muted-foreground">Instant insurance verification before any submission, catching coverage gaps before they cause denials.</p>
          </div>

          {/* HIPAA Compliant */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground">FIELD</span>
              <span className="text-xs font-mono text-muted-foreground">SECURITY_GRADE</span>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-accent flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">HIPAA Compliant</h3>
            <p className="text-sm text-muted-foreground">
              Enterprise-grade encryption. PHI never leaves your environment. Full audit trail on every request.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex gap-6">
              <div className="bg-secondary/50 rounded-xl p-4 flex-shrink-0">
                <div className="relative w-20 h-20 rounded-full border-4 border-accent flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-xs font-mono text-muted-foreground">METRIC</span>
                <h3 className="font-semibold text-2xl mb-1 mt-2">Saves 14h / week</h3>
                <p className="text-sm text-muted-foreground">
                  Reclaim your clinical time. PriorFlow handles the entire PA workflow so physicians can focus on patients, not paperwork.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex gap-6">
              <div className="flex-1">
                <span className="text-xs font-mono text-muted-foreground">OUTPUT</span>
                <h3 className="font-semibold text-2xl mb-1 mt-2">87% Approval Rate</h3>
                <p className="text-sm text-muted-foreground">
                  First-pass approval rate vs 67% industry average. The agent catches documentation gaps before submission, dramatically improving outcomes.
                </p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 flex-shrink-0 flex items-center">
                <div className="flex gap-1">
                  {['8', '7', '%'].map((c, i) => (
                    <div key={i} className="w-8 h-10 bg-card border border-border rounded flex items-center justify-center">
                      <span className="font-mono text-lg">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                           */
/* ------------------------------------------------------------------ */
const tiers = [
  {
    name: 'STARTER',
    price: '$299',
    desc: 'For small practices getting started with AI-assisted PA.',
    features: ['50 PA Requests / month', 'Real-Time Eligibility Checks', 'Major Payer Integrations', 'Email Notifications', '30-Day Audit History'],
  },
  {
    name: 'PROFESSIONAL',
    price: '$799',
    desc: 'For multi-provider practices managing high PA volume.',
    features: ['250 PA Requests / month', 'All Payer Integrations', 'Priority Submission Queue', 'Denial Analytics Dashboard', '90-Day Audit History', 'Dedicated Support'],
    featured: true,
  },
  {
    name: 'ENTERPRISE',
    price: 'Custom',
    desc: 'For health systems and large groups with custom needs.',
    features: ['Unlimited PA Requests', 'Custom EHR Integration', 'SLA Guarantee', 'Compliance Reporting', 'Full Audit Trail', 'White-Glove Onboarding'],
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-secondary/30">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ PRICING</span>
          <h2 className="font-serif text-4xl md:text-5xl mt-4 mb-4">
            Priced for practices,
            <br />
            not enterprises.
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-[#fffef0] px-3 py-1 rounded shadow-sm rotate-[-2deg] border border-amber-100">
              <span className="text-xs font-mono">14_DAY_FREE_TRIAL</span>
            </div>
            <p className="text-muted-foreground text-sm">No setup fees. Cancel anytime.</p>
            <div className="bg-[#fffef0] px-3 py-1 rounded shadow-sm rotate-[2deg] border border-amber-100">
              <span className="text-xs font-mono">HIPAA_COMPLIANT</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-card border rounded-2xl p-6 relative ${tier.featured ? 'border-primary shadow-lg' : 'border-border'}`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-mono px-3 py-1 rounded-full">
                  ◆ MOST POPULAR
                </div>
              )}
              <div className="mb-6">
                <span className="text-xs font-mono text-muted-foreground">{tier.name}</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-serif">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-muted-foreground text-sm">/mo</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{tier.desc}</p>
              </div>
              <div className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-accent-foreground" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                className={`w-full py-3 rounded-full text-sm font-medium transition-colors ${
                  tier.featured
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-secondary'
                }`}
              >
                {tier.price === 'Custom' ? 'CONTACT SALES' : 'GET STARTED'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                      */
/* ------------------------------------------------------------------ */
const testimonials = [
  { id: 'PF-0088', quote: 'PriorFlow cut our PA backlog from 3 weeks to same-day. Our care coordinators now spend their time with patients, not on hold with insurance.', author: 'Dr. Meredith Lane', role: 'MEDICAL DIRECTOR · REGIONAL HEALTH SYSTEM' },
  { id: 'PF-2301', quote: 'The clinical reasoning is impressive — it catches documentation gaps before submission, which has dramatically improved our first-pass approval rates.', author: 'James Ortega', role: 'VP OPERATIONS · MULTI-SPECIALTY PRACTICE' },
  { id: 'PF-7725', quote: 'Setup took an afternoon. Within the first week, the agent had processed 40 PA requests without a single manual intervention from our staff.', author: 'Rachel Kim', role: 'PRACTICE ADMINISTRATOR · ORTHOPEDIC GROUP' },
  { id: 'PF-0030', quote: 'Our denial rate dropped by 34% in the first month. The agent knows which payers require what documentation before we even start.', author: 'Dr. Samuel Torres', role: 'CHIEF OF STAFF · COMMUNITY HOSPITAL' },
  { id: 'PF-2134', quote: 'Finally, software built around how clinical teams actually work. Not another tool requiring a dedicated IT team to maintain.', author: 'Lisa Nguyen', role: 'OPERATIONS DIRECTOR · CARDIOLOGY ASSOCIATES' },
];

function TestimonialCard({ t }: { t: typeof testimonials[number] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-muted-foreground">REF</span>
        <span className="text-xs font-mono text-primary">{t.id}</span>
        <div className="w-12 h-12 bg-secondary rounded-lg" />
      </div>
      <p className="text-sm leading-relaxed mb-6">{t.quote}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{t.author}</p>
          <p className="text-xs font-mono text-muted-foreground">{t.role}</p>
        </div>
        <div className="w-4 h-4 border border-border rounded flex items-center justify-center">
          <span className="text-[8px]">↗</span>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-xs font-mono text-muted-foreground tracking-wider">◆ FIELD_REPORTS</span>
            <h2 className="font-serif text-3xl md:text-4xl mt-3 leading-tight">
              Clinicians who never chase authorizations alone
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-[200px] hidden md:block text-right">
            Real outcomes from practices using PriorFlow in production.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {testimonials.slice(3, 4).map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}

          <div className="bg-secondary/50 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center mb-3">
              <span className="text-lg">+</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">YOUR PRACTICE HERE</span>
            <p className="text-sm text-muted-foreground mt-1">Join the network.</p>
          </div>

          {testimonials.slice(4).map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                               */
/* ------------------------------------------------------------------ */
function CTASection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="relative bg-card border border-border rounded-3xl p-12 md:p-16 overflow-hidden">
          <div className="absolute top-8 left-8 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="absolute top-8 right-8 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="absolute bottom-8 left-8 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="absolute bottom-8 right-8 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="absolute top-1/2 right-16 -translate-y-1/2 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="absolute bottom-1/3 left-16 w-10 h-10 border border-border rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="text-center max-w-2xl mx-auto relative z-10">
            <h2 className="font-serif text-4xl md:text-5xl mb-4 leading-tight">
              Your authorizations,
              <br />
              handled perfectly.
            </h2>
            <p className="text-muted-foreground mb-8">
              Join healthcare teams using PriorFlow to eliminate prior authorization burden and get back to delivering care.
            </p>
            <Link to="/signin" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
              Request Early Access
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function LandingFooter() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div>
            <div className="mb-3">
              <img src="/priorflow-logo.png" alt="priorflow" className="h-6 w-auto" />
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              AI PRIOR AUTHORIZATION
              <br />
              AGENT V1.0
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-4">◆ HIPAA COMPLIANT</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-4">DIRECTORY</h4>
            <ul className="space-y-2">
              <li><a href="#workflow" className="text-sm hover:text-primary transition-colors">How_It_Works</a></li>
              <li><a href="#features" className="text-sm hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm hover:text-primary transition-colors">Pricing</a></li>
              <li><Link to="/signin" className="text-sm hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2026 PRIORFLOW INC. ALL RIGHTS RESERVED.</p>
          <p className="text-xs text-muted-foreground">BUILT FOR HEALTHCARE. DESIGNED FOR DOCTORS.</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page (exported)                                           */
/* ------------------------------------------------------------------ */
export function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <WorkflowSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
