"use client";

import { motion } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Pricing() {
  const plans = [
    {
      name: 'Plan Inicial',
      price: '$0',
      description: 'Ideal para desarrolladores y startups probando flujos de IA.',
      features: [
        '1 Agente de IA activo',
        'Hasta 500 conversaciones al mes',
        'Carga de archivos PDF y Texto',
        'Integración Web Widget básica',
        'Soporte comunitario',
      ],
      cta: 'Empezar Gratis',
      href: '/register?plan=free',
      popular: false,
    },
    {
      name: 'Plan Profesional',
      price: '$29',
      description: 'Perfecto para negocios en crecimiento automatizando WhatsApp.',
      features: [
        '5 Agentes de IA activos',
        'Hasta 15,000 conversaciones al mes',
        'Conector RAG Vectorial Completo',
        'Integración WhatsApp Business API',
        'Módulo de Traspaso Humano (Handoff)',
        'Soporte por correo en 24h',
      ],
      cta: 'Probar Profesional',
      href: '/register?plan=pro',
      popular: true,
    },
    {
      name: 'Plan Corporativo',
      price: '$89',
      description: 'Para grandes empresas con alto volumen y soporte especializado.',
      features: [
        'Agentes de IA ilimitados',
        'Volumen de mensajes personalizado',
        'Embeddings en base de datos dedicada',
        'SLA de respuesta garantizado',
        'Soporte prioritario 24/7 y Slack dedicado',
        'Integraciones a la medida vía API',
      ],
      cta: 'Contactar Soporte',
      href: '/register?plan=enterprise',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-transparent relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Planes a la medida de{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              tu negocio
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Escala tus agentes de conversación a medida que crecen tus interacciones con clientes.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`relative flex flex-col justify-between p-8 rounded-3xl border bg-gray-950/40 backdrop-blur-md transition-all duration-300 ${
                plan.popular
                  ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/5 scale-100 md:scale-[1.03] z-10'
                  : 'border-gray-900 hover:border-gray-800'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-gray-950 uppercase tracking-widest">
                  Más Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-sm font-semibold text-gray-500">/mes</span>}
                </div>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">{plan.description}</p>

                {/* Features List */}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to action */}
              <div className="mt-8 pt-4">
                <Link
                  href={plan.href}
                  className={`w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                    plan.popular
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800/80 hover:border-gray-700'
                  } group`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
