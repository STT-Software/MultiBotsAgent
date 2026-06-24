'use client';

import React, { useState, useEffect } from 'react';
import { EmbeddedSignupContainerProps } from './types';
import { useEmbeddedSignup } from './hooks/useEmbeddedSignup';
import { ConnectWhatsAppButton } from './components/ConnectWhatsAppButton';
import { ChannelStatusBadge } from './components/ChannelStatusBadge';
import { ReconnectBanner } from './components/ReconnectBanner';

const WhatsAppIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.848.502 3.578 1.377 5.071L2 22l5.09-1.33c1.433.784 3.064 1.233 4.795 1.233 5.524 0 10.115-4.479 10.115-10.003C22 6.48 17.524 2 12.004 2zm6.657 13.918c-.249.663-1.442 1.23-2.02 1.38-.524.137-1.185.172-1.902-.06-3.05-1.272-5.042-4.344-5.19-4.542-.15-.198-1.24-1.647-1.24-3.146 0-1.498.786-2.24 1.066-2.54.279-.3.61-.376.812-.376.203 0 .408.002.586.01.185.01.448-.09.69.51.247.595.918 2.23.993 2.38.075.149.124.322.025.52-.099.199-.149.323-.298.497-.149.173-.312.387-.446.52-.149.148-.303.309-.13.606.173.298.77 1.271 1.653 2.059 1.135 1.012 2.093 1.325 2.39 1.475.298.149.471.124.645-.075.173-.198.743-.867.94-1.164.199-.298.397-.249.671-.15.277.1.1.2.378.3.272.099 1.782.818 2.03.967.249.149.414.223.473.34.059.12.059.687-.19 1.35z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.66-.52.36-1 .54-1.42.53-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.36-.49 1.01-.74 3.96-1.72 6.6-2.86 7.92-3.41 3.77-1.57 4.55-1.84 5.06-1.85.11 0 .36.03.52.16.14.12.18.28.2.4.02.07.03.21.01.3z" />
  </svg>
);

export function EmbeddedSignupContainer({ agentId, currentChannel }: EmbeddedSignupContainerProps) {
  const {
    connect,
    connectManual,
    connectTelegram,
    simulateMessage,
    simulateTelegramMessage,
    disconnect,
    checkWebhookInfo,
    configureWebhook,
    isConnecting,
    isSimulating,
    isCheckingWebhook,
    isConfiguringWebhook,
    error,
    channelStatus,
    channelInfo,
    simulationResult,
    webhookInfo,
  } = useEmbeddedSignup(agentId, currentChannel);

  // Selector del canal activo a configurar (solo si no está conectado)
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');

  // Pestaña activa en WhatsApp
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

  // Campos para Telegram
  const [botToken, setBotToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`telegram_bot_token_${agentId}`) || '';
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`telegram_bot_token_${agentId}`, botToken);
    }
  }, [botToken, agentId]);

  // Variables para simuladores
  const [simMessageText, setSimMessageText] = useState('Hola, ¿cómo funciona este bot?');
  const [simSenderPhone, setSimSenderPhone] = useState('573024883835');
  const [simSenderTelegram, setSimSenderTelegram] = useState('usuario_telegram_test');
  const [simSuccess, setSimSuccess] = useState(false);

  // URL base para registro del webhook
  const [customWebhookUrl, setCustomWebhookUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || window.location.origin || '';
    }
    return '';
  });

  const isConnected = channelStatus === 'connected' || channelStatus === 'partially_connected';
  const requiresReconnection = channelStatus === 'requires_reconnection';

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wabaId || !phoneNumberId || !accessToken) return;
    await connectManual(wabaId, phoneNumberId, accessToken, pin || undefined);
  };

  const handleTelegramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken) return;
    await connectTelegram(botToken);
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessageText) return;
    setSimSuccess(false);

    if (channelInfo?.provider === 'telegram') {
      await simulateTelegramMessage(simMessageText, simSenderTelegram);
    } else {
      await simulateMessage(simMessageText, simSenderPhone);
    }
    setSimSuccess(true);
  };

  if (isConnecting && !channelStatus && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-[#3c4a41]/30" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#00bb7a] animate-spin" />
        </div>
        <p className="text-xs text-[#869489] animate-pulse" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
          Configurando canal con el agente...
        </p>
      </div>
    );
  }

  const activeProvider = channelInfo?.provider || 'whatsapp';

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
              <p className="font-semibold" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>Error en canal:</p>
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
            telegramBotUsername={channelInfo?.telegramBotUsername}
            provider={activeProvider}
          />

          {/* Telegram Webhook Configuration Widget */}
          {activeProvider === 'telegram' && (
            <div 
              className="rounded-xl p-6 space-y-4 border transition-all duration-300 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(26, 33, 28, 0.5)",
                borderColor: "#3c4a41",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
              }}
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full filter blur-2xl pointer-events-none opacity-20 transition-all duration-500"
                style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 
                    className="text-base font-semibold text-[#dde5dc] flex items-center gap-2" 
                    style={{ fontFamily: 'Geist, Inter, sans-serif' }}
                  >
                    <span style={{ color: '#38bdf8' }}>🌐</span>
                    Configuración de Webhook de Telegram
                  </h3>
                  <p className="text-xs text-[#869489] mt-1 leading-relaxed">
                    Configura la URL de tu API para que Telegram envíe los mensajes del bot a tu plataforma en tiempo real.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={checkWebhookInfo}
                  disabled={isCheckingWebhook}
                  className="rounded-lg border bg-transparent px-4 py-2 text-xs font-semibold text-[#38bdf8] border-[#38bdf8]/30 hover:bg-[#38bdf8]/10 transition-all duration-200 active:scale-[0.98]"
                >
                  {isCheckingWebhook ? 'Verificando...' : '🔄 Actualizar Estado'}
                </button>
              </div>

              {/* Webhook Status / Info */}
              {webhookInfo && webhookInfo.ok && (
                <div 
                  className="rounded-lg p-4 text-xs space-y-2.5 font-mono"
                  style={{
                    backgroundColor: "rgba(20, 26, 22, 0.8)",
                    borderColor: "#3c4a41",
                    borderWidth: "1px"
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#dde5dc]">
                    <div>
                      <span className="text-[#869489]">URL Registrada:</span>{' '}
                      <span className="break-all text-[#38bdf8]">
                        {webhookInfo.result?.url ? webhookInfo.result.url : '(Sin registrar / Polling activo)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#869489]">Mensajes Pendientes:</span>{' '}
                      <span className="text-[#dde5dc]">{webhookInfo.result?.pending_update_count ?? 0}</span>
                    </div>
                    {webhookInfo.result?.ip_address && (
                      <div>
                        <span className="text-[#869489]">IP del Servidor:</span>{' '}
                        <span className="text-[#dde5dc]">{webhookInfo.result.ip_address}</span>
                      </div>
                    )}
                    {webhookInfo.result?.max_connections && (
                      <div>
                        <span className="text-[#869489]">Conexiones Máx:</span>{' '}
                        <span className="text-[#dde5dc]">{webhookInfo.result.max_connections}</span>
                      </div>
                    )}
                  </div>

                  {webhookInfo.result?.last_error_message && (
                    <div 
                      className="rounded p-2 text-[11px] leading-relaxed"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        color: "#ff8484",
                        border: "1px solid rgba(239, 68, 68, 0.15)"
                      }}
                    >
                      <span className="font-semibold">⚠️ Último Error:</span> {webhookInfo.result.last_error_message}
                      {webhookInfo.result.last_error_date && (
                        <span className="block text-[10px] text-[#869489] mt-0.5">
                          Fecha: {new Date(webhookInfo.result.last_error_date * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Webhook Form */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                    URL base del backend / API Gateway
                  </label>
                   <div className="flex gap-2">
                    <input
                      type="url"
                      value={customWebhookUrl}
                      onChange={(e) => setCustomWebhookUrl(e.target.value)}
                      onBlur={() => {
                        const cleanUrl = (url: string) => {
                          let clean = url.trim();
                          if (clean.includes('/api/channels/telegram/webhook')) {
                            try {
                              const parsed = new URL(clean);
                              clean = parsed.origin;
                            } catch {
                              const idx = clean.indexOf('/api/');
                              if (idx !== -1) {
                                clean = clean.substring(0, idx);
                              }
                            }
                          }
                          if (clean.endsWith('/')) {
                            clean = clean.slice(0, -1);
                          }
                          return clean;
                        };
                        setCustomWebhookUrl(cleanUrl(customWebhookUrl));
                      }}
                      placeholder="Ej. https://gus512bt5g.execute-api.us-east-1.amazonaws.com"
                      className="flex-1 rounded-lg border bg-[#111713] px-3.5 py-2 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#38bdf8]/40"
                      style={{ borderColor: "#3c4a41" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cleanUrl = (url: string) => {
                          let clean = url.trim();
                          if (clean.includes('/api/channels/telegram/webhook')) {
                            try {
                              const parsed = new URL(clean);
                              clean = parsed.origin;
                            } catch {
                              const idx = clean.indexOf('/api/');
                              if (idx !== -1) {
                                clean = clean.substring(0, idx);
                              }
                            }
                          }
                          if (clean.endsWith('/')) {
                            clean = clean.slice(0, -1);
                          }
                          return clean;
                        };
                        const sanitized = cleanUrl(customWebhookUrl);
                        console.log('Botón clickeado con URL sanitizada:', sanitized);
                        setCustomWebhookUrl(sanitized);
                        configureWebhook(sanitized);
                      }}
                      disabled={isConfiguringWebhook || !customWebhookUrl}
                      className="rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-105 active:scale-[0.98]"
                      style={{
                        backgroundColor: '#38bdf8',
                        color: "#080e0a",
                        boxShadow: "0 2px 10px rgba(56, 189, 248, 0.2)"
                      }}
                    >
                      {isConfiguringWebhook ? 'Registrando...' : 'Registrar Webhook'}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#869489] leading-normal">
                    Se registrará la URL completa: <code className="text-[#38bdf8] font-mono">
                      {(() => {
                        let clean = customWebhookUrl.trim();
                        if (clean.includes('/api/channels/telegram/webhook')) {
                          try {
                            const parsed = new URL(clean);
                            clean = parsed.origin;
                          } catch {
                            const idx = clean.indexOf('/api/');
                            if (idx !== -1) clean = clean.substring(0, idx);
                          }
                        }
                        if (clean.endsWith('/')) clean = clean.slice(0, -1);
                        return clean || 'https://...';
                      })()}/api/channels/telegram/webhook/{channelInfo?.channelId || 'ID'}
                    </code>
                  </p>
                </div>
              </div>
            </div>
          )}

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
            {/* Corner accent glow depending on provider */}
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full filter blur-2xl pointer-events-none opacity-20 transition-all duration-500"
              style={{ 
                background: activeProvider === 'telegram' 
                  ? "radial-gradient(circle, #38bdf8, transparent 70%)"
                  : "radial-gradient(circle, #00bb7a, transparent 70%)"
              }}
            />

            <div>
              <h3 
                className="text-base font-semibold text-[#dde5dc] flex items-center gap-2" 
                style={{ fontFamily: 'Geist, Inter, sans-serif' }}
              >
                <span style={{ color: activeProvider === 'telegram' ? '#38bdf8' : '#00bb7a' }}>⚡</span>
                Simulador de Mensajes del Canal
              </h3>
              <p className="text-xs text-[#869489] mt-1 leading-relaxed">
                Simula la recepción de un mensaje entrante de {activeProvider === 'telegram' ? 'Telegram' : 'WhatsApp'} para validar que el procesamiento RAG y la respuesta del Agente funcionen de extremo a extremo en la plataforma.
              </p>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProvider === 'telegram' ? (
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      Username de Telegram Remitente
                    </label>
                    <input
                      type="text"
                      value={simSenderTelegram}
                      onChange={(e) => setSimSenderTelegram(e.target.value)}
                      placeholder="Ej. usuario_telegram_test"
                      className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#38bdf8]/40"
                      style={{ borderColor: "#3c4a41" }}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                      Número remitente de WhatsApp
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
                )}
                
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
                  backgroundColor: activeProvider === 'telegram' ? '#38bdf8' : '#00bb7a',
                  color: "#080e0a",
                  boxShadow: activeProvider === 'telegram' 
                    ? "0 2px 10px rgba(56, 189, 248, 0.2)"
                    : "0 2px 10px rgba(0, 187, 122, 0.2)"
                }}
              >
                {isSimulating ? 'Simulando...' : 'Enviar Mensaje Simulado'}
              </button>
            </form>

            {simSuccess && simulationResult && (
              <div 
                className="rounded-lg border p-4 text-sm space-y-2 mt-4 transition-all duration-300"
                style={{
                  backgroundColor: activeProvider === 'telegram' ? "rgba(56, 189, 248, 0.04)" : "rgba(0, 187, 122, 0.04)",
                  borderColor: activeProvider === 'telegram' ? "rgba(56, 189, 248, 0.15)" : "rgba(0, 187, 122, 0.15)",
                  color: activeProvider === 'telegram' ? "#38bdf8" : "#00cc85"
                }}
              >
                <div className="flex items-center gap-2">
                  <span font-bold="true">✓</span>
                  <p className="font-semibold" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
                    ¡Mensaje simulado y encolado en SQS!
                  </p>
                </div>
                <p className="text-xs text-[#dde5dc]">
                  ID de Mensaje: <code className="bg-[#111713] px-2 py-0.5 rounded font-mono border" style={{ borderColor: activeProvider === 'telegram' ? "rgba(56, 189, 248, 0.2)" : "rgba(0, 187, 122, 0.2)", color: activeProvider === 'telegram' ? '#38bdf8' : '#00bb7a' }}>{simulationResult.messageId}</code>
                </p>
                <p className="text-xs text-[#869489] leading-relaxed">
                  El motor RAG procesará este mensaje en segundo plano. Puedes monitorear la respuesta final en los registros o en el panel de Inbox del agente.
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
              ¿Deseas desconectar este canal y habilitar nuevamente la selección de proveedores?
            </span>
            <button
              onClick={disconnect}
              disabled={isConnecting}
              className="w-full sm:w-auto rounded-lg border bg-transparent px-4 py-2.5 text-xs font-semibold text-[#ef4444] transition-all hover:bg-[#ef4444]/10 hover:border-[#ef4444]/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              style={{ borderColor: "rgba(239, 68, 68, 0.25)" }}
            >
              {isConnecting ? 'Desconectando...' : `Desconectar ${activeProvider === 'telegram' ? 'Telegram' : 'WhatsApp'}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selector de Canales Premium con Animaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp Option Card */}
            <div
              onClick={() => setSelectedChannel('whatsapp')}
              className={`cursor-pointer rounded-xl p-5 border transition-all duration-300 flex items-start gap-4 relative overflow-hidden group select-none ${
                selectedChannel === 'whatsapp'
                  ? 'border-[#00bb7a] bg-[#00bb7a]/5 scale-[1.01] shadow-[0_0_20px_rgba(0,187,122,0.08)]'
                  : 'border-[#3c4a41] bg-[#1a211c]/20 hover:border-[#00bb7a]/40 hover:bg-[#00bb7a]/5'
              }`}
            >
              <div 
                className="absolute top-0 right-0 w-20 h-20 rounded-full filter blur-xl opacity-20 group-hover:opacity-35 transition-all duration-300"
                style={{ background: "radial-gradient(circle, #00bb7a, transparent 70%)" }}
              />
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundColor: selectedChannel === 'whatsapp' ? 'rgba(0, 187, 122, 0.15)' : 'rgba(60, 74, 65, 0.2)',
                  border: selectedChannel === 'whatsapp' ? '1px solid #00bb7a' : '1px solid #3c4a41',
                  color: selectedChannel === 'whatsapp' ? '#00bb7a' : '#869489',
                  boxShadow: selectedChannel === 'whatsapp' ? '0 0 15px rgba(0, 187, 122, 0.15)' : 'none'
                }}
              >
                <WhatsAppIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-[#dde5dc]">WhatsApp Business</h4>
                <p className="text-xs text-[#869489] leading-relaxed">
                  Conexión oficial mediante la API de Meta Cloud. Ideal para empresas y producción.
                </p>
              </div>
            </div>

            {/* Telegram Option Card */}
            <div
              onClick={() => setSelectedChannel('telegram')}
              className={`cursor-pointer rounded-xl p-5 border transition-all duration-300 flex items-start gap-4 relative overflow-hidden group select-none ${
                selectedChannel === 'telegram'
                  ? 'border-[#38bdf8] bg-[#38bdf8]/5 scale-[1.01] shadow-[0_0_20px_rgba(56,189,248,0.08)]'
                  : 'border-[#3c4a41] bg-[#1a211c]/20 hover:border-[#38bdf8]/40 hover:bg-[#38bdf8]/5'
              }`}
            >
              <div 
                className="absolute top-0 right-0 w-20 h-20 rounded-full filter blur-xl opacity-20 group-hover:opacity-35 transition-all duration-300"
                style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }}
              />
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundColor: selectedChannel === 'telegram' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(60, 74, 65, 0.2)',
                  border: selectedChannel === 'telegram' ? '1px solid #38bdf8' : '1px solid #3c4a41',
                  color: selectedChannel === 'telegram' ? '#38bdf8' : '#869489',
                  boxShadow: selectedChannel === 'telegram' ? '0 0 15px rgba(56, 189, 248, 0.15)' : 'none'
                }}
              >
                <TelegramIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-[#dde5dc]">Telegram Bot</h4>
                <p className="text-xs text-[#869489] leading-relaxed">
                  Conexión rápida mediante Bot API y BotFather. Excelente para prototipos y soporte ágil.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario / Configuración de Canal Seleccionado */}
          <div 
            className="rounded-xl overflow-hidden border shadow-2xl transition-all duration-500"
            style={{
              backgroundColor: "rgba(20, 26, 22, 0.6)",
              borderColor: "#3c4a41",
              backdropFilter: "blur(12px)"
            }}
          >
            {selectedChannel === 'whatsapp' ? (
              <>
                {/* Tabs header WhatsApp */}
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

                {/* Tabs body WhatsApp */}
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
              </>
            ) : (
              /* Telegram UI Tab */
              <div className="p-6 sm:p-8">
                <form onSubmit={handleTelegramSubmit} className="space-y-5 max-w-md mx-auto">
                  <p className="text-xs text-[#869489] leading-relaxed text-center sm:text-left">
                    Introduce el token de tu bot de Telegram obtenido a través de <strong className="text-[#38bdf8]">@BotFather</strong> para que el agente reciba y responda mensajes del bot.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[10px] font-semibold text-[#869489] uppercase tracking-wider">
                        Telegram Bot Token
                      </label>
                      <input
                        type="password"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        placeholder="Ej. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full rounded-lg border bg-[#111713] px-3.5 py-2.5 text-sm text-[#dde5dc] placeholder-[#536257] outline-none transition-all focus:ring-1 focus:ring-[#38bdf8]/40 font-mono"
                        style={{ borderColor: "#3c4a41" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Instrucciones de ayuda */}
                  <div 
                    className="rounded-lg p-4 border text-[11px] space-y-2 leading-relaxed"
                    style={{
                      backgroundColor: "rgba(56, 189, 248, 0.03)",
                      borderColor: "rgba(56, 189, 248, 0.15)",
                      color: "#b3e5fc"
                    }}
                  >
                    <p className="font-semibold text-xs text-[#38bdf8] flex items-center gap-1.5">
                      💡 ¿Cómo obtener tu Token de Telegram?
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[#869489]">
                      <li>Abre Telegram y busca a <strong className="text-[#dde5dc]">@BotFather</strong>.</li>
                      <li>Envía el comando <code className="text-[#dde5dc]">/newbot</code> y sigue las instrucciones para asignarle un nombre y un username a tu bot.</li>
                      <li>Copia el token HTTP API proporcionado por BotFather y pégalo arriba.</li>
                    </ol>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="w-full rounded-lg px-5 py-3 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-105 active:scale-[0.98]"
                      style={{
                        backgroundColor: "#38bdf8",
                        color: "#080e0a",
                        boxShadow: "0 2px 12px rgba(56, 189, 248, 0.15)"
                      }}
                    >
                      {isConnecting ? 'Conectando Bot...' : 'Conectar Bot de Telegram'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
