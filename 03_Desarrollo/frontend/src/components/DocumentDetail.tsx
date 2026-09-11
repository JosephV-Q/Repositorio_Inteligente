import { ArrowRight, Copy, FileText, Maximize2, Sparkles, Trash2, UserRound, X } from "lucide-react";
import type { DocumentItem } from "../types/document";

// Presenta el resumen inteligente y los metadatos del documento seleccionado.
export function DocumentDetail({
  document,
  canDelete = false,
  onClose,
  onDelete,
}: {
  document: DocumentItem;
  canDelete?: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="overlay">
      <section className="detail-panel">
        <header className="detail-header">
          <div className="detail-title">
            <span className="file-icon"><FileText size={18} /></span>
            <div>
              <p>DETALLE DE DOCUMENTO #{document.id}</p>
              <h2>{document.title}</h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar detalle"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="detail-content">
          <div className="detail-toolbar">
            <span className="category-pill">
              <span /> {document.category} / Finanzas
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (document.viewUrl) {
                    window.open(document.viewUrl, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <Maximize2 size={15} /> Visualizar
              </button>
              {document.viewUrl && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    window.open(document.viewUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  Abrir Drive
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  className="danger-button"
                  title="Eliminar este documento"
                  onClick={() => {
                    if (window.confirm(`¿Seguro que deseas eliminar el documento "${document.title}"?`)) {
                      onDelete(document.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </div>
          </div>
          <div className="summary-heading">
            <div>
              <h3>
                <Sparkles size={16} /> Resumen Inteligente
                <small>Generado por DocuHub AI</small>
              </h3>
              <p>Precisión estimada: <strong>98.4%</strong></p>
            </div>
          </div>
          <div className="summary-list">
            {document.summary.map((item, index) => (
              <article className="summary-item" key={item}>
                <span className="summary-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{item}</p>
                <button type="button" className="page-link">
                  Ir a pág. {index === 0
                    ? "4-12 (Presupuestos)"
                    : index === 1
                      ? "22 (Cronograma)"
                      : "31-33 (Legal)"}
                </button>
              </article>
            ))}
          </div>
        </div>
        <footer className="detail-footer">
          <span><UserRound size={14} /> Por: {document.author}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(document.summary.join("\n"));
              alert("¡Resumen copiado al portapapeles!");
            }}
          >
            <Copy size={14} /> Copiar Resumen
          </button>
          <button
            type="button"
            className="full-view"
            onClick={() => {
              if (document.viewUrl) {
                window.open(document.viewUrl, "_blank", "noopener,noreferrer");
              }
            }}
          >
            Ir al Visor Completo <ArrowRight size={14} />
          </button>
        </footer>
      </section>
    </div>
  );
}