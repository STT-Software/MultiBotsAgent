'use client';

import React, { useState, useEffect } from 'react';
import { EmbeddedSignupContainerProps } from './types';
import { useEmbeddedSignup } from './hooks/useEmbeddedSignup';
import { ConnectWhatsAppButton } from './components/ConnectWhatsAppButton';
import { ChannelStatusBadge } from './components/ChannelStatusBadge';
import { ReconnectBanner } from './components/ReconnectBanner';

export function EmbeddedSignupContainer({ agentId, currentChannel }: EmbeddedSignupContainerProps) {
  const {
    connect,
    connectManual,
    simulateMessage,
    disconnect,
    isConnecting,
    isSimulating,
    error,
    channelStatus,
    channelInfo,
    simulationResult,
  } = useEmbeddedSignup(agentId, currentChannel);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'embedded' | 'manual'>('manual');

  // Inicialización perezosa de campos manuales desde localStorage
  const [wabaId, setWabaId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`waba_id_${agentId}`) || '';
    }
    return '';
  });

  const [phoneNumberId, setPhoneNumberId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`phone_number_id_${agentId}`) || '';
    }
    return '';
  });

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`access_token_${agentId}`) || '';
    }
    return '';
  });

  const [pin, setPin] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`pin_${agentId}`) || '';
    }
    return '';
  });

  // Guardar en localStorage ante cualquier cambio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`waba_id_${agentId}`, wabaId);
    }
  }, [wabaId, agentId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`phone_number_id_${agentId}`, phoneNumberId);
    }
  }, [phoneNumberId, agentId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`access_token_${agentId}`, accessToken);
    }
  }, [accessToken, agentId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pin_${agentId}`, pin);
    }
  }, [pin, agentId]);

  // Variables para simulador
  const [simMessageText, setSimMessageText] = useState('Hola, ¿cómo funciona este bot?');
  const [simSenderPhone, setSimSenderPhone] = useState('573024883835');
  const [simSuccess, setSimSuccess] = useState(false);

  const isConnected = channelStatus === 'connected' || channelStatus === 'partially_connected';
  const requiresReconnection = channelStatus === 'requires_reconnection';

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wabaId || !phoneNumberId || !accessToken) return;
    await connectManual(wabaId, phoneNumberId, accessToken, pin || undefined);
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessageText) return;
    setSimSuccess(false);
    await simulateMessage(simMessageText, simSenderPhone);
    setSimSuccess(true);
  };

  return (
    <div className="space-y-6 w-full">
      {error && (
        <div 
          className="rounded-xl border p-4 text-sm transition-all duration-300 relative overflow-hidden"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.25)",
            color: "#ff8484",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.05)"
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
            <div>
              <p className="font-semibold" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>Error de conexión:</p>
              <p className="mt-1 font-mono text-xs opacity-90 leading-relaxed break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {requiresReconnection && (
        <ReconnectBanner onReconnect={connect} isLoading={isConnecting} />
      )}

      {isConnected ? (
        <div className="space-y-6">
          <ChannelStatusBadge 
            status={channelStatus!} 
            displayName={channelInfo?.displayName}
            phoneNumberId={channelInfo?.phoneNumberId}
          />

          {/* Webhook Simulation Widget */}
          <div 
            className="rounded-xl p-6 space-y-4 border transition-all duration-300 relative overflow-hidden"
            style={{
              backgroundColor: "rgba(26, 33, 28, 0.5)",
              borderColor: "#3c4a41",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
            }}
          >
            {/* Corner accent glow */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-xl pointer-events-none opacity-20"
              style={{ background: "radial-gradient(circle, #00bb7a, transparent 70%)" }}
            />

            <div>
              <h3 
                className="text-base font-semibold text-[#dde5dc] flex items-center gap-2" 
                style={{ fontFamily: 'Geist, Inter, sans-serif' }}
              >
                <span className="text-[#00bb7a] filter drop-shadow-[0_0_5px_rgba(0,187,122,0.4)]">⚡</span>
                Simulador de Mensajes Webhook
              </h3>
              <p className="text-xs text-[#869489] mt-1 leading-relaxed">
                Simula la recepción de un mensaje de WhatsApp entrante y encola un evento en la cola SQS de AWS. Útil para verificar que el procesamiento RAG y la respuesta de Bedrock funcionen de extremo a extremo.
              </p>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                    Número remitente
                  </label>
                  <input
                    type="text"
                    value={simSenderPhone}
                    onChange={(e) => setSimSenderPhone(e.target.value)}
                    placeholder="Ej. 573024883835"
                    className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40"
                    style={{ borderColor: "#3c4a41" }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                    Texto del mensaje
                  </label>
                  <input
                    type="text"
                    value={simMessageText}
                    onChange={(e) => setSimMessageText(e.target.value)}
                    placeholder="Escribe un mensaje de prueba..."
                    className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40"
                    style={{ borderColor: "#3c4a41" }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="rounded-lg px-5 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-105 active:scale-[0.98]"
                style={{
                  backgroundColor: "#00bb7a",
                  color: "#080e0a",
                  boxShadow: "0 2px 10px rgba(0, 187, 122, 0.2)"
                }}
              >
                {isSimulating ? 'Simulando...' : 'Enviar Mensaje Simulado'}
              </button>
            </form>

            {simSuccess && simulationResult && (
              <div 
                className="rounded-lg border p-4 text-sm space-y-2 mt-4"
                style={{
                  backgroundColor: "rgba(0, 187, 122, 0.04)",
                  borderColor: "rgba(0, 187, 122, 0.15)",
                  color: "#00cc85"
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#00bb7a] font-bold">✓</span>
                  <p className="font-semibold" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
                    ¡Mensaje simulado y encolado en SQS!
                  </p>
                </div>
                <p className="text-xs text-[#dde5dc]">
                  ID de Mensaje: <code className="bg-[#111713] px-2 py-0.5 rounded font-mono border text-[#00bb7a]" style={{ borderColor: "rgba(0, 187, 122, 0.2)" }}>{simulationResult.messageId}</code>
                </p>
                <p className="text-xs text-[#869489] leading-relaxed">
                  El motor RAG procesará este mensaje en segundo plano. Puedes monitorear la respuesta final en los registros de CloudWatch o en el panel de Inbox del agente.
                </p>
              </div>
            )}
          </div>

          <div 
            className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center rounded-xl p-5 border"
            style={{
              backgroundColor: "rgba(26, 33, 28, 0.3)",
              borderColor: "#3c4a41",
            }}
          >
            <span className="text-xs text-[#869489]">
              ¿Deseas conectar otra cuenta o actualizar este número de teléfono?
            </span>
            <button
              onClick={disconnect}
              disabled={isConnecting}
              className="w-full sm:w-auto rounded-lg border bg-transparent px-4 py-2.5 text-xs font-semibold text-[#ef4444] transition-all hover:bg-[#ef4444]/10 hover:border-[#ef4444]/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              style={{ borderColor: "rgba(239, 68, 68, 0.25)" }}
            >
              {isConnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="rounded-xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: "rgba(20, 26, 22, 0.6)",
            borderColor: "#3c4a41",
            backdropFilter: "blur(12px)"
          }}
        >
          {/* Tabs header */}
          <div 
            className="flex border-b"
            style={{
              backgroundColor: "rgba(14, 21, 16, 0.8)",
              borderColor: "#3c4a41"
            }}
          >
            <button
              onClick={() => setActiveTab('embedded')}
              className={`flex-1 py-3.5 text-center text-xs font-semibold transition-all relative ${
                activeTab === 'embedded'
                  ? 'text-[#00bb7a] bg-transparent'
                  : 'text-[#869489] hover:text-[#dde5dc] hover:bg-white/5'
              }`}
              style={{ fontFamily: 'Geist, Inter, sans-serif' }}
            >
              Meta Embedded Signup (Recomendado)
              {activeTab === 'embedded' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00bb7a]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3.5 text-center text-xs font-semibold transition-all relative ${
                activeTab === 'manual'
                  ? 'text-[#00bb7a] bg-transparent'
                  : 'text-[#869489] hover:text-[#dde5dc] hover:bg-white/5'
              }`}
              style={{ fontFamily: 'Geist, Inter, sans-serif' }}
            >
              Configuración Manual
              {activeTab === 'manual' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00bb7a]" />
              )}
            </button>
          </div>

          {/* Tabs body */}
          <div className="p-6 sm:p-8">
            {activeTab === 'embedded' ? (
              <div className="space-y-5 text-center max-w-md mx-auto py-4">
                <div className="inline-flex items-center justify-center rounded-full bg-[#00bb7a]/10 px-3 py-1 mb-2 border border-[#00bb7a]/20">
                  <span className="text-xs font-medium text-[#00bb7a]">En desarrollo</span>
                </div>
                <p className="text-xs text-[#869489] leading-relaxed">
                  La integración de Meta Embedded Signup se encuentra actualmente en desarrollo para mejorar la seguridad. 
                  Por favor, utiliza la pestaña de configuración manual e introduce tus credenciales directamente.
                </p>
                <div className="pt-2 flex justify-center">
                  <ConnectWhatsAppButton
                    onConnect={connect}
                    isLoading={isConnecting}
                    disabled={true}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-5 max-w-md mx-auto">
                <p className="text-xs text-[#869489] leading-relaxed text-center sm:text-left">
                  Introduce las credenciales de tu cuenta de Meta Developers y de WhatsApp Business Account para establecer una conexión manual directa.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      WABA ID (WhatsApp Business Account ID)
                    </label>
                    <input
                      type="text"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="Ej. 123456789012345"
                      className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40"
                      style={{ borderColor: "#3c4a41" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="Ej. 987654321098765"
                      className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40"
                      style={{ borderColor: "#3c4a41" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      PIN de verificación en dos pasos (Opcional)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 000000 (Por defecto)"
                      className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40 font-mono"
                      style={{ borderColor: "#3c4a41" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      Access Token (Larga duración)
                    </label>
                    <textarea
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAASyO..."
                      rows={4}
                      className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-xs font-mono text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#00bb7a]/40 leading-relaxed resize-none"
                      style={{ borderColor: "#3c4a41" }}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full rounded-lg px-5 py-3 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-105 active:scale-[0.98]"
                    style={{
                      backgroundColor: "#00bb7a",
                      color: "#080e0a",
                      boxShadow: "0 2px 12px rgba(0, 187, 122, 0.15)"
                    }}
                  >
                    {isConnecting ? 'Guardando y Conectando...' : 'Guardar y Conectar Canal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
