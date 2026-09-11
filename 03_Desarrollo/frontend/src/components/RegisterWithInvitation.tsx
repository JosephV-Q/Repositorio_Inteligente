import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiClientError } from "../services/api";

interface RegisterWithInvitationProps {
  token?: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function extractTokenValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("token=")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://dummy.local/${trimmed}`);
      const t = url.searchParams.get("token");
      if (t) return t.trim();
    } catch {
      const match = trimmed.match(/token=([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
  }
  return trimmed;
}

export const RegisterWithInvitation: React.FC<RegisterWithInvitationProps> = ({
  token: initialToken,
  onCancel,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();

  const [activeToken, setActiveToken] = useState<string | null>(() => {
    return initialToken ? extractTokenValue(initialToken) : null;
  });
  const [tokenInputValue, setTokenInputValue] = useState("");
  const [isValidating, setIsValidating] = useState(Boolean(initialToken));
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [invitationData, setInvitationData] = useState<{
    correo: string;
    rol: number;
    nombre_rol: string;
  } | null>(null);

  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Función para validar un token contra el backend
  const validateToken = useCallback(async (tokenToValidate: string) => {
    const clean = extractTokenValue(tokenToValidate);
    if (!clean) {
      setTokenError("Por favor ingresa un código de invitación válido.");
      return;
    }

    setIsValidating(true);
    setTokenError(null);

    try {
      const res = await api.validateInvitation(clean);
      if (res.valid && res.invitacion) {
        setIsTokenValid(true);
        setInvitationData(res.invitacion);
        setActiveToken(clean);
      } else {
        setIsTokenValid(false);
        setTokenError(
          res.message || res.error || "El enlace o código de invitación no es válido o ya fue utilizado."
        );
      }
    } catch (err) {
      setIsTokenValid(false);
      if (err instanceof ApiClientError) {
        setTokenError(err.message || "Invitación no encontrada o expirada en el sistema.");
      } else {
        setTokenError("No se pudo comprobar la validez de la invitación con el servidor.");
      }
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Si se recibió un token por prop/URL inicial, validarlo automáticamente al montar
  useEffect(() => {
    if (initialToken) {
      validateToken(initialToken);
    }
  }, [initialToken, validateToken]);

  // Manejar envío manual del código de invitación
  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInputValue.trim()) {
      setTokenError("Ingresa tu código o enlace de invitación.");
      return;
    }
    validateToken(tokenInputValue);
  };

  // Manejar registro final
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!activeToken) {
      setSubmitError("Token de invitación ausente.");
      return;
    }

    if (!nombre.trim()) {
      setSubmitError("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!password || password.length < 6) {
      setSubmitError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.register({
        token: activeToken,
        nombre: nombre.trim(),
        password,
      });

      // Actualizar sesión del usuario en el contexto
      await refreshUser();
      onSuccess();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message || "Error al completar el registro.");
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("No se pudo completar el registro del usuario.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToken = () => {
    setActiveToken(null);
    setTokenInputValue("");
    setIsTokenValid(false);
    setTokenError(null);
    setInvitationData(null);
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Cabecera */}
        <div className="login-header">
          <div className="login-brand">
            <div className="login-brand-icon">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1>DocuHub RVD</h1>
              <p>Registro de Usuario en el Repositorio</p>
            </div>
          </div>
        </div>

        {/* Estado 1: Validando token */}
        {isValidating && (
          <div className="invitation-validating">
            <Loader2 size={32} className="spin" />
            <p>Validando código de invitación en Neon DB...</p>
          </div>
        )}

        {/* Estado 2: Error en el token */}
        {!isValidating && !isTokenValid && tokenError && (
          <div className="invitation-error-card">
            <div className="invitation-error-icon">
              <AlertCircle size={36} />
            </div>
            <h3>Invitación no válida</h3>
            <p>{tokenError}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="login-submit-button"
                onClick={handleResetToken}
              >
                <RotateCcw size={16} /> Intentar con otro código
              </button>
              <button
                type="button"
                className="back-to-login-btn"
                onClick={onCancel}
              >
                <ArrowLeft size={14} /> Volver al Inicio de Sesión
              </button>
            </div>
          </div>
        )}

        {/* Estado 3: Sin token activo y sin validar -> Pedir token/enlace */}
        {!isValidating && !isTokenValid && !tokenError && (
          <form onSubmit={handleManualTokenSubmit} className="login-form">
            <div className="invitation-intro-box">
              <KeyRound size={20} className="invitation-intro-icon" />
              <div>
                <strong>Invitación Requerida</strong>
                <p>
                  El registro requiere una invitación autorizada. Si recibiste un
                  correo o enlace del Administrador, ingresa tu código aquí:
                </p>
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="reg-token-input">
                <span>Código o Enlace de Invitación</span>
              </label>
              <div className="login-input-wrap">
                <Ticket size={17} className="input-icon" />
                <input
                  id="reg-token-input"
                  type="text"
                  required
                  placeholder="Pega tu código (ej: 3a9c...) o el enlace completo"
                  value={tokenInputValue}
                  onChange={(e) => setTokenInputValue(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="login-submit-button">
              <ArrowRight size={17} />
              <span>Validar Invitación y Continuar</span>
            </button>

            <button
              type="button"
              className="back-to-login-btn"
              onClick={onCancel}
            >
              <ArrowLeft size={14} /> Volver al Inicio de Sesión
            </button>
          </form>
        )}

        {/* Estado 4: Token validado con éxito -> Formulario de Registro */}
        {!isValidating && isTokenValid && invitationData && (
          <form onSubmit={handleRegister} className="login-form">
            <div className="invitation-summary-box">
              <div className="invitation-summary-header">
                <CheckCircle2 size={16} />
                <span>Invitación autorizada para el sistema</span>
              </div>
              <p>
                Asignado para: <strong>{invitationData.correo}</strong>
              </p>
              <div className="invitation-badge">
                Rol otorgado: <b>{invitationData.nombre_rol || `Rol ${invitationData.rol}`}</b>
              </div>
            </div>

            {submitError && (
              <div className="login-alert-error" role="alert">
                <AlertCircle size={18} className="alert-icon" />
                <div className="alert-content">
                  <strong>Error en registro</strong>
                  <span>{submitError}</span>
                </div>
              </div>
            )}

            <div className="login-field-group">
              <label>Correo Electrónico (Asignado)</label>
              <div className="login-input-wrap">
                <Mail size={17} className="input-icon" />
                <input
                  type="email"
                  value={invitationData.correo}
                  disabled
                  className="input-disabled"
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="reg-nombre">Nombre y Apellido</label>
              <div className="login-input-wrap">
                <User size={17} className="input-icon" />
                <input
                  id="reg-nombre"
                  type="text"
                  required
                  placeholder="Ej: Carlos Santana"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="login-field-group">
              <div className="login-field-header">
                <label htmlFor="reg-password">Contraseña para tu cuenta</label>
                <span className="login-field-hint">Mínimo 6 caracteres</span>
              </div>
              <div className="login-input-wrap">
                <Lock size={17} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              className="login-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="spin" />
                  <span>Creando usuario e iniciando sesión...</span>
                </>
              ) : (
                <>
                  <KeyRound size={17} />
                  <span>Completar Registro y Acceder</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="back-to-login-btn"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <ArrowLeft size={14} /> Volver al Inicio de Sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterWithInvitation;
