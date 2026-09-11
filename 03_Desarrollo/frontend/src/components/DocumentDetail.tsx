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
              <span /> {document.category}
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

          {document.contexto && (
            <div style={{ marginTop: "12px", padding: "8px 12px", background: "#f0f6fc", borderRadius: "8px", border: "1px solid #d8e5f3", fontSize: "11px", color: "#234262" }}>
              <strong>Ámbito / Contexto:</strong> {document.contexto}
            </div>
          )}

          {document.description && (
            <p style={{ marginTop: "10px", marginBottom: "6px", fontSize: "11.5px", color: "#50657b", lineHeight: "1.5" }}>
              {document.description}
            </p>
          )}

          <div className="summary-heading">
            <div>
              <h3>
                <Sparkles size={16} /> Resumen Inteligente y Puntos Clave
                <small>Generado por DocuHub AI</small>
              </h3>
              <p>Puntos extraídos: <strong>{document.summary.length}</strong></p>
            </div>
          </div>

          <div className="summary-list">
            {document.summary.map((item, index) => {
              const match = item.match(/^\*\*(.*?)\*\*:?\s*([\s\S]*)$/);
              return (
                <article className="summary-item" key={`${item}-${index}`}>
                  <span className="summary-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, padding: "2px 0" }}>
                    {match ? (
                      <>
                        <strong style={{ display: "block", color: "#16385a", fontSize: "11px", marginBottom: "3px" }}>
                          {match[1]}
                        </strong>
                        <p style={{ margin: 0, color: "#455a71", fontSize: "10.5px", lineHeight: "1.5" }}>
                          {match[2]}
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, color: "#455a71", fontSize: "10.5px", lineHeight: "1.5" }}>
                        {item}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {document.palabras_clave && document.palabras_clave.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "14px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#8b9eb3", fontWeight: 600 }}>Etiquetas:</span>
              {document.palabras_clave.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "9px",
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
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