import { STRENGTH_LABELS, STRENGTH_COLORS } from '../hooks/useRegisterForm';

interface PasswordStrengthProps {
  strength: number;
  visible: boolean;
}

export function PasswordStrength({ strength, visible }: PasswordStrengthProps) {
  if (!visible) return null;

  return (
    <div id="password-strength" className="space-y-1.5 pt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={[
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < strength ? STRENGTH_COLORS[strength] : 'bg-gray-700',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Fortaleza de la contraseña:{' '}
        <span className="font-medium">{STRENGTH_LABELS[strength]}</span>
      </p>
    </div>
  );
}
