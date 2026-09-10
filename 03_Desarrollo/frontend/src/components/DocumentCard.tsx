import { Check } from "lucide-react";
import type { DocumentItem } from "../types/document";

type DocumentCardProps = {
  document: DocumentItem;
  selected: boolean;
  onOpen: () => void;
};

// Representa un documento en la cuadrícula y refleja si está seleccionado para RVD.
export function DocumentCard({ document, selected, onOpen }: DocumentCardProps) {
  return (
    <button
      type="button"
      className={selected ? "document-card selected" : "document-card"}
      onClick={onOpen}
    >
      <div className="card-top">
        <span className={selected ? "checkbox checked" : "checkbox"}>
          {selected && <Check size={12} />}
        </span>
        <h2>{document.title}</h2>
        <span className={`file-badge ${document.format.toLowerCase()}`}>
          {document.format}
        </span>
      </div>
      <p>{document.description}</p>
    </button>
  );
}