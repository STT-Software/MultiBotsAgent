'use client';

import { useState, useCallback } from 'react';
import { createTextContent } from '../services';

interface UseTextEditorReturn {
  isOpen: boolean;
  title: string;
  content: string;
  isSubmitting: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  submit: () => Promise<void>;
}

/**
 * Hook para gestión del editor de contenido textual Markdown.
 */
export function useTextEditor(
  agentId: string,
  onSuccess: () => Promise<void>,
): UseTextEditorReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTitle('');
    setContent('');
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    setError(null);

    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!content.trim()) {
      setError('El contenido no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createTextContent(agentId, title.trim(), content.trim());
      close();
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear contenido');
    } finally {
      setIsSubmitting(false);
    }
  }, [agentId, title, content, close, onSuccess]);

  return {
    isOpen,
    title,
    content,
    isSubmitting,
    error,
    open,
    close,
    setTitle,
    setContent,
    submit,
  };
}
