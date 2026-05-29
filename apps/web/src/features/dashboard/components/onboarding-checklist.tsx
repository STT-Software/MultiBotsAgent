"use client";

import { CheckCircle2, Circle, ArrowRight, Bot, BookOpen, MessageSquare, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

interface OnboardingChecklistProps {
  totalAgents: number;
}

export function OnboardingChecklist({ totalAgents }: OnboardingChecklistProps) {
  // El primer paso se marca como completado si ya hay al menos 1 agente creado.
  const steps = [
    {
      id: "crear-agente",
      title: "Crear tu primer Agente",
      description: "Define el rol, el tono y las instrucciones personalizadas de tu asistente.",
      completed: totalAgents > 0,
      href: "/agentes/crear",
      actionText: "Crear agente",
      icon: <Bot className="h-5 w-5" />,
    },
    {
      id: "entrenar-conocimiento",
      title: "Subir Base de Conocimiento",
      description: "Sube archivos PDF, FAQs o URLs para entrenar a tu agente en tu negocio.",
      completed: false,
      href: "/agentes",
      actionText: "Ir a Agentes",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      id: "conectar-whatsapp",
      title: "Conectar Canal Conversacional",
      description: "Asocia WhatsApp Business o integra el widget web en tu sitio.",
      completed: false,
      href: "/settings",
      actionText: "Configurar canales",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: "probar-chat",
      title: "Probar el bot en vivo",
      description: "Realiza una prueba de chat interactiva para ver cómo responde la IA.",
      completed: false,
      href: "/inbox",
      actionText: "Probar Chat",
      icon: <HelpCircle className="h-5 w-5" />,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between hover:border-gray-800/90 transition-all duration-300">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-inter)] text-xl font-bold text-gray-200">
              Guía de Configuración
            </h2>
            <p className="font-[family-name:var(--font-inter)] text-sm text-gray-400 mt-1">
              Completa estos pasos para activar tus agentes conversacionales.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className="font-mono text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {progressPercent}% Completado
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800/60 rounded-full h-2 mb-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>

        {/* Steps List */}
        <div className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                step.completed
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-gray-900/20 border-gray-800/50 hover:border-gray-800"
              }`}
            >
              <div className="mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-600 shrink-0" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-[family-name:var(--font-inter)] text-sm font-bold ${
                    step.completed ? "text-emerald-400" : "text-gray-200"
                  }`}>
                    {step.title}
                  </h3>
                  <span className="text-gray-600 shrink-0">
                    {step.icon}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-inter)] text-xs text-gray-400 mt-1 leading-relaxed">
                  {step.description}
                </p>
                
                {!step.completed && (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 mt-3 font-[family-name:var(--font-inter)] text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {step.actionText}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
