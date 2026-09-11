import { Files, Plus, Search, Sparkles, X } from "lucide-react";
import type { DocumentItem } from "../types/document";
import { DocumentCard } from "./DocumentCard";

type DocumentLibraryProps = {
  activeCategory: string;
  documents: DocumentItem[];
  isRvdMode: boolean;
  selectedIds: string[];
  canUpload?: boolean;
  canRvd?: boolean;
  canDeleteDocument?: boolean;
  onRvdToggle: () => void;
  onDocumentOpen: (document: DocumentItem) => void;
  onRvdClose: () => void;
  onUploadClick?: () => void;
  onDeleteDocument?: (id: string) => void;
};

// Organiza el encabezado, filtros, modo RVD y listado de documentos.
export function DocumentLibrary({
  activeCategory,
  documents,
  isRvdMode,
  selectedIds,
  canUpload = true,
  canRvd = true,
  canDeleteDocument = false,
  onRvdToggle,
  onDocumentOpen,
  onRvdClose,
  onUploadClick,
  onDeleteDocument,
}: DocumentLibraryProps) {
  return (
    <section className="content-area">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            BIBLIOTECA DOCUMENTAL / {activeCategory.toUpperCase()}
          </p>
          <h1>{activeCategory}</h1>
          <p>Mostrando {documents.length} documentos analizados recientemente</p>
        </div>
        <div className="heading-actions">
          {/* Subir archivo: Oculto para Rol 3 (Usuario) */}
          {canUpload && onUploadClick && (
            <button
              type="button"
              className="add-doc-top-button"
              onClick={onUploadClick}
              title="Añadir nuevo documento"
            >
              <Plus size={16} />
              <span>Añadir documento</span>
            </button>
          )}

          {/* Modo RVD: Oculto para Rol 3 (Usuario) */}
          {canRvd && (
            <button
              type="button"
              className={isRvdMode ? "mode-button selected" : "mode-button"}
              onClick={onRvdToggle}
              title="Resumen inteligente múltiple"
            >
              <Files size={16} /> RVD
              <span className="mode-label">Resumen múltiple</span>
            </button>
          )}
        </div>
      </div>

      {isRvdMode && canRvd && (
        <div className="selection-banner">
          <div>
            <Sparkles size={17} />
            <strong>Modo resumen múltiple activo</strong>
            <span>
              Selecciona varias tarjetas para crear una vista conjunta.
            </span>
          </div>
          <button
            type="button"
            className="banner-close"
            onClick={onRvdClose}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="document-grid">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            selected={selectedIds.includes(document.id)}
            canDelete={canDeleteDocument}
            onOpen={() => onDocumentOpen(document)}
            onDelete={onDeleteDocument}
          />
        ))}
      </div>

      {documents.length === 0 && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No encontramos documentos</h2>
          <p>Prueba otra búsqueda o añade un nuevo archivo a esta categoría.</p>
          {canUpload && onUploadClick && (
            <button
              type="button"
              className="primary-button"
              style={{ margin: "14px auto 0", display: "inline-flex" }}
              onClick={onUploadClick}
            >
              <Plus size={15} /> Añadir documento
            </button>
          )}
        </div>
      )}
    </section>
  );
}