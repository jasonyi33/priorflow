import { Check, Shield, Brain, Zap } from "lucide-react"

export default function FeaturesSection() {
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
          <p className="text-muted-foreground text-sm max-w-xs hidden md:block">
            Every feature designed around the real workflows of clinical teams managing prior authorization at scale.
          </p>
        </div>

        {/* Top row */}
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
                {["BCBS", "Aetna", "UHC", "Cigna", "Humana", "More"].map((payer, i) => (
                  <div key={payer} className={`text-center p-2 rounded-lg ${i < 5 ? "bg-card border border-border" : "border border-dashed border-border"}`}>
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

        {/* Bottom row */}
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
                  {["8", "7", "%"].map((c, i) => (
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
  )
}
