"use client";

import { useState, type MouseEvent, type ReactNode } from 'react';
import { Database, MessageSquare, Headset, BarChart3, ShieldCheck, Cpu } from 'lucide-react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

function FeatureCard({ icon, title, description, badge, className = '' }: FeatureCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-3xl border border-gray-900 bg-gray-950/40 backdrop-blur-md p-8 transition-all duration-300 ${className}`}
    >
      {/* Spotlight Radial Gradient on Hover */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, rgba(16, 185, 129, 0.08), transparent 80%)`,
        }}
      />

      {/* Border Glow Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-3xl"
        style={{
          opacity: isHovered ? 1 : 0,
          border: '1px solid rgba(16, 185, 129, 0.25)',
          maskImage: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, black, transparent)`,
        }}
      />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-start">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              {icon}
            </span>
            {badge && (
              <span className="rounded-full bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>

          <h3 className="mt-6 text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 bg-transparent border-t border-gray-900/60 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            La potencia de un{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              equipo de IA autónomo
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Una infraestructura robusta, segura y escalable que transforma tu conocimiento corporativo en respuestas inmediatas.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* Card 1: Vector RAG (Large) */}
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Base de Conocimiento RAG Avanzada"
            description="Indexa automáticamente archivos PDF, Word, CSV, scraping de URL o texto plano. Los fragmentos se convierten en embeddings vectoriales consultables en milisegundos."
            badge="Vector Search"
            className="md:col-span-4 min-h-[260px]"
          />

          {/* Card 2: WhatsApp (Small) */}
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Integración WhatsApp"
            description="Conecta tu cuenta de Meta de forma nativa. Respuestas inmediatas, control de tasas de envío e inicio automático de plantillas aprobadas."
            badge="Nativo"
            className="md:col-span-2"
          />

          {/* Card 3: Human Handoff (Small) */}
          <FeatureCard
            icon={<Headset className="w-6 h-6" />}
            title="Traspaso Humano (Handoff)"
            description="Cuando el cliente lo solicite, la IA transfiere la conversación a un operador de soporte en un panel de control unificado."
            badge="Híbrido"
            className="md:col-span-2"
          />

          {/* Card 4: Analytics (Large) */}
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Analítica en Tiempo Real"
            description="Visualiza el desempeño de tus agentes de IA: número de conversaciones resueltas con éxito, tiempos promedio de respuesta, costos de tokens de LLM y tasas de retención."
            badge="Estadísticas"
            className="md:col-span-4 min-h-[260px]"
          />

          {/* Card 5: Security (Small-Medium) */}
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Seguridad Enterprise"
            description="Tus datos corporativos se almacenan de forma segura con encriptación en reposo y en tránsito. Diseñado bajo estándares de cumplimiento SOC-2."
            badge="Seguro"
            className="md:col-span-3"
          />

          {/* Card 6: Custom Engine */}
          <FeatureCard
            icon={<Cpu className="w-6 h-6" />}
            title="Orquestación Multi-LLM"
            description="Alterna sin problemas entre modelos avanzados como Claude, GPT-4 y Llama 3 a través de AWS Bedrock para optimizar costos y velocidad."
            badge="Motor"
            className="md:col-span-3"
          />
        </div>
      </div>
    </section>
  );
}
