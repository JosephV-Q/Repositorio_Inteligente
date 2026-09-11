import {
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";

type SidebarProps = {
  activeCategory: string;
  mobileMenu: boolean;
  categories: string[];
  totalDocuments?: number;
  categoryCounts?: Record<string, number>;
  canViewDashboard: boolean;
  canManageCategories: boolean;
  onCategoryChange: (category: string) => void;
  onDashboardClick: () => void;
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
};

// Muestra la identidad del espacio de trabajo y permite cambiar o gestionar categorías.
export function Sidebar({
  activeCategory,
  mobileMenu,
  categories,
  totalDocuments = 0,
  categoryCounts = {},
  canViewDashboard,
  canManageCategories,
  onCategoryChange,
  onDashboardClick,
  onAddCategory,
  onDeleteCategory,
}: SidebarProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
    }
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

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

      {/* Dashboard restringido: Solo visible para Rol 1 (Admin) */}
      {canViewDashboard && (
        <button
          type="button"
          className="dashboard-link"
          onClick={onDashboardClick}
        >
          <BarChart3 size={16} />
          <span>Dashboard del repositorio</span>
          <ChevronDown size={14} />
        </button>
      )}

      {/* Sección de Categorías con opción de añadir para Admin */}
      <div className="sidebar-section-title">
        <div className="sidebar-section-title-left">
          <span>CATEGORÍAS</span>
          <span className="categories-count-badge">{categories.length + 1}</span>
        </div>
        {canManageCategories && onAddCategory && (
          <button
            type="button"
            className="add-category-btn"
            title="Añadir nueva categoría"
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            aria-label="Añadir categoría"
          >
            {isAddingCategory ? <X size={13} /> : <Plus size={13} />}
          </button>
        )}
      </div>

      {/* Formulario rápido para nueva categoría (Solo Admin) */}
      {canManageCategories && isAddingCategory && (
        <form onSubmit={handleAddSubmit} className="add-category-form">
          <input
            type="text"
            placeholder="Nueva categoría..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            autoFocus
          />
          <div className="add-category-form-actions">
            <button type="submit" className="confirm-btn" title="Guardar categoría">
              <Check size={12} />
            </button>
            <button
              type="button"
              className="cancel-btn"
              title="Cancelar"
              onClick={() => {
                setIsAddingCategory(false);
                setNewCategoryName("");
              }}
            >
              <X size={12} />
            </button>
          </div>
        </form>
      )}

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
          <span className="category-label">Todas las categorías</span>
          <b>{totalDocuments}</b>
        </button>

        {categories.map((label, index) => (
          <div
            key={label}
            className={activeCategory === label ? "category-row active" : "category-row"}
          >
            <button
              type="button"
              className={activeCategory === label ? "category active" : "category"}
              onClick={() => onCategoryChange(label)}
            >
              <span className="category-icon">{index + 1}</span>
              <span className="category-label">{label}</span>
              <b>{categoryCounts[label] ?? 0}</b>
            </button>

            {/* Botón de eliminar categoría (Solo Admin) */}
            {canManageCategories && onDeleteCategory && (
              <button
                type="button"
                className="delete-category-btn"
                title={`Eliminar categoría "${label}"`}
                aria-label={`Eliminar categoría "${label}"`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`¿Seguro que deseas eliminar la categoría "${label}"?`)) {
                    onDeleteCategory(label);
                  }
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </nav>

      <button type="button" className="graph-button">
        <BarChart3 size={15} /> Explorar Grafos
      </button>
    </aside>
  );
}