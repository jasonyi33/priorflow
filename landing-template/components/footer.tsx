export default function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-1">
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
              {["How_It_Works", "Features", "Pricing", "Dashboard"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm hover:text-primary transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-4">LEGAL</h4>
            <ul className="space-y-2">
              {["Privacy_Policy", "Terms_of_Service", "HIPAA_Compliance", "Security_Whitepaper"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm hover:text-primary transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-mono text-muted-foreground mb-4">SYSTEM_STATUS</h4>
            <div className="bg-secondary/50 rounded-xl p-4 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">PA_AGENT</span>
                  <span className="text-green-600 ml-auto">[OPERATIONAL]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">ELIGIBILITY_API</span>
                  <span className="text-green-600 ml-auto">[OPERATIONAL]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">PAYER_PORTAL</span>
                  <span className="text-green-600 ml-auto">[OPERATIONAL]</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2025 PRIORFLOW INC. ALL RIGHTS RESERVED.</p>
          <p className="text-xs text-muted-foreground">BUILT FOR HEALTHCARE. DESIGNED FOR HUMANS.</p>
        </div>
      </div>
    </footer>
  )
}
