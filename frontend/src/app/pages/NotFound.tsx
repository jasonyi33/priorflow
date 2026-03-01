import { Shield } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/10 mb-6">
        <Shield className="size-8 text-primary" />
      </div>
      <h1 className="text-5xl font-bold text-muted-foreground mb-4 tracking-widest">404</h1>
      <h2 className="text-sm font-semibold mb-2 tracking-[0.15em] uppercase">PAGE NOT FOUND</h2>
      <p className="text-[11px] text-muted-foreground mb-6 tracking-wider">
        The page you're looking for doesn't exist.
      </p>
      <a 
        href="/" 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-[11px] tracking-[0.15em] font-semibold hover:bg-primary/90 transition-colors"
      >
        RETURN TO DASHBOARD
      </a>
    </div>
  );
}