interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="animate-error-in text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
