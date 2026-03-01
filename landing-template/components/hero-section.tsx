import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
              <span>AI PRIOR AUTHORIZATION AGENT V1.0</span>
            </div>

            {/* Big stats as headline */}
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

            <a href="/signin" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
              Sign Up
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Right visual — Agent Activity Log mockup */}
          <div className="relative">
            <div className="relative bg-secondary/50 rounded-3xl p-8 border border-border/50">
              {/* Top labels */}
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-4">
                <span>NO.01 — AGENT_PIPELINE</span>
                <span>HIPAA_COMPLIANT CONNECTION</span>
              </div>

              {/* Sticky note */}
              <div className="absolute -left-4 top-20 bg-[#fffef0] p-3 rounded shadow-sm rotate-[-3deg] border border-amber-100 w-40">
                <p className="text-xs font-mono text-foreground/80">CLINICAL_INPUT</p>
                <p className="text-sm font-serif italic mt-1">"MRI Lumbar Spine, CPT 72148"</p>
              </div>

              {/* Agent log terminal */}
              <div className="bg-[#2d4a3e] rounded-2xl p-5 my-6 mx-auto">
                <div className="flex justify-between text-[8px] text-white/60 font-mono mb-3 px-1">
                  <span>AGENT_LOG — LIVE</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />RUNNING</span>
                </div>
                <div className="space-y-2">
                  {[
                    { t: "09:41:03", msg: "Patient extracted — Sarah Johnson", done: true },
                    { t: "09:41:05", msg: "CPT 72148 — MRI Lumbar identified", done: true },
                    { t: "09:41:08", msg: "Eligibility check → BCBS PPO active", done: true },
                    { t: "09:41:12", msg: "PA package generated", done: true },
                    { t: "09:41:18", msg: "Submitting to payer portal…", active: true },
                  ].map(({ t, msg, done, active }) => (
                    <div key={t} className={`flex items-center gap-2 text-[11px] ${active ? "opacity-100" : "opacity-60"}`}>
                      <span className="text-white/40 font-mono text-[9px] w-14 flex-none">{t}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-none ${done ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
                      <span className="text-white/80">{msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status cards */}
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
  )
}
