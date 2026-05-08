import { STEPS } from '../constants';
import type { StepId } from '../types';

export function StepIndicator({ currentStep }: { currentStep: StepId }) {
  return (
    <div
      className="flex items-center justify-between gap-2"
      aria-label="Progreso del registro"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={3}
    >
      {STEPS.map((s, idx) => {
        const isActive = s.id === currentStep;
        const isCompleted = s.id < currentStep;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <div
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300',
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isActive
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-transparent text-gray-500',
                ].join(' ')}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 7l4 4 6-7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
              <span
                className={[
                  'hidden text-xs font-medium transition-colors duration-300 sm:inline',
                  isActive || isCompleted ? 'text-gray-200' : 'text-gray-500',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'h-px flex-1 transition-colors duration-300',
                  isCompleted ? 'bg-emerald-500' : 'bg-gray-700',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
