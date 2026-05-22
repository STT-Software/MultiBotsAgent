"use client";

import { useCallback, useState } from "react";
import { Settings, Brain, MessageCircle, FileText } from "lucide-react";

import { Agente } from "../types/agentes.types";
import { useEditarAgente } from "../hooks/use-editar-agente";
import { AgenteTabGeneral } from "./agente-tab-general";
import { AgenteTabPersonalidad } from "./agente-tab-personalidad";
import { AgenteTabCanal } from "./agente-tab-canal";
import { AgenteTabConocimiento } from "./agente-tab-conocimiento";

type TabId = "general" | "personalidad" | "canal" | "conocimiento";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "general", label: "General", icon: <Settings size={14} aria-hidden="true" /> },
  { id: "personalidad", label: "Personalidad", icon: <Brain size={14} aria-hidden="true" /> },
  { id: "canal", label: "Canal", icon: <MessageCircle size={14} aria-hidden="true" /> },
  { id: "conocimiento", label: "Base de Conocimiento", icon: <FileText size={14} aria-hidden="true" /> },
];

interface AgenteDetalleTabsProps {
  agente: Agente;
  onAgenteUpdate: (agenteActualizado: Agente) => void;
}

export function AgenteDetalleTabs({ agente, onAgenteUpdate }: AgenteDetalleTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { editarAgente, saving, error, success, resetStatus } = useEditarAgente(agente, onAgenteUpdate);

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case "general":
        return (
          <AgenteTabGeneral
            agente={agente}
            editarAgente={editarAgente}
            saving={saving}
            error={error}
            success={success}
            resetStatus={resetStatus}
          />
        );
      case "personalidad":
        return <AgenteTabPersonalidad />;
      case "canal":
        return <AgenteTabCanal />;
      case "conocimiento":
        return <AgenteTabConocimiento agentId={agente.id} />;
    }
  }, [activeTab, agente, editarAgente, saving, error, success, resetStatus]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div
        className="flex gap-0"
        role="tablist"
        aria-label="Secciones del agente"
        style={{ borderBottom: "1px solid #3c4a41" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative"
              style={{
                color: isActive ? "#e8f0ea" : "#869489",
                cursor: "pointer",
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "#00bb7a" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
