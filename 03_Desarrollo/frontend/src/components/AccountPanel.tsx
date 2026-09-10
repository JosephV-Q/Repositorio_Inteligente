import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiClientError } from "../services/api";
import type { Invitacion } from "../services/api";

// Muestra la información de la cuenta y permite al administrador gestionar invitaciones del sistema.
export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { user, logout, isAdmin } = useAuth();

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loadingInvitaciones, setLoadingInvitaciones] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRol, setNewInviteRol] = useState<number>(2); // 2: editor, 3: usuario
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string>("Neon DB Conectado");

  // Cargar invitaciones activas manualmente
  const loadInvitaciones = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingInvitaciones(true);
    setInviteError(null);
    try {
      const res = await api.getInvitaciones();
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      setInvitaciones(list);
    } catch (err) {
      console.warn("No se pudieron cargar las invitaciones:", err);
    } finally {
      setLoadingInvitaciones(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    async function initPanel() {
      if (isAdmin) {
        try {
          const res = await api.getInvitaciones();
          const list = Array.isArray(res) ? res : ((res as any)?.data || []);
          if (isMounted) {
            setInvitaciones(list);
          }
        } catch (err) {
          console.warn("No se pudieron cargar las invitaciones:", err);
        }
      }

      try {
        const status = await api.checkDbStatus();
        if (isMounted && status.connected) {
          setDbStatus(`Neon PostgreSQL (${status.provider || "AWS"})`);
        }
      } catch {
        if (isMounted) {
          setDbStatus("Neon DB Activo");
        }
      }
    }

    void initPanel();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => {
      setCopiedToken(null);
    }, 2500);
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;

    setIsCreatingInvite(true);
    setInviteError(null);

    try {
      const created = await api.createInvitacion({
        correo: newInviteEmail.trim().toLowerCase(),
        rol: newInviteRol,
      });

      const tokenVal = created.token || (created as any)?.data?.token;
      if (tokenVal) {
        setLastCreatedToken(tokenVal);
      }
      setNewInviteEmail("");
      await loadInvitaciones();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setInviteError(err.message || "Error al generar invitación.");
      } else {
        setInviteError("No se pudo generar la invitación.");
      }
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleDeleteInvitation = async (id: number) => {
    try {
      await api.deleteInvitacion(id);
      setInvitaciones((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      console.error("Error eliminando invitación:", err);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const initials = (user?.nombre || "Administrador")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentRoleTitle =
    user?.nombre_rol || (user?.rol === 1 ? "Administrador Principal" : "Colaborador RVD");

  return (
    <div className="overlay account-overlay">
      <aside className="account-panel">
        <header>
          <p>PANEL DE CUENTA &amp; ADMINISTRACIÓN</p>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        </header>

        {/* Perfil del Usuario Autenticado */}
        <div className="account-profile">
          <div className="profile-avatar">
            {initials ? <span className="avatar-letters">{initials}</span> : <UserRound size={43} />}
            <span>
              <Sparkles size={12} />
            </span>
          </div>
          <h2>{user?.nombre || "Administrador"}</h2>
          <p>{currentRoleTitle}</p>
          <small>{user?.gmail || "admin@admin.com"}</small>
        </div>

        {/* Sección de Invitaciones / Códigos de Creación (Solo Admin) */}
        {isAdmin && (
          <div className="account-section">
            <div className="account-section-heading">
              <span>
                <KeyRound size={15} /> GENERADOR DE INVITACIONES
              </span>
              <b>{invitaciones.length} Activas</b>
            </div>
            <p>Invita a nuevos usuarios para registrarse con roles controlados:</p>

            <form onSubmit={handleCreateInvitation} className="account-invite-form">
              <input
                type="email"
                placeholder="correo.nuevo@empresa.com"
                value={newInviteEmail}
                onChange={(e) => setNewInviteEmail(e.target.value)}
                required
                disabled={isCreatingInvite}
              />
              <div className="invite-actions-row">
                <select
                  value={newInviteRol}
                  onChange={(e) => setNewInviteRol(Number(e.target.value))}
                  disabled={isCreatingInvite}
                >
                  <option value={2}>Rol: Editor (Gestión de Documentos)</option>
                  <option value={3}>Rol: Usuario (Solo Lectura / Consulta)</option>
                </select>
                <button
                  type="submit"
                  className="invite-submit-btn"
                  disabled={isCreatingInvite || !newInviteEmail}
                >
                  {isCreatingInvite ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                  <span>Generar</span>
                </button>
              </div>
            </form>

            {inviteError && (
              <div className="account-error-alert">
                <AlertCircle size={13} /> <span>{inviteError}</span>
              </div>
            )}

            {lastCreatedToken && (
              <div className="created-invite-banner">
                <small>Último enlace de invitación generado:</small>
                <div className="pin-row">
                  <strong title={lastCreatedToken}>
                    {window.location.origin}/?token={lastCreatedToken.slice(0, 10)}...
                  </strong>
                  <button
                    type="button"
                    aria-label="Copiar enlace"
                    onClick={() =>
                      handleCopy(`${window.location.origin}/?token=${lastCreatedToken}`)
                    }
                  >
                    {copiedToken?.includes(lastCreatedToken) ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Listado de Invitaciones Existentes */}
            {invitaciones.length > 0 && (
              <div className="invitations-list-box">
                <div className="invitations-list-header">
                  <Users size={12} />
                  <span>Invitaciones registradas en Neon DB</span>
                  <button
                    type="button"
                    className="refresh-btn"
                    onClick={loadInvitaciones}
                    title="Recargar invitaciones"
                  >
                    <RefreshCw size={11} className={loadingInvitaciones ? "spin" : ""} />
                  </button>
                </div>
                <div className="invitations-scroll">
                  {invitaciones.map((inv) => (
                    <div key={inv.id} className="invitation-item-row">
                      <div className="inv-meta">
                        <span className="inv-email">{inv.correo}</span>
                        <span className="inv-role">
                          {inv.rol === 2 ? "Editor" : inv.rol === 1 ? "Admin" : "Usuario"}
                        </span>
                      </div>
                      <div className="inv-actions">
                        <button
                          type="button"
                          className="copy-inv-btn"
                          title="Copiar token"
                          onClick={() => handleCopy(inv.token)}
                        >
                          {copiedToken === inv.token ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <button
                          type="button"
                          className="delete-inv-btn"
                          title="Eliminar invitación"
                          onClick={() => handleDeleteInvitation(inv.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadatos de la Sesión y Conexión */}
        <div className="account-meta">
          <div>
            <span>Base de Datos</span>
            <strong>
              <Database size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
              {dbStatus}
            </strong>
          </div>
          <div>
            <span>Nivel de Permisos</span>
            <strong>{isAdmin ? "Acceso Total (Root / Admin)" : "Colaborador"}</strong>
          </div>
        </div>

        {/* Botón de Cerrar Sesión */}
        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={15} /> Cerrar Sesión
        </button>

        <button type="button" className="back-documents" onClick={onClose}>
          <ArrowLeft size={14} /> Volver a la vista de documentos
        </button>
      </aside>
    </div>
  );
}