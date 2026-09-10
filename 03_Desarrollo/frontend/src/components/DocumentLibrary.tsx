import { Files, Plus, Search, Sparkles, X } from "lucide-react";
import type { DocumentItem } from "../types/document";
import { DocumentCard } from "./DocumentCard";

type DocumentLibraryProps = {
  activeCategory: string;
  documents: DocumentItem[];
  isRvdMode: boolean;
  selectedIds: string[];
  onRvdToggle: () => void;
  onDocumentOpen: (document: DocumentItem) => void;
  onRvdClose: () => void;
  onUploadClick?: () => void;
};

// Organiza el encabezado, filtros, modo RVD y listado de documentos.
export function DocumentLibrary({
  activeCategory,
  documents,
  isRvdMode,
  selectedIds,
  onRvdToggle,
  onDocumentOpen,
  onRvdClose,
  onUploadClick,
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
          {onUploadClick && (
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
          <button
            type="button"
            className={isRvdMode ? "mode-button selected" : "mode-button"}
            onClick={onRvdToggle}
          >
            <Files size={16} /> RVD
            <span className="mode-label">Resumen múltiple</span>
          </button>
        </div>
      </div>
      {isRvdMode && (
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
            onOpen={() => onDocumentOpen(document)}
          />
        ))}
      </div>
      {documents.length === 0 && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No encontramos documentos</h2>
          <p>Prueba otra búsqueda o añade un nuevo archivo a esta categoría.</p>
          {onUploadClick && (
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