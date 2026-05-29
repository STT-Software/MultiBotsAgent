"use client";

import { ShoppingCart, Sparkles, Send, ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

interface MarketingCardProps {
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  actionText: string;
  href: string;
  features: string[];
}

function MarketingCard({ title, description, badge, icon, actionText, href, features }: MarketingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015, translateY: -4 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur-md p-6 flex flex-col justify-between hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 group"
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-500" />
      
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <span className="font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 rounded-full">
            {badge}
          </span>
        </div>

        <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold text-gray-200 group-hover:text-emerald-300 transition-colors mb-2">
          {title}
        </h3>
        
        <p className="font-[family-name:var(--font-inter)] text-sm text-gray-400 mb-5 leading-relaxed">
          {description}
        </p>

        {/* Feature points */}
        <ul className="flex flex-col gap-2.5 mb-6">
          {features.map((feat, idx) => (
            <li key={idx} className="flex items-center gap-2 font-[family-name:var(--font-inter)] text-xs text-gray-400">
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" strokeWidth={3} />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={href}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-sm font-semibold text-emerald-400 transition-all duration-300 py-2.5 group-hover:border-emerald-500/40"
      >
        {actionText}
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

export function MarketingFeatures() {
  return (
    <div className="mt-2">
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-inter)] text-xl font-bold text-gray-200">
          Potencia tu Negocio con Funcionalidades Premium
        </h2>
        <p className="font-[family-name:var(--font-inter)] text-sm text-gray-400 mt-1">
          Lleva tus bots al siguiente nivel conectándolos con tus herramientas diarias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MarketingCard
          title="WhatsApp + Tienda Online"
          description="Sincroniza tus catálogos de productos de Shopify o WooCommerce. El bot cotiza precios, valida stock y genera carritos."
          badge="Popular"
          icon={<ShoppingCart className="h-6 w-6" />}
          actionText="Ver Integraciones"
          href="/settings"
          features={[
            "Cotizaciones en tiempo real",
            "Gestión de stock automática",
            "Enlace de pago por chat",
          ]}
        />
        <MarketingCard
          title="Entrenamiento IA Avanzado (RAG)"
          description="Alimenta tus agentes con PDFs extensos, hojas de cálculo o sitios web enteros. Precisión absoluta en preguntas complejas."
          badge="IA Premium"
          icon={<Sparkles className="h-6 w-6" />}
          actionText="Gestionar Conocimiento"
          href="/agentes"
          features={[
            "Búsqueda semántica inteligente",
            "Soporta PDF, Word, Excel y Web",
            "Actualizaciones de datos en segundos",
          ]}
        />
        <MarketingCard
          title="Campañas Masivas por WhatsApp"
          description="Planifica envíos de notificaciones autorizadas de citas o cobros, y deja que tus bots gestionen y califiquen las respuestas."
          badge="Alta Conversión"
          icon={<Send className="h-6 w-6" />}
          actionText="Crear Campaña"
          href="/pedidos" // o la sección correspondiente
          features={[
            "Plantillas autorizadas por Meta",
            "Programación y automatización",
            "Estadísticas de apertura y lectura",
          ]}
        />
      </div>
    </div>
  );
}
