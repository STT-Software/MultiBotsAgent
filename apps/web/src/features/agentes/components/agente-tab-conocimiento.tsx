"use client";

import { KnowledgeContainer } from '@/features/knowledge/KnowledgeContainer';

interface AgenteTabConocimientoProps {
  agentId: string;
}

export function AgenteTabConocimiento({ agentId }: AgenteTabConocimientoProps) {
  return (
    <div className="py-4">
      <KnowledgeContainer agentId={agentId} />
    </div>
  );
}
