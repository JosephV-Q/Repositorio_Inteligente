import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Files,
  GitCompare,
  Loader2,
  Maximize2,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { DocumentItem } from "../types/document";

interface RvdSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: DocumentItem[];
  onOpenDocument?: (doc: DocumentItem) => void;
  onOpenComparativas?: () => void;
}

/**
 * Renderizador ligero y estilizado de Markdown para el resumen en conjunto
 */
function FormattedRvdContent({ text }: { text: string }) {
  if (!text) return null;

  const sections = text.split(/\n\n+/);

  return (
    <div className="rvd-markdown-container" style={{ lineHeight: "1.65", color: "#24374e" }}>
      {sections.map((section, sIdx) => {
        const trimmed = section.trim();

        // Encabezado nivel 1 (# Titulo)
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={sIdx}
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#142c4b",
                borderBottom: "2px solid #e2eaf4",
                paddingBottom: "8px",
                marginTop: sIdx === 0 ? 0 : "22px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Sparkles size={18} style={{ color: "#2563eb" }} />
              <InlineText text={trimmed.replace(/^#\s+/, "")} />
            </h2>
          );
        }

        // Encabezado nivel 2 (## Titulo)
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={sIdx}
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1d3d63",
                marginTop: "20px",
                marginBottom: "10px",
                paddingLeft: "10px",
                borderLeft: "3px solid #3b82f6",
              }}
            >
              <InlineText text={trimmed.replace(/^##\s+/, "")} />
            </h3>
          );
        }

        // Encabezado nivel 3 (### Titulo)
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={sIdx}
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#284a75",
                marginTop: "16px",
                marginBottom: "8px",
              }}
            >
              <InlineText text={trimmed.replace(/^###\s+/, "")} />
            </h4>
          );
        }

        // Bloque de código ```
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
          const lines = trimmed.slice(3, -3).trim().split("\n");
          return (
            <pre
              key={sIdx}
              style={{
                background: "#0f172a",
                color: "#e2e8f0",
                padding: "12px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                overflowX: "auto",
                margin: "12px 0",
              }}
            >
              <code>{lines.join("\n")}</code>
            </pre>
          );
        }

        // Lista de viñetas
        const lines = trimmed.split("\n");
        const isBulletList = lines.every(
          (l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || /^\d+\.\s/.test(l.trim())
        );

        if (isBulletList) {
          return (
            <ul
              key={sIdx}
              style={{
                margin: "10px 0 14px 18px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {lines.map((item, lIdx) => {
                const cleanItem = item.trim().replace(/^[-*]\s+|\d+\.\s+/, "");
                return (
                  <li key={lIdx} style={{ fontSize: "12.5px", color: "#334b66" }}>
                    <InlineText text={cleanItem} />
                  </li>
                );
              })}
            </ul>
          );
        }

        // Párrafo estándar
        return (
          <p
            key={sIdx}
            style={{
              margin: "0 0 12px",
              fontSize: "12.5px",
              color: "#2d4460",
              lineHeight: "1.65",
            }}
          >
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                <InlineText text={line} />
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Formateo inline de negrita, cursiva y código
 */
function InlineText({ text }: { text: string }) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith("`") && tok.endsWith("`")) {
          return (
            <code
              key={i}
              style={{
                background: "#f1f5f9",
                color: "#0f172a",
                padding: "2px 5px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              {tok.slice(1, -1)}
            </code>
          );
        }
        if (tok.startsWith("**") && tok.endsWith("**")) {
          return (
            <strong key={i} style={{ color: "#11263d", fontWeight: 700 }}>
              {tok.slice(2, -2)}
            </strong>
          );
        }
        if (tok.startsWith("*") && tok.endsWith("*")) {
          return <em key={i}>{tok.slice(1, -1)}</em>;
        }
        return tok;
      })}
    </>
  );
}

export function RvdSummaryModal({
  isOpen,
  onClose,
  selectedDocuments,
  onOpenDocument,
  onOpenComparativas,
}: RvdSummaryModalProps) {
  const [jointSummary, setJointSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"joint" | "individuals">("joint");

  // Estados para guardar el conjunto con api.createComparativa(datos)
  const [showSaveForm, setShowSaveForm] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveCategory, setSaveCategory] = useState<string>("");
  const [saveContext, setSaveContext] = useState<string>("");
  const [saveDescription, setSaveDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Inicializar valores sugeridos al cambiar la selección de documentos
  useEffect(() => {
    if (selectedDocuments && selectedDocuments.length > 0) {
      const defaultTitle =
        "Conjunto RVD: " +
        selectedDocuments
          .slice(0, 2)
          .map((d) => d.title)
          .join(" + ") +
        (selectedDocuments.length > 2 ? ` y ${selectedDocuments.length - 2} más` : "");
      setSaveTitle(defaultTitle);
      setSaveCategory(selectedDocuments[0]?.category || "Proyectos Activos");
      setSaveContext(selectedDocuments[0]?.contexto || "Análisis Conjunto RVD");
      setSaveDescription(`Síntesis cruzada de ${selectedDocuments.length} documentos generada con IA.`);
      setShowSaveForm(false);
      setSaveSuccess(null);
    }
  }, [selectedDocuments]);

  // Guardar el conjunto usando api.createComparativa(datos)
  const handleSaveComparativa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jointSummary || !saveTitle.trim()) return;

    setIsSaving(true);
    try {
      const urls = selectedDocuments
        .map((d) => d.viewUrl || d.ruta_arch || "")
        .filter(Boolean);

      const nuevaComp = await api.createComparativa({
        titulo: saveTitle.trim(),
        categoria: saveCategory.trim() || undefined,
        contexto: saveContext.trim() || undefined,
        descripcion: saveDescription.trim() || undefined,
        comparativa: jointSummary,
        urls: urls.length > 0 ? urls : undefined,
      });

      setSaveSuccess(
        `¡Conjunto guardado exitosamente como Comparativa #${nuevaComp.id} con indexación vectorial (pgvector)!`
      );
      setShowSaveForm(false);
      setTimeout(() => setSaveSuccess(null), 6000);
    } catch (err: any) {
      console.error("Error al guardar comparativa:", err);
      alert(`Error al guardar: ${err?.message || "Fallo en la comunicación con el servidor"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Generador de resumen en conjunto con Gemini AI a partir de los resúmenes individuales
  const generateJointSummary = useCallback(async () => {
    if (!selectedDocuments || selectedDocuments.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Extraer los resúmenes individuales y metadatos de cada documento seleccionado
      const individualSummariesPayload = selectedDocuments.map((doc, idx) => {
        const summaryText =
          Array.isArray(doc.summary) && doc.summary.length > 0
            ? doc.summary.join("\n")
            : doc.description || "Sin resumen individual registrado.";

        return `
============================================================
DOCUMENTO ${idx + 1}: "${doc.title}"
Categoría: ${doc.category}
Formato: ${doc.format}
${doc.author ? `Autor: ${doc.author}\n` : ""}${doc.contexto ? `Contexto / Ámbito: ${doc.contexto}\n` : ""}${doc.palabras_clave && doc.palabras_clave.length > 0 ? `Palabras clave: ${doc.palabras_clave.join(", ")}\n` : ""}
RESUMEN INDIVIDUAL DEL DOCUMENTO:
${summaryText}
============================================================`;
      }).join("\n");

      // 2. Construir el prompt analítico para la síntesis conjunta
      const prompt = `Actúa como analista y sintetizador documental de alto nivel para el sistema "DocuHub RVD" (Resumen de Varios Documentos).

Tienes ante ti los RESÚMENES INDIVIDUALES y metadatos de ${selectedDocuments.length} documentos seleccionados del repositorio institucional:

${individualSummariesPayload}

INSTRUCCIONES CLAVE:
A partir de los RESÚMENES INDIVIDUALES anteriores como fuente fundamental y verídica, genera un RESUMEN EN CONJUNTO exhaustivo, analítico, profesional y perfectamente estructurado que sintetice y conecte todos los documentos seleccionados.

Estructura tu respuesta exactamente con estas secciones en formato Markdown:

# 📊 Resumen Ejecutivo en Conjunto (RVD)

## 1. 🎯 Propósito y Eje Temático Conductor
Explica el hilo conductor común que une a estos documentos, qué problemática, área o proyecto abordan en conjunto y cuál es su alcance global.

## 2. 🔑 Síntesis Integrada de Puntos Clave
Desarrolla los aportes y hallazgos fundamentales de cada documento dentro del grupo:
${selectedDocuments.map((d) => `- **"${d.title}"** (${d.category}): [Síntesis de su aporte central según su resumen individual]`).join("\n")}

## 3. ⚖️ Análisis Comparativo (Convergencias y Divergencias)
- **Convergencias / Puntos de Encuentro:** Metodologías, objetivos, estándares o conclusiones que comparten.
- **Divergencias / Contrastes:** Enfoques distintos, alcances particulares o complementariedades clave entre ellos.

## 4. 💡 Conclusiones y Recomendaciones Globales
Ofrece una conclusión analítica unificada sobre el valor del conjunto documental y recomendaciones prácticas para el equipo de trabajo.

Mantén un tono riguroso y objetivo. Cita siempre los títulos de los documentos para facilitar la trazabilidad.`;

      // 3. Invocación de api.askGemini({ prompt, ... })
      const res = await api.askGemini({
        prompt,
        systemInstruction:
          "Eres DocuHub RVD, un motor de inteligencia artificial especializado en la consolidación, síntesis cruzada y análisis comparativo de múltiples documentos a partir de sus resúmenes individuales.",
        temperature: 0.25,
        maxOutputTokens: 3500,
      });

      if (res.success && res.data?.response) {
        setJointSummary(res.data.response);
      } else {
        throw new Error(
          (res as any)?.error || "No se obtuvo una respuesta válida de Gemini AI."
        );
      }
    } catch (err: any) {
      console.error("[RvdSummaryModal] Error al generar resumen conjunto:", err);
      setErrorMessage(
        err?.message || "Ocurrió un error al comunicarse con Gemini AI para generar el resumen conjunto."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocuments]);

  // Ejecutar generación automática cuando se abre el modal
  useEffect(() => {
    if (isOpen && selectedDocuments.length > 0) {
      setJointSummary(null);
      generateJointSummary();
    }
  }, [isOpen, selectedDocuments, generateJointSummary]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!jointSummary) return;
    try {
      await navigator.clipboard.writeText(jointSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("No se pudo copiar al portapapeles:", err);
    }
  };

  const handleDownload = () => {
    if (!jointSummary) return;
    const blob = new Blob([jointSummary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Resumen_Conjunto_RVD_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100 }}
    >
      <div
        className="detail-panel"
        style={{
          width: "min(960px, 95vw)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* ENCABEZADO DEL MODAL */}
        <header
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e9eff5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #f8fafc, #f1f5f9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              <Files size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Resumen en Conjunto RVD
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={11} /> {selectedDocuments.length} documentos seleccionados
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Síntesis analítica cruzada generada con Gemini AI integrando los resúmenes individuales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              padding: "6px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              transition: "background-color 0.15s",
            }}
            aria-label="Cerrar modal RVD"
          >
            <X size={18} />
          </button>
        </header>

        {/* CINTA DE DOCUMENTOS SELECCIONADOS */}
        <div
          style={{
            padding: "10px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            scrollbarWidth: "thin",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
            Fuentes RVD:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
            {selectedDocuments.map((doc, idx) => (
              <button
                key={doc.id || idx}
                type="button"
                onClick={() => onOpenDocument && onOpenDocument(doc)}
                title={`Ver detalles de ${doc.title}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "#1e293b",
                  cursor: onOpenDocument ? "pointer" : "default",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "1px 5px",
                    borderRadius: "4px",
                  }}
                >
                  {doc.format}
                </span>
                <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {doc.title}
                </span>
                {onOpenDocument && <ArrowRight size={10} style={{ color: "#94a3b8" }} />}
              </button>
            ))}
          </div>
        </div>

        {/* BARRA DE ACCIONES Y PESTAÑAS */}
        <div
          style={{
            padding: "10px 24px",
            borderBottom: "1px solid #e9eff5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Selector de pestañas */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("joint")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === "joint" ? "#2563eb" : "#f1f5f9",
                color: activeTab === "joint" ? "#ffffff" : "#475569",
                transition: "all 0.15s",
              }}
            >
              <Sparkles size={13} />
              Resumen en Conjunto (IA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("individuals")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === "individuals" ? "#2563eb" : "#f1f5f9",
                color: activeTab === "individuals" ? "#ffffff" : "#475569",
                transition: "all 0.15s",
              }}
            >
              <FileText size={13} />
              Resúmenes individuales ({selectedDocuments.length})
            </button>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {jointSummary && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(!showSaveForm)}
                  title="Guardar este conjunto como comparativa permanente en la base de datos (api.createComparativa)"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: showSaveForm ? "#4338ca" : "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                  }}
                >
                  <Save size={13} />
                  {showSaveForm ? "Cerrar formulario" : "Guardar Conjunto"}
                </button>
                {onOpenComparativas && (
                  <button
                    type="button"
                    onClick={onOpenComparativas}
                    title="Ver y buscar en todas las comparativas guardadas"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#e0e7ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "6px",
                      padding: "6px 11px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#3730a3",
                      cursor: "pointer",
                    }}
                  >
                    <GitCompare size={13} />
                    Ver Guardadas
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copiar texto del resumen al portapapeles"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "6px 11px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={13} style={{ color: "#16a34a" }} /> : <Copy size={13} />}
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Descargar resumen en formato Markdown"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "6px 11px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} />
                  Descargar .md
                </button>
              </>
            )}
            <button
              type="button"
              onClick={generateJointSummary}
              disabled={isLoading}
              title="Regenerar el resumen en conjunto con Gemini AI"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "6px 11px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#2563eb",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Sintetizando..." : "Regenerar"}
            </button>
          </div>
        </div>

        {/* NOTIFICACIÓN DE ÉXITO AL GUARDAR */}
        {saveSuccess && (
          <div
            style={{
              padding: "10px 24px",
              background: "#ecfdf5",
              borderBottom: "1px solid #a7f3d0",
              color: "#065f46",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={16} style={{ color: "#059669" }} />
              <span>{saveSuccess}</span>
            </div>
            {onOpenComparativas && (
              <button
                type="button"
                onClick={onOpenComparativas}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Abrir Comparativas →
              </button>
            )}
          </div>
        )}

        {/* FORMULARIO DESPLEGABLE PARA GUARDAR COMO COMPARATIVA */}
        {showSaveForm && (
          <form
            onSubmit={handleSaveComparativa}
            style={{
              padding: "16px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                <Save size={15} style={{ color: "#4f46e5" }} />
                Guardar Conjunto como Comparativa permanente (api.createComparativa)
              </strong>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Indexación automática en pgvector para búsqueda semántica
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Título del Conjunto / Comparativa *
                </label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Ej: Síntesis Comparativa Q3: Finanzas y Operaciones"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Categoría
                </label>
                <input
                  type="text"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  placeholder="Ej: Proyectos Activos"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Contexto / Ámbito
                </label>
                <input
                  type="text"
                  value={saveContext}
                  onChange={(e) => setSaveContext(e.target.value)}
                  placeholder="Ej: Ingesta RVD"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Descripción breve (Opcional)
              </label>
              <input
                type="text"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Breve resumen del propósito de este conjunto..."
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Archivos vinculados al conjunto: <strong>{selectedDocuments.length}</strong>
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#64748b",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !saveTitle.trim()}
                  style={{
                    background: "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    padding: "6px 16px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {isSaving ? "Guardando en BD..." : "Confirmar y Guardar Comparativa"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* CUERPO DEL CONTENIDO */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            background: "#ffffff",
          }}
        >
          {/* VISTA 1: RESUMEN EN CONJUNTO CON GEMINI */}
          {activeTab === "joint" && (
            <>
              {isLoading && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <Loader2 size={28} className="animate-spin" />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>
                    Generando resumen en conjunto con Gemini AI...
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", maxWidth: "420px" }}>
                    Analizando y cruzando los resúmenes individuales de los {selectedDocuments.length} documentos
                    seleccionados para extraer convergencias, contrastes y conclusiones clave.
                  </p>
                </div>
              )}

              {errorMessage && !isLoading && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    color: "#991b1b",
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700 }}>
                      Error al generar el resumen conjunto
                    </h4>
                    <p style={{ margin: "0 0 10px", fontSize: "12px" }}>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={generateJointSummary}
                      style={{
                        background: "#dc2626",
                        color: "#ffffff",
                        border: "none",
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reintentar generación
                    </button>
                  </div>
                </div>
              )}

              {jointSummary && !isLoading && !errorMessage && (
                <div
                  style={{
                    background: "#fbfcfe",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "24px 28px",
                  }}
                >
                  <FormattedRvdContent text={jointSummary} />
                </div>
              )}
            </>
          )}

          {/* VISTA 2: RESÚMENES INDIVIDUALES DE CADA ARCHIVO */}
          {activeTab === "individuals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "12px",
                  color: "#1e40af",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FileText size={16} />
                <span>
                  Estos son los resúmenes y metadatos individuales tomados directamente de cada documento en el
                  repositorio, utilizados por <code>api.askGemini</code> para elaborar la síntesis conjunta.
                </span>
              </div>

              {selectedDocuments.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#e2e8f0",
                          color: "#334155",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>{doc.title}</strong>
                      <span className={`file-badge ${doc.format.toLowerCase()}`}>{doc.format}</span>
                      <span className="category-pill" style={{ padding: "2px 8px", fontSize: "9px" }}>
                        {doc.category}
                      </span>
                    </div>

                    {onOpenDocument && (
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#2563eb",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Maximize2 size={12} /> Ver documento
                      </button>
                    )}
                  </div>

                  {doc.contexto && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#475569",
                        background: "#f8fafc",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        marginBottom: "10px",
                      }}
                    >
                      <strong>Ámbito / Contexto:</strong> {doc.contexto}
                    </div>
                  )}

                  <div style={{ paddingLeft: "4px" }}>
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Puntos Clave / Resumen del Archivo:
                    </p>
                    {Array.isArray(doc.summary) && doc.summary.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {doc.summary.map((pt, pIdx) => (
                          <li key={pIdx} style={{ fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
                            <InlineText text={pt} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                        {doc.description || "Sin resumen individual registrado."}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <footer
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e9eff5",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            DocuHub RVD • Resumen Multidocumental Impulsado por Gemini AI
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              padding: "7px 18px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

export default RvdSummaryModal;
