import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiClientError } from "../services/api";

interface RegisterWithInvitationProps {
  token: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const RegisterWithInvitation: React.FC<RegisterWithInvitationProps> = ({
  token,
  onCancel,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
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

  // Paso 1: Validar token al cargar el componente
  useEffect(() => {
    let active = true;

    async function validate() {
      setIsValidating(true);
      setTokenError(null);

      try {
        const res = await api.validateInvitation(token);
        if (active) {
          if (res.valid && res.invitacion) {
            setIsTokenValid(true);
            setInvitationData(res.invitacion);
          } else {
            setIsTokenValid(false);
            setTokenError(res.message || res.error || "El enlace de invitación no es válido o ya fue utilizado.");
          }
        }
      } catch (err) {
        if (active) {
          setIsTokenValid(false);
          if (err instanceof ApiClientError) {
            setTokenError(err.message || "Invitación no encontrada o expirada.");
          } else {
            setTokenError("No se pudo comprobar la validez de la invitación.");
          }
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    }

    validate();
    return () => {
      active = false;
    };
  }, [token]);

  // Paso 2: Registrar usuario
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

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
        token,
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
              <p>Registro de Nuevo Colaborador por Invitación</p>
            </div>
          </div>
        </div>

        {/* Estado 1: Validando token */}
        {isValidating && (
          <div className="invitation-validating">
            <Loader2 size={32} className="spin" />
            <p>Validando enlace de invitación en Neon DB...</p>
          </div>
        )}

        {/* Estado 2: Token inválido */}
        {!isValidating && !isTokenValid && (
          <div className="invitation-error-card">
            <div className="invitation-error-icon">
              <AlertCircle size={36} />
            </div>
            <h3>Enlace de invitación no disponible</h3>
            <p>{tokenError}</p>
            <button type="button" className="login-submit-button" onClick={onCancel}>
              <ArrowLeft size={16} /> Volver al Inicio de Sesión
            </button>
          </div>
        )}

        {/* Estado 3: Token válido - Formulario de registro */}
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
              <label>Correo Electrónico (Solo Lectura)</label>
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
