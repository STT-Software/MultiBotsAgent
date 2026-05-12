interface BrandIconProps {
  size?: 'sm' | 'md' | 'lg';
}

export function BrandIcon({ size = 'md' }: BrandIconProps) {
  const dimensions = {
    sm: { w: 28, h: 28 },
    md: { w: 36, h: 36 },
    lg: { w: 44, h: 44 },
  }[size];

  return (
    <svg
      width={dimensions.w}
      height={dimensions.h}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Antennae */}
      <path d="M16 10v5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 10v5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="9" r="1.75" fill="#10b981" />
      <circle cx="32" cy="9" r="1.75" fill="#10b981" />
      {/* Bot head */}
      <rect x="8" y="15" width="32" height="26" rx="8" stroke="#10b981" strokeWidth="2.5" fill="none" />
      {/* Eyes */}
      <circle cx="18" cy="26" r="2.5" fill="#10b981" />
      <circle cx="30" cy="26" r="2.5" fill="#10b981" />
      {/* Smile */}
      <path d="M18 33c1.5 1.5 4 2 6 2s4.5-0.5 6-2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
