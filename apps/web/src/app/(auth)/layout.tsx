"use client";

import { useState } from 'react';
import { BrandIcon, Wordmark, CheckCircleIcon, TrendingUpIcon, UsersIcon } from '@/components/icons';
import { motion } from 'motion/react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] bg-gray-950 font-sans">
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
        onMouseMove={handleMouseMove}
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

        {/* Futuristic dot-grid pattern mask */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden="true"
        />

        {/* Dark/emerald gradient overlays */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-950/85 via-gray-950/60 to-emerald-950/40"
          aria-hidden="true"
        />

        {/* Interactive Mouse-Tracking Glow Effect (Spotlight) */}
        <motion.div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${coords.x}px ${coords.y}px, rgba(16, 185, 129, 0.15), transparent 80%)`,
          }}
          aria-hidden="true"
        />

        <div className="z-10 flex w-full max-w-md flex-col items-center gap-6 text-center xl:gap-8">
          {/* Logo + Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-3">
              <BrandIcon size="lg" />
              <Wordmark size="lg" />
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 64 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="text-[clamp(1.75rem,2.5vw,2.75rem)] font-bold leading-tight text-white"
          >
            Automatiza tus conversaciones{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-sm">
              con IA
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1.0 }}
            className="text-sm leading-relaxed text-gray-400 xl:text-base"
          >
            Plataforma todo-en-uno para crear, gestionar y optimizar agentes de
            IA que impulsan tu negocio.
          </motion.p>

          {/* Feature bullets */}
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                  delayChildren: 0.5,
                },
              },
            }}
            className="flex w-full flex-col gap-4 xl:gap-5"
          >
            <FeatureBullet
              icon={<CheckCircleIcon />}
              title="Automatización inteligente"
              description="Responde, califica y convierte leads 24/7 con IA."
            />
            <FeatureBullet
              icon={<TrendingUpIcon />}
              title="Analítica avanzada"
              description="Mide el rendimiento y mejora cada interacción."
            />
            <FeatureBullet
              icon={<UsersIcon />}
              title="Escalable y seguro"
              description="Infraestructura confiable para crecer sin límites."
            />
          </motion.ul>
        </div>

        {/* Fade edge */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-r from-transparent to-[#0a0d12]"
          aria-hidden="true"
        />
      </aside>

      {/* ─── Right column — Form ─── */}
      <main className="relative flex w-full flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 md:items-center lg:px-8 lg:py-12 xl:px-12 bg-gradient-to-b from-[#0a0d12] to-gray-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[480px]"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

// ─── Feature bullet (layout-specific, not shared) ────────────────────────────

const bulletVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 100 } },
};

function FeatureBullet({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.li
      variants={bulletVariants}
      whileHover={{ scale: 1.02, x: 4 }}
      className="flex items-start gap-3 text-left p-3.5 rounded-xl bg-gray-900/40 border border-gray-800/40 backdrop-blur-md hover:bg-gray-900/60 hover:border-emerald-500/30 transition-all duration-300 group cursor-pointer shadow-lg shadow-black/10"
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 group-hover:scale-110 transition-all duration-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-white xl:text-base group-hover:text-emerald-300 transition-colors">
          {title}
        </p>
        <p className="text-xs text-gray-400 xl:text-sm mt-0.5">{description}</p>
      </div>
    </motion.li>
  );
}
