import { BarChart3, FileText, FolderKanban, Layers3, PieChart } from "lucide-react";
import type { DocumentItem } from "../types/document";

type DashboardProps = {
  documents: DocumentItem[];
  categories: string[];
  onBack: () => void;
};

// Resume el estado del repositorio con indicadores calculados de los documentos cargados.
export function Dashboard({ documents, categories, onBack }: DashboardProps) {
  const categoryCounts = categories.map((category) => ({
    name: category,
    count: documents.filter((document) => document.category === category).length,
  }));
  const formatCounts = ["PDF", "DOCX", "TXT"].map((format) => ({
    format,
    count: documents.filter((document) => document.format === format).length,
  }));
  const mostUsedCategory = categoryCounts.reduce(
    (current, category) => (category.count > current.count ? category : current),
    categoryCounts[0] ?? { name: "Sin categorías", count: 0 },
  );

  return (
    <section className="dashboard-area">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">VISIÓN GENERAL / REPOSITORIO</p>
          <h1>Dashboard del repositorio</h1>
          <p>Indicadores actuales de la biblioteca documental.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          <FileText size={15} /> Volver a documentos
        </button>
      </div>

      <div className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="dashboard-metric-icon blue"><FileText size={18} /></span>
          <span>Documentos registrados</span>
          <strong>{documents.length}</strong>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-icon green"><FolderKanban size={18} /></span>
          <span>Categorías activas</span>
          <strong>{categoryCounts.filter((category) => category.count > 0).length}</strong>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-icon orange"><Layers3 size={18} /></span>
          <span>Formatos indexados</span>
          <strong>{formatCounts.filter((format) => format.count > 0).length}</strong>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-icon violet"><PieChart size={18} /></span>
          <span>Categoría principal</span>
          <strong>{mostUsedCategory.name}</strong>
        </article>
      </div>

      <div className="dashboard-panels">
        <article className="dashboard-panel">
          <header><h2>Documentos por categoría</h2><BarChart3 size={18} /></header>
          <div className="dashboard-bars">
            {categoryCounts.map((category) => (
              <div className="dashboard-bar-row" key={category.name}>
                <span>{category.name}</span>
                <div className="dashboard-bar-track">
                  <i style={{ width: `${documents.length ? Math.max((category.count / documents.length) * 100, category.count ? 8 : 0) : 0}%` }} />
                </div>
                <strong>{category.count}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-panel">
          <header><h2>Distribución por formato</h2><PieChart size={18} /></header>
          <div className="format-list">
            {formatCounts.map((format) => (
              <div className="format-row" key={format.format}>
                <span className={`file-badge ${format.format.toLowerCase()}`}>{format.format}</span>
                <div><strong>{format.count}</strong><small>{format.count === 1 ? "documento" : "documentos"}</small></div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}