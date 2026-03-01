import { Link } from 'react-router';
import { PriorFlowLogo } from '../components/priorflow-logo';

const features = [
  {
    numeral: 'I',
    title: 'Eligibility Verification',
    description: 'Instant insurance eligibility checks via Stedi integration.',
  },
  {
    numeral: 'II',
    title: 'PA Form Submission',
    description: 'AI agents draft and submit prior authorization requests.',
  },
  {
    numeral: 'III',
    title: 'Status Monitoring',
    description: 'Real-time determination tracking with automated alerts.',
  },
];

export function Landing() {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4"
      style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
    >
      <div className="fixed inset-0 bg-muted/30 pointer-events-none" />

      <div className="relative w-full max-w-2xl flex flex-col items-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-14">
          <PriorFlowLogo className="h-10 w-auto mb-3" />
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">
            Prior Authorization Platform
          </p>
        </div>

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-4">
          Prior Authorization, Automated.
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-14 leading-relaxed">
          AI agents that verify eligibility, draft PA requests, and monitor
          determinations — so your team can focus on patient care.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-14">
          {features.map((f) => (
            <div key={f.numeral} className="rounded border border-border bg-card px-6 py-5">
              <div className="text-[10px] tracking-[0.18em] text-muted-foreground/55 uppercase mb-2">
                {f.numeral}
              </div>
              <div className="text-sm font-semibold uppercase tracking-widest mb-2">
                {f.title}
              </div>
              <div className="text-xs text-muted-foreground/60 leading-relaxed">
                {f.description}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/signin"
          className="py-2.5 px-8 bg-foreground text-background rounded text-[11px] tracking-[0.18em] font-semibold uppercase hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground/40 mt-8 tracking-wider">
          PriorFlow v{__APP_VERSION__}
        </p>
      </div>
    </div>
  );
}
