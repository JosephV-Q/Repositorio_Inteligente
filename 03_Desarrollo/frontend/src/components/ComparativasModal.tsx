import {
  Check,
  Copy,
  GitCompare,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { api, type Comparativa, type ComparativaSearchResult } from "../services/api";

interface ComparativasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renderizador de texto y markdown básico para el contenido de la comparativa
 */
function MarkdownSnippet({ text }: { text: string }) {
  if (!text) return <span style={{ color: "#94a3b8" }}>Sin contenido registrado.</span>;

  const lines = text.split("\n");
  return (
    <div style={{ fontSize: "12px", color: "#334155", lineHeight: "1.6" }}>
      {lines.slice(0, 15).map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("# ")) {
          return (
            <h4 key={idx} style={{ margin: "6px 0", fontSize: "14px", color: "#0f172a", fontWeight: 700 }}>
              {trimmed.replace(/^#\s+/, "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
          return (
            <h5 key={idx} style={{ margin: "5px 0", fontSize: "13px", color: "#1e3a8a", fontWeight: 600 }}>
              {trimmed.replace(/^#{2,3}\s+/, "")}
            </h5>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} style={{ paddingLeft: "12px", margin: "2px 0" }}>
              • {trimmed.replace(/^[-*]\s+/, "")}
            </div>
          );
        }
        return (
          <p key={idx} style={{ margin: "0 0 4px" }}>
            {line}
          </p>
        );
      })}
      {lines.length > 15 && (
        <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>... (Ver más en detalle)</span>
      )}
    </div>
  );
}

export function ComparativasModal({
  isOpen,
  onClose,
}: ComparativasModalProps) {
  const [query, setQuery] = useState<string>("");
  const [comparativas, setComparativas] = useState<Array<Comparativa | ComparativaSearchResult>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState<boolean>(false);
  const [selectedComparativa, setSelectedComparativa] = useState<Comparativa | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carga inicial o recarga de todas las comparativas
  const loadComparativas = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.getComparativas({ limit: 50 });
      setComparativas(rows);
    } catch (err: any) {
      console.error("Error al cargar comparativas:", err);
      setToastMessage("Error al cargar comparativas de la base de datos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Búsqueda semántica / híbrida reactiva con api.buscarComparativas
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setIsSearchingSemantic(false);
      loadComparativas();
      return;
    }

    let isMounted = true;
    setIsSearchingSemantic(true);

    const timer = setTimeout(async () => {
      try {
        // Ejecución de api.buscarComparativas(texto O params)
        const results = await api.buscarComparativas({
          texto: trimmed,
          modo: "hibrido",
          limit: 30,
        });

        if (isMounted) {
          setComparativas(results);
          setIsSearchingSemantic(false);
        }
      } catch (err: any) {
        console.warn("Aviso al ejecutar api.buscarComparativas:", err);
        if (isMounted) {
          setIsSearchingSemantic(false);
        }
      }
    }, 320);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, isOpen, loadComparativas]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar permanentemente esta comparativa?")) return;

    try {
      await api.deleteComparativa(id);
      setComparativas((prev) => prev.filter((c) => c.id !== id));
      if (selectedComparativa?.id === id) {
        setSelectedComparativa(null);
      }
      setToastMessage("Comparativa eliminada correctamente.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error("Error al eliminar comparativa:", err);
      setToastMessage(`Error al eliminar: ${err?.message || "Fallo en la base de datos"}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleCopy = (comp: Comparativa, e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `# ${comp.titulo}\n\n${comp.descripcion ? `*${comp.descripcion}*\n\n` : ""}${comp.comparativa || ""}`;
    navigator.clipboard.writeText(content);
    setCopiedId(comp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

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
      style={{ zIndex: 110 }}
    >
      <div
        className="detail-panel"
        style={{
          width: "min(1020px, 95vw)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* ENCABEZADO */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #4f46e5, #3730a3)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              }}
            >
              <GitCompare size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Conjuntos y Comparativas RVD Guardadas
                </h2>
                <span
                  style={{
                    background: "#e0e7ff",
                    color: "#3730a3",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {comparativas.length} guardadas
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Búsqueda semántica e indexación vectorial (pgvector) con <code>api.buscarComparativas</code>
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
            }}
            aria-label="Cerrar modal de comparativas"
          >
            <X size={18} />
          </button>
        </header>

        {/* BARRA DE BÚSQUEDA SEMÁNTICA */}
        <div
          style={{
            padding: "14px 24px",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                color: isSearchingSemantic ? "#4f46e5" : "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Buscar en comparativas con IA semántica (ej: proyectos ágiles, presupuestos, arquitectura)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 36px 9px 38px",
                fontSize: "12.5px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#f8fafc",
                transition: "all 0.15s ease",
              }}
            />
            {isSearchingSemantic ? (
              <Loader2
                size={15}
                className="animate-spin"
                style={{ position: "absolute", right: "12px", color: "#4f46e5" }}
              />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={loadComparativas}
            disabled={isLoading}
            title="Recargar comparativas desde la base de datos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* FEEDBACK DE BÚSQUEDA SEMÁNTICA ACTIVA */}
        {query.trim().length > 0 && (
          <div
            style={{
              padding: "8px 24px",
              background: "#eef2ff",
              borderBottom: "1px solid #c7d2fe",
              fontSize: "11.5px",
              color: "#3730a3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={13} style={{ color: "#4f46e5" }} />
              <span>
                Resultados semánticos (pgvector) para: <strong>"{query.trim()}"</strong> — {comparativas.length}{" "}
                coincidencias encontradas.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#4f46e5",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Restablecer
            </button>
          </div>
        )}

        {/* TOAST INTERNO */}
        {toastMessage && (
          <div
            style={{
              padding: "8px 24px",
              background: "#f0fdf4",
              borderBottom: "1px solid #bbf7d0",
              fontSize: "12px",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Check size={14} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* CONTENIDO: LISTA O DETALLE */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f8fafc" }}>
          {selectedComparativa ? (
            /* VISTA DE DETALLE COMPLETO DE UNA COMPARATIVA */
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "14px",
                }}
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedComparativa(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      marginBottom: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ← Volver a la lista de comparativas
                  </button>
                  <h3 style={{ margin: "4px 0", fontSize: "18px", color: "#0f172a", fontWeight: 700 }}>
                    {selectedComparativa.titulo}
                  </h3>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                    {selectedComparativa.categoria && (
                      <span className="category-pill" style={{ padding: "2px 8px", fontSize: "10px" }}>
                        {selectedComparativa.categoria}
                      </span>
                    )}
                    {selectedComparativa.contexto && (
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {selectedComparativa.contexto}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(selectedComparativa, e)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    {copiedId === selectedComparativa.id ? (
                      <Check size={13} style={{ color: "#16a34a" }} />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedId === selectedComparativa.id ? "¡Copiado!" : "Copiar"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(selectedComparativa.id, e)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                </div>
              </div>

              {selectedComparativa.descripcion && (
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px", fontStyle: "italic" }}>
                  {selectedComparativa.descripcion}
                </p>
              )}

              {selectedComparativa.urls && selectedComparativa.urls.length > 0 && (
                <div style={{ marginBottom: "18px", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                    Archivos vinculados al conjunto:
                  </span>
                  <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "11.5px" }}>
                    {selectedComparativa.urls.map((u, uIdx) => (
                      <li key={uIdx}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", wordBreak: "break-all" }}
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  background: "#fbfcfe",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Contenido de la Comparativa / Síntesis RVD:
                </h4>
                <div style={{ whiteSpace: "pre-wrap", fontSize: "12.5px", lineHeight: "1.7", color: "#1e293b" }}>
                  {selectedComparativa.comparativa || "Sin contenido de síntesis."}
                </div>
              </div>
            </div>
          ) : (
            /* LISTADO EN CUADRÍCULA DE COMPARATIVAS */
            <>
              {isLoading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px", color: "#4f46e5" }} />
                  <p style={{ margin: 0, fontSize: "13px" }}>Cargando comparativas...</p>
                </div>
              ) : comparativas.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                  <GitCompare size={40} style={{ margin: "0 auto 12px", color: "#cbd5e1" }} />
                  <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#334155" }}>
                    {query ? "No se encontraron comparativas para tu búsqueda." : "No hay comparativas guardadas aún."}
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                    {query
                      ? "Prueba con otros términos de búsqueda semántica o elimina el filtro."
                      : "Puedes generar un resumen conjunto en el modo RVD y guardarlo con 'api.createComparativa'."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "16px" }}>
                  {comparativas.map((comp) => {
                    const sim = (comp as ComparativaSearchResult).similarity;
                    return (
                      <div
                        key={comp.id}
                        onClick={() => setSelectedComparativa(comp)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "13.5px",
                                fontWeight: 700,
                                color: "#0f172a",
                                lineHeight: "1.4",
                              }}
                            >
                              {comp.titulo}
                            </h4>

                            {sim !== undefined && sim > 0 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "10px",
                                  background: "#eef2ff",
                                  color: "#4338ca",
                                  border: "1px solid #c7d2fe",
                                  whiteSpace: "nowrap",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title={`Similitud semántica vectorial: ${Math.round(sim * 100)}%`}
                              >
                                <Sparkles size={10} /> {Math.round(sim * 100)}%
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                            {comp.categoria && (
                              <span className="category-pill" style={{ padding: "1px 7px", fontSize: "9.5px" }}>
                                {comp.categoria}
                              </span>
                            )}
                            {comp.contexto && (
                              <span
                                style={{
                                  background: "#f1f5f9",
                                  color: "#64748b",
                                  padding: "1px 7px",
                                  borderRadius: "8px",
                                  fontSize: "9.5px",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {comp.contexto}
                              </span>
                            )}
                            {comp.urls && comp.urls.length > 0 && (
                              <span
                                style={{
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  padding: "1px 7px",
                                  borderRadius: "8px",
                                  fontSize: "9.5px",
                                  border: "1px solid #bbf7d0",
                                }}
                              >
                                {comp.urls.length} docs
                              </span>
                            )}
                          </div>

                          {comp.descripcion && (
                            <p
                              style={{
                                margin: "0 0 10px",
                                fontSize: "11px",
                                color: "#64748b",
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {comp.descripcion}
                            </p>
                          )}

                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #f1f5f9",
                              marginBottom: "12px",
                              maxHeight: "90px",
                              overflow: "hidden",
                            }}
                          >
                            <MarkdownSnippet text={comp.comparativa || ""} />
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid #f1f5f9",
                            paddingTop: "10px",
                          }}
                        >
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>ID: #{comp.id}</span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(comp, e)}
                              title="Copiar contenido"
                              style={{
                                background: "transparent",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "10px",
                                color: "#475569",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              {copiedId === comp.id ? <Check size={11} style={{ color: "#16a34a" }} /> : <Copy size={11} />}
                              {copiedId === comp.id ? "¡Listo!" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(comp.id, e)}
                              title="Eliminar comparativa"
                              style={{
                                background: "transparent",
                                border: "1px solid #fecaca",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "10px",
                                color: "#dc2626",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* PIE */}
        <footer
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e9eff5",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Base de datos Neon DB • Módulo de Comparativas y pgvector
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              padding: "6px 16px",
              borderRadius: "6px",
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

export default ComparativasModal;
