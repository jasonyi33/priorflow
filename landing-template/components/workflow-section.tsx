export default function WorkflowSection() {
  const steps = [
    {
      number: "01",
      title: "Upload the Chart",
      description: "Drop any clinical PDF — referral notes, imaging orders, chart documentation. No template required.",
      visual: "upload",
    },
    {
      number: "02",
      title: "AI Reads & Reasons",
      description: "The agent extracts patient data, ICD-10/CPT codes, and builds a medical necessity argument.",
      visual: "scan",
    },
    {
      number: "03",
      title: "Eligibility Verified",
      description: "Insurance coverage confirmed in real time. Coverage gaps caught before a single form is submitted.",
      visual: "verify",
    },
    {
      number: "04",
      title: "Authorization Submitted",
      description: "A complete PA package submitted directly to the payer portal. Decision tracked automatically.",
      visual: "send",
    },
  ]

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
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="bg-card border border-border rounded-2xl p-6 h-full">
                {/* Visual */}
                <div className="aspect-square bg-secondary/50 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden">
                  {step.visual === "upload" && (
                    <div className="bg-[#fffef0] p-4 rounded shadow-sm rotate-[-2deg] border border-amber-100">
                      <p className="text-xs font-mono text-muted-foreground">CLINICAL_DOC</p>
                      <p className="text-sm font-serif italic mt-1">"Referral_MRI_Lumbar.pdf"</p>
                    </div>
                  )}
                  {step.visual === "scan" && (
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
                  {step.visual === "verify" && (
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
                  {step.visual === "send" && (
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

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
