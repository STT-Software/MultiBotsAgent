"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCheck, Bot, Database, Calendar, Calculator, Sparkles, BookOpen } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  source?: string;
}

interface Scenario {
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: {
    userPrompt: string;
    botResponse: string;
    source: string;
    context: {
      intent: string;
      sourceFile: string;
      entities: string;
    };
  }[];
}

const scenarios: Scenario[] = [
  {
    title: 'RAG / Base de Conocimiento',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'El bot responde preguntas complejas leyendo documentos corporativos indexados.',
    steps: [
      {
        userPrompt: '¿Cuáles son sus tiempos de entrega para envíos internacionales y qué cubre la garantía?',
        botResponse: 'Los envíos internacionales tardan de 5 a 10 días hábiles. Nuestra Garantía Global cubre fallas técnicas de fábrica por 12 meses, incluyendo envío de retorno sin costo.',
        source: 'politica_de_envios_2026.pdf (Pág 14)',
        context: {
          intent: 'consultar_politicas_envio_garantia',
          sourceFile: 'politica_de_envios_2026.pdf',
          entities: 'Internacional, 12 meses',
        }
      }
    ]
  },
  {
    title: 'Agendamiento Automatizado',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Extrae fechas y organiza reuniones conectando calendarios en tiempo real.',
    steps: [
      {
        userPrompt: 'Quiero agendar una demo de producto mañana a las 3:00 PM con Carlos.',
        botResponse: '¡Perfecto! He agendado la demo mañana a las 3:00 PM (GMT-5). Se te ha enviado una invitación a tu correo y el calendario de Carlos ya está bloqueado.',
        source: 'Google Calendar API integration',
        context: {
          intent: 'agendar_reunion',
          sourceFile: 'Integración Calendar / Carlos V.',
          entities: 'Mañana, 15:00, Carlos',
        }
      }
    ]
  },
  {
    title: 'Cotizador Dinámico',
    icon: <Calculator className="w-5 h-5" />,
    description: 'Calcula presupuestos sobre la marcha interpretando requerimientos.',
    steps: [
      {
        userPrompt: 'Necesito una cotización para 15 usuarios en el Plan Enterprise con RAG avanzado.',
        botResponse: 'Para 15 usuarios en el Plan Enterprise con RAG: $49/mes por usuario ($735/mes en total). Incluye soporte prioritario 24/7 y 50 GB de almacenamiento vectorial.',
        source: 'tablas_de_precios_v2.csv',
        context: {
          intent: 'solicitar_cotizacion',
          sourceFile: 'tablas_de_precios_v2.csv',
          entities: '15 usuarios, Plan Enterprise, RAG',
        }
      }
    ]
  }
];

export default function InteractiveChatDemo() {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeContext, setActiveContext] = useState({
    intent: 'Esperando prompt...',
    sourceFile: 'Ninguno',
    entities: 'Ninguno',
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isAutoplayActive, setIsAutoplayActive] = useState(true);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer to detect when section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    const currentSection = sectionRef.current;
    if (currentSection) {
      observer.observe(currentSection);
    }

    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, []);

  // Autoplay sequence when section is in viewport
  useEffect(() => {
    if (!isInView || !isAutoplayActive) return;

    let active = true;
    let timeoutId: NodeJS.Timeout;

    const runSequence = async () => {
      // 1. Initial pause before starting scenario simulation
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 2000);
      });
      if (!active) return;

      const scenario = scenarios[selectedScenarioIdx];
      const step = scenario.steps[0];

      // Add user message
      const userMsg: Message = {
        id: `user-auto-${Date.now()}`,
        sender: 'user',
        text: step.userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setActiveStep(1);
      setActiveContext({
        intent: step.context.intent,
        sourceFile: 'Escaneando archivos...',
        entities: step.context.entities,
      });

      // Typing animation delay
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 2500);
      });
      if (!active) return;

      // Add bot message
      const botMsg: Message = {
        id: `bot-auto-${Date.now()}`,
        sender: 'bot',
        text: step.botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: step.source,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
      setActiveContext({
        intent: step.context.intent,
        sourceFile: step.context.sourceFile,
        entities: step.context.entities,
      });

      // Wait before moving to next scenario
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 6000);
      });
      if (!active) return;

      // Switch to next scenario (looping)
      setSelectedScenarioIdx((prev) => (prev + 1) % scenarios.length);
    };

    runSequence();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [isInView, isAutoplayActive, selectedScenarioIdx]);

  // Initialize with welcome message
  useEffect(() => {
    resetDemo();
  }, [selectedScenarioIdx]);

  const resetDemo = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: '¡Hola! Soy tu asistente inteligente MultiBot. Elige una de las opciones de la izquierda para ver cómo respondo basándome en tus fuentes de datos.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setActiveStep(0);
    setActiveContext({
      intent: 'Esperando prompt...',
      sourceFile: 'Ninguno',
      entities: 'Ninguno',
    });
    setIsTyping(false);
  };

  const triggerScenarioStep = async () => {
    const scenario = scenarios[selectedScenarioIdx];
    if (activeStep >= scenario.steps.length) return;

    const step = scenario.steps[activeStep];

    // 1. Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: step.userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setActiveStep((prev) => prev + 1);
    setIsTyping(true);

    // Update Context to reflect search
    setActiveContext({
      intent: step.context.intent,
      sourceFile: 'Escaneando archivos...',
      entities: step.context.entities,
    });

    // Simulate database lookup & delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Add bot reply
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: step.botResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: step.source,
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, botMsg]);
    setActiveContext({
      intent: step.context.intent,
      sourceFile: step.context.sourceFile,
      entities: step.context.entities,
    });
  };

  // Scroll to bottom
  useEffect(() => {
    if (messages.length > 1 || isTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isTyping]);

  return (
    <section id="demo" ref={sectionRef} className="py-24 bg-transparent relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Mira la IA{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              en acción
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Haz clic en los escenarios interactivos para ver cómo responde el bot y cómo consulta tu base de datos en tiempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel — Scenario Selector */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              {scenarios.map((scenario, idx) => (
                <button
                  key={scenario.title}
                  onClick={() => {
                    setIsAutoplayActive(false);
                    setSelectedScenarioIdx(idx);
                  }}
                  className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                    selectedScenarioIdx === idx
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : 'bg-gray-900/40 border-gray-900 hover:border-gray-800 hover:bg-gray-900/60'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                    selectedScenarioIdx === idx ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {scenario.icon}
                  </span>
                  <div>
                    <h3 className={`text-base font-bold transition-colors ${
                      selectedScenarioIdx === idx ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{scenario.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Action launcher */}
            <div className="bg-gray-900/30 border border-gray-900 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" /> Ejecución interactiva
                </div>
                {isAutoplayActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Autoplay
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-950 text-gray-400 border border-gray-850">
                    Manual
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {isAutoplayActive 
                  ? "El demo se está reproduciendo automáticamente. Haz clic en cualquier botón para controlarlo manualmente."
                  : "Lanza el prompt simulado para ver el flujo exacto de extracción de entidades y búsqueda RAG."
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsAutoplayActive(false);
                    triggerScenarioStep();
                  }}
                  disabled={activeStep > 0 || isTyping}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-400 transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  Enviar Mensaje <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setIsAutoplayActive(false);
                    resetDemo();
                  }}
                  className="px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-700 bg-gray-900 text-gray-400 hover:text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
            </div>
          </div>

          {/* Right panel — WhatsApp Mock & Active Context */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Live context monitor panel */}
            <div className="md:col-span-5 bg-gray-900/30 border border-gray-900 rounded-3xl p-5 flex flex-col gap-5 justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> Monitor del Agente
                </h4>
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Intención Detectada</span>
                    <span className="text-sm font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-500/10 px-2 py-1 rounded block mt-1 overflow-x-auto whitespace-nowrap">
                      {activeContext.intent}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Archivo Consultador</span>
                    <span className="text-sm font-semibold text-gray-300 mt-1 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate">{activeContext.sourceFile}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Entidades Extraídas</span>
                    <span className="text-xs font-mono text-gray-400 mt-1 block">
                      {activeContext.entities}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-4 text-[11px] text-gray-500 leading-relaxed">
                El conector RAG de MultiBot parsea la pregunta, recupera fragmentos indexados en MongoDB Atlas Vector Search y construye el prompt final en milisegundos.
              </div>
            </div>

            {/* Simulated WhatsApp Device */}
            <div className="md:col-span-7 bg-[#0b141a] rounded-3xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden min-h-[460px] relative">
              {/* WhatsApp Header */}
              <div className="bg-[#1f2c34] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Bot className="w-5 h-5" />
                    </span>
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#1f2c34]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none">MultiBot AI Agent</h4>
                    <span className="text-[10px] text-emerald-400 font-medium">En línea</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 text-[#aebac1]">
                  {/* Visual dots */}
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] relative">
                {/* Background wash overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.03] select-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />

                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col max-w-[85%] relative rounded-xl px-3 py-2 text-sm shadow-md ${
                        msg.sender === 'user'
                          ? 'ml-auto bg-[#005c4b] text-[#e9edef]'
                          : 'bg-[#202c33] text-[#e9edef]'
                      }`}
                    >
                      <div>{msg.text}</div>
                      
                      {msg.source && (
                        <div className="mt-1.5 pt-1.5 border-t border-[#2a3942] text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <Database className="w-3 h-3 shrink-0" /> Fuente: {msg.source}
                        </div>
                      )}

                      <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-[#8696a0] self-end">
                        {msg.timestamp}
                        {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 bg-[#202c33] text-[#e9edef] rounded-xl px-4 py-3 text-xs w-[140px] shadow-md"
                    >
                      <span className="font-semibold">Agente escribe</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-200" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-300" />
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input placeholder */}
              <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3 border-t border-[#2a3942]">
                <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-2 text-xs text-[#aebac1] select-none flex items-center justify-between">
                  <span>Mensaje simulado</span>
                  <Send className="w-4 h-4 opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
