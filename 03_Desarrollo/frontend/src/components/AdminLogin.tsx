import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiClientError } from "../services/api";

interface AdminLoginProps {
  onSuccess?: () => void;
  onRegister?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onRegister }) => {
  const { login, authError, clearAuthError } = useAuth();

  const [gmail, setGmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("admin123456");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [backendMessage, setBackendMessage] = useState<string>("Verificando conexión con Neon DB...");

  // Verificar estado del backend al cargar la pantalla de login
  useEffect(() => {
    let active = true;

    async function verifyBackend() {
      try {
        const health = await api.getHealth();
        if (active) {
          if (health && health.status === "online") {
            setBackendStatus("online");
            setBackendMessage("Backend Express & Neon DB activos");
          } else {
            setBackendStatus("online");
            setBackendMessage("Servicios en línea");
          }
        }
      } catch (err) {
        console.warn("Error comprobando salud de backend:", err);
        if (active) {
          setBackendStatus("offline");
          setBackendMessage("Servidor en reconexión o latencia alta");
        }
      }
    }

    verifyBackend();
    return () => {
      active = false;
    };
  }, []);

  const handleFillDemo = () => {
    setGmail("admin@admin.com");
    setPassword("admin123456");
    setLocalError(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const cleanEmail = gmail.trim();
    if (!cleanEmail) {
      setLocalError("Por favor ingresa tu correo electrónico.");
      return;
    }

    if (!password) {
      setLocalError("Por favor ingresa tu contraseña de administrador.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        gmail: cleanEmail,
        password,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setLocalError(err.message || "Error al autenticar en el servidor.");
      } else if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError("No fue posible comunicarse con el servicio de autenticación.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Cabecera / Marca */}
        <div className="login-header">
          <div className="login-brand">
            <div className="login-brand-icon">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1>DocuHub RVD</h1>
              <p>Sistema Inteligente de Gestión y Análisis Documental</p>
            </div>
          </div>

          <div className="login-badge-wrap">
            <div
              className={`login-server-status status-${backendStatus}`}
              title={backendMessage}
            >
              <Database size={12} />
              <span className="status-dot" />
              <small>{backendMessage}</small>
            </div>
          </div>
        </div>

        {/* Notificación de Error */}
        {activeError && (
          <div className="login-alert-error" role="alert">
            <AlertCircle size={18} className="alert-icon" />
            <div className="alert-content">
              <strong>Error de autenticación</strong>
              <span>{activeError}</span>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label htmlFor="login-gmail">
              <span>Correo de Administrador (Gmail)</span>
            </label>
            <div className="login-input-wrap">
              <Mail size={17} className="input-icon" />
              <input
                id="login-gmail"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@admin.com"
                value={gmail}
                onChange={(e) => {
                  setGmail(e.target.value);
                  if (activeError) clearAuthError();
                  setLocalError(null);
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="login-field-group">
            <div className="login-field-header">
              <label htmlFor="login-password">
                <span>Contraseña del Sistema</span>
              </label>
              <span className="login-field-hint">Mínimo 6 caracteres</span>
            </div>
            <div className="login-input-wrap">
              <Lock size={17} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (activeError) clearAuthError();
                  setLocalError(null);
                }}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            className="login-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={17} className="spin" />
                <span>Verificando credenciales en Neon DB...</span>
              </>
            ) : (
              <>
                <KeyRound size={17} />
                <span>Iniciar Sesión en el Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Acceso a Registro */}
        {onRegister && (
          <div className="login-register-row">
            <span>¿Tienes un enlace o código de invitación?</span>
            <button
              type="button"
              className="login-register-btn"
              onClick={onRegister}
            >
              <UserPlus size={15} />
              <span>Registrarse</span>
            </button>
          </div>
        )}

        {/* Acceso Rápido Demo / Pruebas */}
        <div className="login-quick-demo">
          <div className="demo-header">
            <span>Credenciales de Arranque (Preconfiguradas):</span>
          </div>
          <div className="demo-credentials-box">
            <div className="demo-row">
              <small>Usuario:</small> <code>admin@admin.com</code>
            </div>
            <div className="demo-row">
              <small>Contraseña:</small> <code>admin123456</code>
            </div>
            <button
              type="button"
              className="demo-fill-btn"
              onClick={handleFillDemo}
              disabled={isSubmitting}
            >
              <CheckCircle2 size={13} /> Autocompletar datos de admin
            </button>
          </div>
        </div>

        {/* Pie de Seguridad */}
        <div className="login-security-footer">
          <small>
            Sesión autenticada vía Token Criptográfico HMAC-SHA256 • Conexión cifrada TLS con Neon PostgreSQL &amp; Google Drive Storage.
          </small>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
