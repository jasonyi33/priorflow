export default function Footer() {
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
              <li><a href="/signin" className="text-sm hover:text-primary transition-colors">Dashboard</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">© 2026 PRIORFLOW INC. ALL RIGHTS RESERVED.</p>
          <p className="text-xs text-muted-foreground">BUILT FOR HEALTHCARE. DESIGNED FOR DOCTORS.</p>
        </div>
      </div>
    </footer>
  )
}
