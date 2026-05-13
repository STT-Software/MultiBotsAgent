export function LoginSuccess() {
  return (
    <div className="flex w-full flex-col items-center justify-center space-y-6 py-12 animate-fade-in">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-success-ring rounded-full border-4 border-emerald-500" />
        <svg
          className="h-12 w-12 animate-success-check text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-check"
          />
        </svg>
        <div className="absolute inset-0 animate-success-particles">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-emerald-400"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-32px)`,
                opacity: 0,
                animation: `particle-burst 0.6s ease-out ${0.3 + i * 0.05}s forwards`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white sm:text-2xl">¡Sesión iniciada!</h2>
        <p className="text-sm text-gray-400">Redirigiendo al panel de administración...</p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-gray-800">
        <div className="h-full animate-progress-bar rounded-full bg-emerald-500" />
      </div>
    </div>
  );
}
