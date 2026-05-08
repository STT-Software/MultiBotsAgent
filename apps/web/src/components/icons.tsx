export function BrandIcon({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
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
      <path
        d="M16 10v5"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 10v5"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="9" r="1.75" fill="#10b981" />
      <circle cx="32" cy="9" r="1.75" fill="#10b981" />

      {/* Bot head — rounded square with outline */}
      <rect
        x="8"
        y="15"
        width="32"
        height="26"
        rx="8"
        stroke="#10b981"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Eyes — bright filled circles */}
      <circle cx="18" cy="26" r="2.5" fill="#10b981" />
      <circle cx="30" cy="26" r="2.5" fill="#10b981" />

      {/* Smile — curved line */}
      <path
        d="M18 33c1.5 1.5 4 2 6 2s4.5-0.5 6-2"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl xl:text-3xl',
  }[size];

  return (
    <span className={`font-bold ${textSize}`}>
      <span className="text-white">MultiBot</span>
      <span className="text-emerald-400">Agents</span>
    </span>
  );
}

export function CheckCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8.5 12l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendingUpIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 7h7v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="17"
        cy="9"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M15 15c2.761 0 5 1.79 5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
