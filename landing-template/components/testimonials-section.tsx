const testimonials = [
  {
    id: "PF-0088",
    quote: "PriorFlow cut our PA backlog from 3 weeks to same-day. Our care coordinators now spend their time with patients, not on hold with insurance.",
    author: "Dr. Meredith Lane",
    role: "MEDICAL DIRECTOR · REGIONAL HEALTH SYSTEM",
  },
  {
    id: "PF-2301",
    quote: "The clinical reasoning is impressive — it catches documentation gaps before submission, which has dramatically improved our first-pass approval rates.",
    author: "James Ortega",
    role: "VP OPERATIONS · MULTI-SPECIALTY PRACTICE",
  },
  {
    id: "PF-7725",
    quote: "Setup took an afternoon. Within the first week, the agent had processed 40 PA requests without a single manual intervention from our staff.",
    author: "Rachel Kim",
    role: "PRACTICE ADMINISTRATOR · ORTHOPEDIC GROUP",
  },
  {
    id: "PF-0030",
    quote: "Our denial rate dropped by 34% in the first month. The agent knows which payers require what documentation before we even start.",
    author: "Dr. Samuel Torres",
    role: "CHIEF OF STAFF · COMMUNITY HOSPITAL",
  },
  {
    id: "PF-2134",
    quote: "Finally, software built around how clinical teams actually work. Not another tool requiring a dedicated IT team to maintain.",
    author: "Lisa Nguyen",
    role: "OPERATIONS DIRECTOR · CARDIOLOGY ASSOCIATES",
  },
]

export default function TestimonialsSection() {
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
            <div key={t.id} className="bg-card border border-border rounded-2xl p-6">
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
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {testimonials.slice(3, 4).map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-6">
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
          ))}

          <div className="bg-secondary/50 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center mb-3">
              <span className="text-lg">+</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">YOUR PRACTICE HERE</span>
            <p className="text-sm text-muted-foreground mt-1">Join the network.</p>
          </div>

          {testimonials.slice(4).map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-2xl p-6">
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
          ))}
        </div>
      </div>
    </section>
  )
}
