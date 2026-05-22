'use client';

import { useState, useCallback, useRef } from 'react';
import { Plus, FileText, RefreshCw } from 'lucide-react';
import type { KnowledgeSource } from '@multibotagents/types';
import type { KnowledgeContainerProps, DeleteDialogState } from './types';
import { useKnowledgeSources, useFileUpload, useTextEditor } from './hooks';
import {
  KnowledgeSourceList,
  KnowledgeEmptyState,
  KnowledgeListSkeleton,
  KnowledgeUploadZone,
  KnowledgeTextEditor,
  KnowledgeDeleteDialog,
} from './components';

/**
 * Contenedor principal del feature Knowledge Base.
 * Orquesta hooks y distribuye estado/acciones a componentes hijos.
 */
export function KnowledgeContainer({ agentId }: KnowledgeContainerProps) {
  const { sources, isLoading, error, refetch, handleDelete, handleReprocess } =
    useKnowledgeSources(agentId);
  const fileUpload = useFileUpload(agentId, refetch);
  const textEditor = useTextEditor(agentId, refetch);

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    source: null,
    isDeleting: false,
  });

  const [_selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const uploadRef = useRef<HTMLDivElement>(null);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openDeleteDialog = useCallback((sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId) ?? null;
    setDeleteDialog({ isOpen: true, source, isDeleting: false });
  }, [sources]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false, source: null, isDeleting: false });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.source) return;
    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));
    try {
      await handleDelete(deleteDialog.source.id);
      closeDeleteDialog();
    } catch {
      closeDeleteDialog();
    }
  }, [deleteDialog.source, handleDelete, closeDeleteDialog]);

  const handleSourceSelect = useCallback((source: KnowledgeSource) => {
    setSelectedSource(source);
  }, []);

  const handleUploadClick = useCallback(() => {
    setShowUpload(true);
    setTimeout(() => uploadRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Error state
  if (error && sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-[#262626] bg-[#0F0F0F] px-8 py-16 text-center">
        <p className="mb-4 text-sm text-[#EF4444]">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-2 rounded border border-[#262626] bg-transparent px-4 py-2 text-sm text-[#888888] transition-colors hover:border-[#888888] hover:text-[#e5e2e1]"
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <KnowledgeListSkeleton />;
  }

  // Empty state
  if (sources.length === 0) {
    return (
      <div className="space-y-4">
        <KnowledgeEmptyState
          onUploadClick={handleUploadClick}
          onCreateTextClick={textEditor.open}
        />
        {showUpload && (
          <div ref={uploadRef}>
            <KnowledgeUploadZone
              onUpload={fileUpload.upload}
              progress={fileUpload.progress}
              isUploading={fileUpload.isUploading}
              error={fileUpload.error}
            />
          </div>
        )}
        <KnowledgeTextEditor
          isOpen={textEditor.isOpen}
          title={textEditor.title}
          content={textEditor.content}
          isSubmitting={textEditor.isSubmitting}
          error={textEditor.error}
          onClose={textEditor.close}
          onTitleChange={textEditor.setTitle}
          onContentChange={textEditor.setContent}
          onSubmit={textEditor.submit}
        />
      </div>
    );
  }

  // Main state — list with actions
  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold text-[#e5e2e1]"
          style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}
        >
          Base de Conocimiento
          <span className="ml-2 font-mono text-xs text-[#888888]">
            {sources.length} fuente{sources.length !== 1 ? 's' : ''}
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded bg-[#42e5a1] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#3be09d]"
          >
            <Plus size={14} />
            Subir archivo
          </button>
          <button
            type="button"
            onClick={textEditor.open}
            className="inline-flex items-center gap-1.5 rounded border border-[#42e5a1] bg-transparent px-3 py-1.5 text-xs font-medium text-[#42e5a1] transition-colors hover:bg-[#42e5a1]/10"
          >
            <FileText size={14} />
            Crear texto
          </button>
        </div>
      </div>

      {/* Upload zone (toggle) */}
      {showUpload && (
        <div ref={uploadRef}>
          <KnowledgeUploadZone
            onUpload={fileUpload.upload}
            progress={fileUpload.progress}
            isUploading={fileUpload.isUploading}
            error={fileUpload.error}
          />
        </div>
      )}

      {/* Text editor */}
      <KnowledgeTextEditor
        isOpen={textEditor.isOpen}
        title={textEditor.title}
        content={textEditor.content}
        isSubmitting={textEditor.isSubmitting}
        error={textEditor.error}
        onClose={textEditor.close}
        onTitleChange={textEditor.setTitle}
        onContentChange={textEditor.setContent}
        onSubmit={textEditor.submit}
      />

      {/* Source list */}
      <KnowledgeSourceList
        sources={sources}
        onDelete={openDeleteDialog}
        onReprocess={handleReprocess}
        onSelect={handleSourceSelect}
      />

      {/* Delete dialog */}
      <KnowledgeDeleteDialog
        isOpen={deleteDialog.isOpen}
        source={deleteDialog.source}
        isDeleting={deleteDialog.isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
