import { Bell, ChevronDown, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type TopbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onMenuToggle: () => void;
  onAccountOpen: () => void;
};

// Contiene la búsqueda global, el acceso móvil y el menú de cuenta del usuario.
export function Topbar({ query, onQueryChange, onMenuToggle, onAccountOpen }: TopbarProps) {
  const { user, isAdmin, logout } = useAuth();

  const displayName = user?.nombre || "Administrador";
  const displayRole =
    user?.nombre_rol || (isAdmin ? "Administrador del Sistema" : "Colaborador RVD");

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

  return (
    <header className="topbar">
      <button
        className="icon-button menu-button"
        aria-label="Abrir menú"
        onClick={onMenuToggle}
      >
        <Menu size={20} />
      </button>

      <div className="topbar-workspace">
        <span className="workspace-dot" />
        <span>RVD Clúster</span>
        {isAdmin && (
          <span className="topbar-admin-pill" title="Privilegios de Administrador Activos">
            <ShieldCheck size={11} /> Admin
          </span>
        )}
      </div>

      <label className="search-box">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar en el repositorio por título, contenido, metadatos..."
        />
        <kbd>Ctrl + K</kbd>
      </label>

      <button
        className="icon-button notification-button"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        <i />
      </button>

      {/* Perfil del usuario autenticado */}
      <div className="topbar-user-section">
        <button
          type="button"
          className="profile-trigger"
          onClick={onAccountOpen}
          title="Ver perfil y gestión de cuenta"
        >
          <span className="avatar avatar-small">{initials}</span>
          <span>
            <strong>{displayName}</strong>
            <small>{displayRole}</small>
          </span>
          <ChevronDown size={15} />
        </button>

        <button
          type="button"
          className="icon-button quick-logout-btn"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}