import { Check, Sparkles, Trash2 } from "lucide-react";
import type { DocumentItem } from "../types/document";

type DocumentCardProps = {
  document: DocumentItem;
  selected: boolean;
  canDelete?: boolean;
  onOpen: () => void;
  onDelete?: (id: string) => void;
};

// Representa un documento en la cuadrícula y refleja si está seleccionado para RVD.
export function DocumentCard({
  document,
  selected,
  canDelete = false,
  onOpen,
  onDelete,
}: DocumentCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={selected ? "document-card selected" : "document-card"}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onOpen();
        }
      }}
    >
      <div className="card-top">
        <span className={selected ? "checkbox checked" : "checkbox"}>
          {selected && <Check size={12} />}
        </span>
        <h2>{document.title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
          {document.similarity !== undefined && document.similarity > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "8px",
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
              title={`Similitud semántica vectorial (pgvector): ${Math.round(document.similarity * 100)}%`}
            >
              <Sparkles size={10} style={{ color: "#2563eb" }} /> {Math.round(document.similarity * 100)}%
            </span>
          )}
          <span className={`file-badge ${document.format.toLowerCase()}`}>
            {document.format}
          </span>
        </div>
        {canDelete && onDelete && (
          <button
            type="button"
            className="card-delete-btn"
            title="Eliminar documento"
            aria-label="Eliminar documento"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`¿Deseas eliminar el documento "${document.title}"?`)) {
                onDelete(document.id);
              }
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p>{document.description}</p>
    </div>
  );
}