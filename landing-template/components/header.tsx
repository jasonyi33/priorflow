import Image from "next/image"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <Image src="/priorflow-logo.png" alt="priorflow" width={140} height={53} className="h-7 w-auto" />
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

        <a href="/signin" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
          Sign Up
        </a>
      </div>
    </header>
  )
}
