import { BrandIcon, Wordmark, CheckCircleIcon, TrendingUpIcon, UsersIcon } from '@/components/icons';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* ─── Mobile / Tablet — Top brand strip (shown below lg) ─── */}
      <header className="flex items-center justify-between border-b border-gray-800 bg-gradient-to-b from-gray-950 to-[#0a0d12] px-4 py-4 sm:px-6 lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandIcon />
          <Wordmark size="sm" />
        </div>
        <span className="hidden text-xs text-gray-400 sm:block">
          Plataforma de agentes de IA
        </span>
      </header>

      {/* ─── Desktop — Left column: marketing (hidden below lg) ─── */}
      <aside
        className="relative hidden flex-col items-center justify-center overflow-hidden bg-gray-950 px-8 py-10 lg:flex xl:px-12 2xl:px-16"
        aria-label="Información sobre MultiBotAgents"
      >
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 motion-reduce:hidden"
          aria-hidden="true"
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-950/70 via-gray-950/50 to-emerald-950/40"
          aria-hidden="true"
        />

        <div className="z-10 flex w-full max-w-md flex-col items-center gap-6 text-center xl:gap-8">
          {/* Logo + Wordmark */}
          <div className="stagger-1 motion-reduce:opacity-100 motion-reduce:animate-none flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <BrandIcon size="lg" />
              <Wordmark size="lg" />
            </div>
            <div className="h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
          </div>

          {/* Headline */}
          <h1 className="stagger-2 motion-reduce:opacity-100 motion-reduce:animate-none text-[clamp(1.75rem,2.5vw,2.75rem)] font-bold leading-tight text-white">
            Automatiza tus conversaciones{' '}
            <span className="text-emerald-400">con IA</span>
          </h1>

          {/* Subtitle */}
          <p className="stagger-3 motion-reduce:opacity-100 motion-reduce:animate-none text-sm leading-relaxed text-gray-400 xl:text-base">
            Plataforma todo-en-uno para crear, gestionar y optimizar agentes de
            IA que impulsan tu negocio.
          </p>

          {/* Feature bullets */}
          <ul className="flex w-full flex-col gap-4 xl:gap-5">
            <FeatureBullet
              icon={<CheckCircleIcon />}
              title="Automatización inteligente"
              description="Responde, califica y convierte leads 24/7 con IA."
              staggerClass="stagger-4"
            />
            <FeatureBullet
              icon={<TrendingUpIcon />}
              title="Analítica avanzada"
              description="Mide el rendimiento y mejora cada interacción."
              staggerClass="stagger-5"
            />
            <FeatureBullet
              icon={<UsersIcon />}
              title="Escalable y seguro"
              description="Infraestructura confiable para crecer sin límites."
              staggerClass="stagger-6"
            />
          </ul>
        </div>

        {/* Fade edge */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-r from-transparent to-[#111318]"
          aria-hidden="true"
        />
      </aside>

      {/* ─── Right column — Form ─── */}
      <main className="auth-surface flex w-full flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 md:items-center lg:px-8 lg:py-12 xl:px-12">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
    </div>
  );
}

// ─── Feature bullet (layout-specific, not shared) ────────────────────────────

function FeatureBullet({
  icon,
  title,
  description,
  staggerClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  staggerClass?: string;
}) {
  return (
    <li className={`flex items-start gap-3 text-left ${staggerClass ?? ''}`}>
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-white xl:text-base">{title}</p>
        <p className="text-xs text-gray-400 xl:text-sm">{description}</p>
      </div>
    </li>
  );
}
