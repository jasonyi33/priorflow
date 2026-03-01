import { Check } from "lucide-react"

const tiers = [
  {
    name: "STARTER",
    price: "$299",
    desc: "For small practices getting started with AI-assisted PA.",
    features: ["50 PA Requests / month", "Real-Time Eligibility Checks", "Major Payer Integrations", "Email Notifications", "30-Day Audit History"],
  },
  {
    name: "PROFESSIONAL",
    price: "$799",
    desc: "For multi-provider practices managing high PA volume.",
    features: ["250 PA Requests / month", "All Payer Integrations", "Priority Submission Queue", "Denial Analytics Dashboard", "90-Day Audit History", "Dedicated Support"],
    featured: true,
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    desc: "For health systems and large groups with custom needs.",
    features: ["Unlimited PA Requests", "Custom EHR Integration", "SLA Guarantee", "Compliance Reporting", "Full Audit Trail", "White-Glove Onboarding"],
  },
]

export default function PricingSection() {
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
              className={`bg-card border rounded-2xl p-6 relative ${tier.featured ? "border-primary shadow-lg" : "border-border"}`}
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
                  {tier.price !== "Custom" && <span className="text-muted-foreground text-sm">/mo</span>}
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                {tier.price === "Custom" ? "CONTACT SALES" : "GET STARTED"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
