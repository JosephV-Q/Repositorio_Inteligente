import { Check, Trash2 } from "lucide-react";
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
        <span className={`file-badge ${document.format.toLowerCase()}`}>
          {document.format}
        </span>
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