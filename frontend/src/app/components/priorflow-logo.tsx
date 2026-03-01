// PriorFlow brand logo — abstract "flow" mark with forward momentum
export function PriorFlowLogo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer shield/flow shape */}
      <path
        d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z"
        fill="currentColor"
        opacity="0.15"
      />
      {/* Inner flowing arrow/pulse — represents PA lifecycle flow */}
      <path
        d="M10 16.5L14.5 21L22 11"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Forward momentum lines */}
      <path
        d="M8 11h3M7 16h2M8 21h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

// Small monochrome mark for tight spaces
export function PriorFlowMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M8 12.5L11 15.5L16.5 9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
