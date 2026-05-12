interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Wordmark({ size = 'md' }: WordmarkProps) {
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
