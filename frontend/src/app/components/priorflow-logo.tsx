// PriorFlow brand logo — actual wordmark
export function PriorFlowLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <img
      src="/priorflow-logo.png"
      alt="priorflow"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Small monochrome mark — same wordmark at smaller size
export function PriorFlowMark({ className = 'h-4' }: { className?: string }) {
  return (
    <img
      src="/priorflow-logo.png"
      alt="priorflow"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
