import { BarChart3, ChevronDown, FileText, LayoutGrid } from "lucide-react";
import { categories } from "../data/documents";

type SidebarProps = {
  activeCategory: string;
  mobileMenu: boolean;
  onCategoryChange: (category: string) => void;
  onDashboardClick: () => void;
  totalDocuments?: number;
  categoryCounts?: Record<string, number>;
};

// Muestra la identidad del espacio de trabajo y permite cambiar de categoría.
export function Sidebar({
  activeCategory,
  mobileMenu,
  onCategoryChange,
  onDashboardClick,
  totalDocuments = 0,
  categoryCounts = {},
}: SidebarProps) {
  return (
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand">
        <span className="brand-mark">
          <FileText size={19} />
        </span>
        <div>
          <strong>DocuHub</strong>
          <small>GESTIÓN &amp; ANÁLISIS</small>
        </div>
      </div>
      <button
        type="button"
        className="dashboard-link"
        onClick={onDashboardClick}
      >
        <BarChart3 size={16} />
        <span>Dashboard del repositorio</span>
        <ChevronDown size={14} />
      </button>
      <div className="sidebar-section-title">
        CATEGORÍAS <span>{categories.length + 1} vistas</span>
      </div>
      <nav className="category-nav">
        <button
          type="button"
          className={
            activeCategory === "Todas las categorías"
              ? "category active"
              : "category"
          }
          onClick={() => onCategoryChange("Todas las categorías")}
        >
          <span className="category-icon">
            <LayoutGrid size={12} />
          </span>
          <span>Todas las categorías</span>
          <b>{totalDocuments}</b>
        </button>
        {categories.map((label, index) => (
          <button
            type="button"
            className={activeCategory === label ? "category active" : "category"}
            key={label}
            onClick={() => onCategoryChange(label)}
          >
            <span className="category-icon">{index + 1}</span>
            <span>{label}</span>
            <b>{categoryCounts[label] ?? 0}</b>
          </button>
        ))}
      </nav>
      <button type="button" className="graph-button">
        <BarChart3 size={15} /> Explorar Grafos
      </button>
    </aside>
  );
}