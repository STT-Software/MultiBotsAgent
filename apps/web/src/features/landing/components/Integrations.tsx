"use client";

import { motion } from 'motion/react';
import { Database, FileText, Globe, Bot, MessageSquare, Zap, Cpu } from 'lucide-react';

export default function Integrations() {
  const sources = [
    { name: 'Documentos PDF / Office', icon: <FileText className="w-5 h-5 text-amber-400" /> },
    { name: 'MongoDB / Postgres', icon: <Database className="w-5 h-5 text-blue-400" /> },
    { name: 'Scraping Web', icon: <Globe className="w-5 h-5 text-teal-400" /> },
  ];

  const channels = [
    { name: 'WhatsApp Business API', icon: <MessageSquare className="w-5 h-5 text-emerald-400" /> },
    { name: 'Widget Web Chat', icon: <Bot className="w-5 h-5 text-indigo-400" /> },
    { name: 'Webhooks / API Custom', icon: <Zap className="w-5 h-5 text-amber-400" /> },
  ];

  return (
    <section id="integrations" className="py-24 bg-transparent relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Flujo de datos{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              sin interrupciones
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Conecta tus bases de información a la velocidad de la luz y publica tus agentes de conversación en múltiples canales.
          </p>
        </div>

        {/* Visual Pipeline Wrapper */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Left Column: Data Sources */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center lg:text-left mb-2">Fuentes de Datos</h3>
            {sources.map((src, i) => (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-gray-900/40 border border-gray-900 hover:border-gray-800 transition-all duration-300 shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 shrink-0">
                  {src.icon}
                </span>
                <span className="text-sm font-semibold text-gray-300">{src.name}</span>
              </motion.div>
            ))}
          </div>

          {/* Center Column: Core Engine with pulsing lines */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center py-8 lg:py-0 relative">
            
             {/* Animated Flowing SVG Tracks (Desktop) */}
             <div className="absolute inset-0 pointer-events-none -z-10 hidden lg:block">
               {/* Left-to-Center Connection */}
               <div className="absolute right-[55%] left-[-45%] top-[50%] -translate-y-1/2 h-8">
                 <svg className="w-full h-full" viewBox="0 0 200 10" preserveAspectRatio="none">
                   <path d="M 0 5 H 200" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" />
                   <path d="M 0 5 H 200" fill="none" stroke="url(#laser-gradient)" strokeWidth="2.5" strokeDasharray="15 40" className="animate-dash-flow" />
                 </svg>
               </div>
               {/* Center-to-Right Connection */}
               <div className="absolute left-[55%] right-[-45%] top-[50%] -translate-y-1/2 h-8">
                 <svg className="w-full h-full" viewBox="0 0 200 10" preserveAspectRatio="none">
                   <path d="M 0 5 H 200" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" />
                   <path d="M 0 5 H 200" fill="none" stroke="url(#laser-gradient)" strokeWidth="2.5" strokeDasharray="15 40" className="animate-dash-flow" />
                 </svg>
               </div>
               <svg className="absolute w-0 h-0">
                 <defs>
                   <linearGradient id="laser-gradient" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                     <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                     <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                   </linearGradient>
                 </defs>
               </svg>
             </div>

             {/* Animated Flowing SVG Tracks (Mobile Stack) */}
             <div className="absolute inset-0 pointer-events-none -z-10 lg:hidden flex flex-col items-center justify-between py-12">
               <svg className="h-16 w-8" viewBox="0 0 10 100" preserveAspectRatio="none">
                 <path d="M 5 0 V 100" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.5" />
                 <path d="M 5 0 V 100" fill="none" stroke="url(#laser-gradient-vert)" strokeWidth="3" strokeDasharray="15 40" className="animate-dash-flow" />
               </svg>
               <svg className="h-16 w-8" viewBox="0 0 10 100" preserveAspectRatio="none">
                 <path d="M 5 0 V 100" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1.5" />
                 <path d="M 5 0 V 100" fill="none" stroke="url(#laser-gradient-vert)" strokeWidth="3" strokeDasharray="15 40" className="animate-dash-flow" />
               </svg>
               <svg className="absolute w-0 h-0">
                 <defs>
                   <linearGradient id="laser-gradient-vert" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                     <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                     <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                   </linearGradient>
                 </defs>
               </svg>
             </div>

            {/* Core Brain Node */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative p-8 rounded-3xl bg-gray-900/80 border border-emerald-500/30 shadow-2xl shadow-emerald-500/5 text-center flex flex-col items-center gap-3 z-10 max-w-[280px]"
            >
              <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald-500/5 blur-xl pointer-events-none" />
              
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30">
                <Cpu className="w-7 h-7 animate-pulse" />
              </span>
              
              <h4 className="text-base font-bold text-white tracking-tight mt-2">MultiBot Engine</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                RAG embeddings vectoriales, filtro de intenciones y orquestación inteligente de modelos.
              </p>
            </motion.div>
          </div>

          {/* Right Column: Channels */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center lg:text-left mb-2">Canales de Salida</h3>
            {channels.map((chan, i) => (
              <motion.div
                key={chan.name}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-gray-900/40 border border-gray-900 hover:border-gray-800 transition-all duration-300 shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 shrink-0">
                  {chan.icon}
                </span>
                <span className="text-sm font-semibold text-gray-300">{chan.name}</span>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
