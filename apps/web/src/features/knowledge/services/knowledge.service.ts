/**
 * Servicio HTTP para la API de Knowledge Base.
 * Encapsula todas las llamadas al backend sin exponer detalles de implementación.
 */

import type { KnowledgeSource } from '@multibotagents/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Obtiene todas las fuentes de conocimiento de un agente.
 */
export async function getSourcesByAgent(agentId: string): Promise<KnowledgeSource[]> {
  const res = await fetch(`${API_BASE}/knowledge/agent/${agentId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener fuentes: ${res.status}`);
  }
  return res.json();
}

/**
 * Obtiene el estado actual de una fuente específica.
 */
export async function getSourceStatus(sourceId: string): Promise<KnowledgeSource> {
  const res = await fetch(`${API_BASE}/knowledge/${sourceId}`);
  if (!res.ok) {
    throw new Error(`Error al obtener estado: ${res.status}`);
  }
  return res.json();
}

/**
 * Sube un archivo a la base de conocimiento.
 * Usa XMLHttpRequest para tracking de progreso.
 */
export function uploadFile(
  agentId: string,
  file: File,
  metadata?: { title?: string; category?: string },
  onProgress?: (percent: number) => void,
): Promise<KnowledgeSource> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.category) formData.append('category', metadata.category);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/knowledge/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Error al subir archivo: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Error de red al subir archivo'));
    };

    xhr.send(formData);
  });
}

/**
 * Crea contenido textual directamente en la base de conocimiento.
 */
export async function createTextContent(
  agentId: string,
  title: string,
  content: string,
): Promise<KnowledgeSource> {
  const res = await fetch(`${API_BASE}/knowledge/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, title, content }),
  });
  if (!res.ok) {
    throw new Error(`Error al crear contenido: ${res.status}`);
  }
  return res.json();
}

/**
 * Elimina una fuente de conocimiento y todos sus recursos.
 */
export async function deleteSource(sourceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/knowledge/${sourceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Error al eliminar fuente: ${res.status}`);
  }
}

/**
 * Re-procesa una fuente de conocimiento existente.
 */
export async function reprocessSource(sourceId: string): Promise<KnowledgeSource> {
  const res = await fetch(`${API_BASE}/knowledge/${sourceId}/reprocess`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Error al re-procesar fuente: ${res.status}`);
  }
  return res.json();
}
