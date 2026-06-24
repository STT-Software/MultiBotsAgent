"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Mail } from 'lucide-react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const splineRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const element = splineRef.current;
    if (!element) return;

    const handleLoad = () => {
      setIs3DLoaded(true);
    };

    element.addEventListener('load-complete', handleLoad);
    return () => {
      element.removeEventListener('load-complete', handleLoad);
    };
  }, [mounted]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-28 pb-16 px-4 overflow-hidden">
      
      {/* Background radial soft light for depth matching the reference image */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[150px] pointer-events-none -z-10" />

      {/* Main Glassmorphic Container matching the reference mockup layout */}
      <div className="relative w-full max-w-7xl mx-auto rounded-[32px] border border-white/[0.06] bg-gray-950/40 backdrop-blur-2xl shadow-[0_0_50px_0_rgba(147,51,234,0.05)] p-6 sm:p-10 lg:p-16 overflow-hidden">
        
        {/* Decorative Grid Overlay inside the card */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] -z-10"
          style={{
            backgroundImage: 'radial-gradient(rgba(147, 51, 234, 0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Ambient glow highlight at the top border */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Copywriting, CTAs and capture */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left max-w-2xl">
            
            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/30 px-3.5 py-1.5 text-xs font-semibold text-purple-400 backdrop-blur-md mb-8 w-fit hover:border-purple-500/40 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-400" />
              <span>Plataforma Multibot Cloud-Native</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]"
            >
              Prepárate para la{' '}
              <span className="bg-gradient-to-r from-purple-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent bg-[size:200%] animate-gradient-flow">
                nueva era de IA
              </span>{' '}
              conversacional
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl"
            >
              Entrena tus propios agentes inteligentes autónomos con PDFs, URLs o bases de datos. Despliega en minutos asistentes de RAG, cotizadores y agendamiento 24/7 en WhatsApp.
            </motion.p>

            {/* Capture Form matching the reference mockup style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg"
            >
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="Tu correo corporativo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-950/60 border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300"
                />
              </div>
              
              <Link
                href={`/register?email=${encodeURIComponent(email)}`}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Comenzar <ArrowRight className="ml-1.5 w-4 h-4" />
              </Link>
            </motion.div>

            {/* Trust badge */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-3 text-xs text-gray-500 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500/80" />
              Prueba gratuita de 14 días. Sin tarjeta de crédito.
            </motion.p>

            {/* Quick specifications icons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 pt-8 border-t border-white/[0.04] grid grid-cols-3 gap-4"
            >
              <div>
                <span className="block text-2xl font-bold text-white">99.8%</span>
                <span className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-wider uppercase mt-1 block">Uptime SLA</span>
              </div>
              <div className="border-l border-white/[0.04] pl-4">
                <span className="block text-2xl font-bold text-white">&lt; 1.2s</span>
                <span className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-wider uppercase mt-1 block">Latencia</span>
              </div>
              <div className="border-l border-white/[0.04] pl-4">
                <span className="block text-2xl font-bold text-white">SOC-2</span>
                <span className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-wider uppercase mt-1 block">Seguridad</span>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Interactive Spline 3D Scene */}
          <div className="lg:col-span-5 relative w-full aspect-square md:aspect-[4/3] lg:aspect-square flex items-center justify-center min-h-[350px] lg:min-h-[450px]">
            
            {/* Soft Ambient Radial Light Behind 3D model */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-indigo-500/5 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

            {mounted ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Loader Placeholder */}
                {!is3DLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400">
                    {/* Pulsing ring visual */}
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border border-purple-400/30 animate-pulse" />
                      <div className="absolute inset-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 blur-md opacity-40 animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold tracking-wider text-purple-400/80 animate-pulse uppercase">Cargando interactivo 3D...</span>
                  </div>
                )}
                
                {/* 3D Scene */}
                <div className={`w-full h-full transition-opacity duration-700 ${is3DLoaded ? 'opacity-100' : 'opacity-0'}`}>
                  <spline-viewer 
                    ref={splineRef}
                    url="https://prod.spline.design/o0gDyEcaiU1Fit9i/scene.splinecode"
                    loading-anim-type="none"
                  />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full border border-purple-500/20 animate-pulse" />
            )}

            {/* Overlay hint */}
            {is3DLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ delay: 2, duration: 4, repeat: Infinity, repeatDelay: 6 }}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-900/80 border border-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-semibold text-gray-400 tracking-wider uppercase pointer-events-none shadow-xl flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Usa tu cursor para interactuar</span>
              </motion.div>
            )}

          </div>

        </div>

      </div>

    </section>
  );
}
