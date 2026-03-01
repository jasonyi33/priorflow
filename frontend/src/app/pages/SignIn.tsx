import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PriorFlowLogo } from '../components/priorflow-logo';
import { api } from '../../lib/api';

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState<'ok' | 'offline'>('offline');

  useEffect(() => {
    api.getHealth().then((health) => setApiStatus(health.status));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLoading(false);
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4"
      style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
    >
      <div className="fixed inset-0 bg-muted/30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex justify-start mb-6">
          <a href="http://localhost:3001" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Back to home
          </a>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 mb-3">
            <PriorFlowLogo className="h-10 w-auto" />
          </div>
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">
            Prior Authorization Platform
          </p>
        </div>

        <div className="rounded border border-border bg-card px-8 py-8 shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block size-2 bg-foreground rounded-sm rotate-45" />
              <span className="text-xs font-semibold uppercase tracking-widest">Sign In</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Access your PriorFlow dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase font-semibold">
                  Password
                </label>
                <button type="button" className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors tracking-wide">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-border placeholder:text-muted-foreground/30"
              />
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-1 bg-foreground text-background rounded text-[11px] tracking-[0.18em] font-semibold uppercase hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-6 tracking-wider">
          PriorFlow v{__APP_VERSION__} · API {apiStatus === 'ok' ? 'LIVE' : 'OFFLINE'}
        </p>
      </div>
    </div>
  );
}
