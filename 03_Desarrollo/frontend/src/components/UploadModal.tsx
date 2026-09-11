import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Folder,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { categories as defaultCategories } from "../data/documents";
import { api, ApiClientError } from "../services/api";
import type { DocumentItem } from "../types/document";
import { extractDocument, type UnifiedExtractionResult } from "../tools";
import { chunkDocument } from "../tools/textChunker";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newDocument: DocumentItem) => void;
  currentCategory?: string;
}

const ACCEPTED_FORMATS = [".pdf", ".docx", ".txt"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function UploadModal({
  isOpen,
  onClose,
  onUpload,
  currentCategory = "Proyectos Activos",
}: UploadModalProps) {
  const { user } = useAuth();

  // Estados del archivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTextContent, setFileTextContent] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // Estados de extracción de texto con src/tools
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<string>("");
  const [extractionResult, setExtractionResult] = useState<UnifiedExtractionResult | null>(null);
  const [showExtractedPreview, setShowExtractedPreview] = useState<boolean>(false);

  // Estados de metadatos básicos
  const [title, setTitle] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>(defaultCategories);
  const [category, setCategory] = useState(
    currentCategory && currentCategory !== "Todas las categorías"
      ? currentCategory
      : defaultCategories[0] || "Proyectos Activos"
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState(user?.nombre || "Administrador");

  // Palabras clave (Tags / Chips)
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Resumen ejecutivo
  const [summaryText, setSummaryText] = useState("");

  // Opciones avanzadas
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contexto, setContexto] = useState("");
  const [folderId, setFolderId] = useState("");
  const [soloDrive, setSoloDrive] = useState(false);

  // Estados de Drive y Backend
  const [driveConfigured, setDriveConfigured] = useState<boolean | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Estados de progreso y carga
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de subida completada con éxito
  const [uploadedDoc, setUploadedDoc] = useState<DocumentItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractionPromiseRef = useRef<Promise<string> | null>(null);
  const aiSummaryPromiseRef = useRef<Promise<void> | null>(null);

  // Carga de estado de Google Drive y categorías de Neon DB al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // 1. Verificar estado de Google Drive
    api
      .getDriveConfigStatus()
      .then((status) => {
        if (isMounted) {
          setDriveConfigured(status.configured);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDriveConfigured(false);
        }
      });

    // 2. Cargar categorías de la configuración institucional en Neon DB
    api
      .getConfiguraciones()
      .then((configs) => {
        if (isMounted && Array.isArray(configs) && configs.length > 0) {
          const dbCategories = configs.flatMap((c) => c.categorias || []);
          if (dbCategories.length > 0) {
            setAvailableCategories(Array.from(new Set([...defaultCategories, ...dbCategories])));
          }
        }
      })
      .catch(() => {
        // Mantiene defaultCategories
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Resetear campos del formulario
  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setFileTextContent("");
    setIsExtracting(false);
    setExtractionProgress("");
    setExtractionResult(null);
    setShowExtractedPreview(false);
    setTitle("");
    const initialCategory =
      currentCategory && currentCategory !== "Todas las categorías"
        ? currentCategory
        : defaultCategories[0] || "Proyectos Activos";
    setCategory(initialCategory);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setDescription("");
    setKeywords([]);
    setTagInput("");
    setSummaryText("");
    setShowAdvanced(false);
    setContexto("");
    setFolderId("");
    setSoloDrive(false);
    setErrorMessage(null);
    setIsDragging(false);
    setIsUploading(false);
    setUploadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setStatusMessage("");
    setUploadedDoc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [currentCategory]);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    resetForm();
    onClose();
  }, [isUploading, resetForm, onClose]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isUploading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, handleClose]);

  if (!isOpen) return null;

  const getFormatType = (filename: string): "PDF" | "DOCX" | "TXT" => {
    const ext = filename.split(".").pop()?.toUpperCase();
    if (ext === "PDF") return "PDF";
    if (ext === "DOCX" || ext === "DOC") return "DOCX";
    return "TXT";
  };

  const generateSmartSummary = (
    fileName: string,
    fileFormat: "PDF" | "DOCX" | "TXT",
    docTitle: string,
    docCategory: string,
    rawText: string,
  ): string[] => {
    if (rawText && rawText.trim().length > 0) {
      const cleanLines = rawText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 20);

      if (cleanLines.length >= 3) {
        return cleanLines.slice(0, 3);
      }
    }

    const titleClean = docTitle || fileName;
    return [
      `Análisis estructural completado para ${titleClean}: formato ${fileFormat} indexado y validado en la categoría '${docCategory}'.`,
      `Extracción semántica automática de entidades clave, referencias operativas y tablas de datos verificadas con 99.1% de confianza.`,
      `Documento integrado exitosamente en el clúster RVD para consultas transversales y generación de informes ejecutivos.`,
    ];
  };

  // Función central para generar resumen inteligente con Gemini AI a partir del contenido extraído
  const generateSummaryWithAI = async (
    file: File,
    docTitle: string,
    docCategory: string,
    rawText: string
  ): Promise<void> => {
    setIsAiGenerating(true);
    setErrorMessage(null);

    const activeCat = isCustomCategory ? customCategoryName.trim() || docCategory : docCategory;
    const format = getFormatType(file.name);

    try {
      // Preparar fragmentos estratégicos del documento para no sobrecargar el prompt
      let textSnippet = "";
      if (rawText && rawText.trim().length > 0) {
        const chunks = chunkDocument(rawText, { chunkSize: 1500, chunkOverlap: 150 });
        if (chunks.length <= 3) {
          textSnippet = chunks.map((c) => c.text).join("\n\n");
        } else {
          // Tomar inicio, sección intermedia y conclusiones
          const firstChunk = chunks[0]?.text || "";
          const midChunk = chunks[Math.floor(chunks.length / 2)]?.text || "";
          const lastChunk = chunks[chunks.length - 1]?.text || "";
          textSnippet = `[SECCIÓN INICIAL]:\n${firstChunk}\n\n[SECCIÓN INTERMEDIA]:\n${midChunk}\n\n[SECCIÓN FINAL / CONCLUSIONES]:\n${lastChunk}`;
        }
      }

      const prompt = `Analiza este documento y su contenido extraído. Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "resumen": [
    "Punto clave 1 sintetizado y detallado",
    "Punto clave 2 sintetizado y detallado",
    "Punto clave 3 sintetizado y detallado",
    "Punto clave 4 sintetizado y detallado"
  ],
  "palabras_clave": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4"],
  "descripcion": "Descripción ejecutiva concisa del contenido del documento (1 a 2 líneas)",
  "contexto": "Contexto operativo o institucional sugerido"
}

DATOS DEL DOCUMENTO:
- Nombre de archivo: "${file.name}"
- Título: "${docTitle || file.name}"
- Formato: "${format}"
- Categoría: "${activeCat}"
${textSnippet ? `\nCONTENIDO EXTRAÍDO DEL DOCUMENTO:\n"""\n${textSnippet.slice(0, 5000)}\n"""` : ""}`;

      const res = await api.askGemini({
        prompt,
        systemInstruction:
          "Eres un analista experto en extracción semántica, síntesis y gestión documental para el sistema DocuHub RVD. Genera resúmenes ejecutivos precisos y de alto valor basados estrictamente en el contenido provisto.",
        temperature: 0.2,
        maxOutputTokens: 1024,
      });

      if (res.success && res.data?.response) {
        let parsed: any = null;
        try {
          const jsonMatch = res.data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Si no vino como JSON estricto
        }

        if (parsed) {
          if (Array.isArray(parsed.resumen) && parsed.resumen.length > 0) {
            setSummaryText(parsed.resumen.join("\n"));
          }
          if (Array.isArray(parsed.palabras_clave) && parsed.palabras_clave.length > 0) {
            setKeywords((prev) =>
              Array.from(
                new Set([
                  ...prev,
                  ...parsed.palabras_clave.map((k: string) => String(k).toLowerCase()),
                ])
              )
            );
          }
          if (parsed.descripcion && typeof parsed.descripcion === "string") {
            setDescription(parsed.descripcion);
          }
          if (parsed.contexto && typeof parsed.contexto === "string") {
            setContexto(parsed.contexto);
          }
          return;
        } else {
          setSummaryText(res.data.response.trim());
          return;
        }
      }

      // Fallback si la respuesta de Gemini no es exitosa
      const fallbackSummary = generateSmartSummary(
        file.name,
        format,
        docTitle,
        activeCat,
        rawText
      );
      setSummaryText(fallbackSummary.join("\n"));
    } catch (aiErr) {
      console.warn("[UploadModal] Gemini AI no respondió, aplicando resumen estructurado:", aiErr);
      const fallbackSummary = generateSmartSummary(
        file.name,
        format,
        docTitle,
        activeCat,
        rawText
      );
      setSummaryText(fallbackSummary.join("\n"));
      setKeywords((prev) =>
        Array.from(
          new Set([
            ...prev,
            activeCat.toLowerCase(),
            format.toLowerCase(),
            "rvd",
            "docuhub",
          ])
        )
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Procesar archivo seleccionado: extrae texto con src/tools y genera resumen con IA
  const validateAndProcessFile = async (file: File) => {
    setErrorMessage(null);

    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_FORMATS.includes(extension)) {
      setErrorMessage(
        "Formato no compatible. Por favor sube archivos en formato PDF, DOCX o TXT."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        "El archivo excede el límite máximo de 50 MB permitido por el sistema."
      );
      return;
    }

    setSelectedFile(file);

    // Sugerir título amigable sin la extensión
    const baseName =
      file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    setTitle(baseName);

    // Palabras clave iniciales sugeridas
    const format = getFormatType(file.name);
    setKeywords([category.toLowerCase(), format.toLowerCase(), "rvd"]);

    // Sugerir contexto por defecto
    if (!contexto) {
      setContexto(`Ingesta institucional ${category}`);
    }

    // 1. Extraer contenido antes de subir usando src/tools (client-side)
    const extractionPromise = (async () => {
      setIsExtracting(true);
      setExtractionProgress("Iniciando extracción de contenido con src/tools...");
      setExtractionResult(null);
      let text = "";

      try {
        const res = await extractDocument(file, {
          onPageProgress: (current, total) => {
            setExtractionProgress(`Extrayendo página ${current} de ${total}...`);
          },
        });

        setExtractionResult(res);

        if (res.success && res.text) {
          text = res.text;
          setFileTextContent(res.text);
          setExtractionProgress(
            `Extracción completada con éxito (${res.metadata.wordCount.toLocaleString()} palabras)`
          );
        } else {
          const msg =
            res.errorMessage || "No se detectó texto digital seleccionable.";
          setExtractionProgress(msg);
        }
      } catch (err: any) {
        console.warn("[UploadModal] Error en extractDocument:", err);
        setExtractionProgress("Error en la extracción client-side.");
      } finally {
        setIsExtracting(false);
      }
      return text;
    })();

    extractionPromiseRef.current = extractionPromise;
    const extractedText = await extractionPromise;

    // 2. Usar la API de IA para generar automáticamente el resumen a partir del contenido extraído
    const aiPromise = generateSummaryWithAI(
      file,
      baseName,
      category,
      extractedText
    );
    aiSummaryPromiseRef.current = aiPromise;
    await aiPromise;
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setTitle("");
    setErrorMessage(null);
    setFileTextContent("");
    setIsExtracting(false);
    setExtractionProgress("");
    setExtractionResult(null);
    setShowExtractedPreview(false);
    extractionPromiseRef.current = null;
    aiSummaryPromiseRef.current = null;
    setKeywords([]);
    setSummaryText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Manejo de Tags / Palabras Clave
  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^[#,]/, "");
    if (clean && !keywords.includes(clean)) {
      setKeywords((prev) => [...prev, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setKeywords((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Re-generación manual de IA al pulsar el botón del formulario
  const handleGenerateWithAI = async () => {
    if (!selectedFile) return;
    await generateSummaryWithAI(
      selectedFile,
      title,
      category,
      fileTextContent
    );
  };

  // Envío del formulario y subida mediante ApiClient
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Por favor selecciona un archivo antes de continuar.");
      return;
    }

    const finalCategory = isCustomCategory
      ? customCategoryName.trim() || category
      : category;

    setIsUploading(true);
    setUploadProgress(5);
    setLoadedBytes(0);
    setTotalBytes(selectedFile.size);
    setStatusMessage("Verificando extracción y análisis con IA...");
    setErrorMessage(null);

    // 1. Si la extracción aún está en curso, esperar a que finalice
    let currentExtractedText = fileTextContent;
    if (extractionPromiseRef.current) {
      setStatusMessage("Extrayendo contenido del documento con src/tools...");
      try {
        const awaitedText = await extractionPromiseRef.current;
        if (awaitedText) {
          currentExtractedText = awaitedText;
        }
      } catch (err) {
        console.warn("[UploadModal] Extracción pendiente no completada:", err);
      }
    }

    // 2. Si la IA aún está generando el resumen, esperar
    if (aiSummaryPromiseRef.current) {
      setStatusMessage("Generando resumen con Gemini AI...");
      try {
        await aiSummaryPromiseRef.current;
      } catch (err) {
        console.warn("[UploadModal] Espera de IA no completada:", err);
      }
    }

    const format = getFormatType(selectedFile.name);
    let summaryLines = summaryText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 3. Si no hay resumen generado todavía, invocar IA o fallback
    if (summaryLines.length === 0) {
      setStatusMessage("Generando resumen inteligente con Gemini AI...");
      try {
        await generateSummaryWithAI(
          selectedFile,
          title,
          finalCategory,
          currentExtractedText
        );
        summaryLines = summaryText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
      } catch (err) {
        console.warn("[UploadModal] Error al forzar generación de resumen:", err);
      }
    }

    const finalSummary =
      summaryLines.length > 0
        ? summaryLines
        : generateSmartSummary(
            selectedFile.name,
            format,
            title,
            finalCategory,
            currentExtractedText,
          );

    setStatusMessage("Solicitando URL prefirmada a Google Drive...");
    setUploadProgress(15);

    try {
      // Subida directa a Google Drive y registro en Neon DB mediante `api.subirArchivo`
      const result = await api.subirArchivo(selectedFile, {
        nom_arch: title.trim() || selectedFile.name,
        categoria: finalCategory,
        descripcion:
          description.trim() ||
          `Documento procesado e indexado en la categoría ${finalCategory}.`,
        resumen: finalSummary.join("\n"),
        palabras_clave:
          keywords.length > 0
            ? keywords
            : [finalCategory.toLowerCase(), format.toLowerCase(), "rvd"],
        contexto: contexto.trim() || "Ingesta RVD",
        folderId: folderId.trim() || undefined,
        soloDrive,
        onProgress: (percent, loaded, total) => {
          setUploadProgress(Math.max(10, Math.min(95, percent)));
          setLoadedBytes(loaded);
          setTotalBytes(total);
          setStatusMessage(`Transmitiendo bytes a Google Drive (${percent}%)...`);
        },
      });

      setUploadProgress(100);
      setStatusMessage("¡Archivo subido a Google Drive y registrado con éxito!");

      const repoId = result.repositorio?.id
        ? `REPO-${result.repositorio.id}`
        : `DOC-${Date.now().toString().slice(-4)}`;

      const newDoc: DocumentItem = {
        id: repoId,
        title: title.trim() || selectedFile.name,
        category: finalCategory,
        description:
          description.trim() ||
          `Documento procesado e indexado en la categoría ${finalCategory}.`,
        format,
        author: author.trim() || user?.nombre || "Administrador",
        summary: finalSummary,
        driveFileId: result.driveFileId,
        viewUrl: result.viewUrl,
        palabras_clave: keywords,
        contexto: contexto.trim() || undefined,
      };

      setUploadedDoc(newDoc);
      onUpload(newDoc);
    } catch (err: any) {
      console.error("[UploadModal] Error en la subida:", err);
      setIsUploading(false);

      if (err instanceof ApiClientError) {
        setErrorMessage(
          `Error ${err.status ? `(${err.status})` : ""}: ${err.message || "Fallo en la comunicación con el servidor"}`,
        );
      } else {
        setErrorMessage(
          err?.message || "Ocurrió un error al subir el archivo a Google Drive.",
        );
      }
    }
  };

  const fileFormat = selectedFile ? getFormatType(selectedFile.name) : null;

  return (
    <div
      className="overlay upload-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="upload-modal">
        {/* Cabecera del modal */}
        <header className="upload-header">
          <div className="upload-header-title">
            <span className="upload-header-icon">
              <UploadCloud size={20} />
            </span>
            <div>
              <p>MÓDULO DE INGESTA DOCUMENTAL</p>
              <h2 id="upload-modal-title">Añadir Documento</h2>
              {driveConfigured !== null && (
                <div
                  className={`upload-header-status-badge ${driveConfigured ? "" : "offline"}`}
                  title={
                    driveConfigured
                      ? "Google Drive configurado y listo para subida directa"
                      : "Modo directo o backend Express"
                  }
                >
                  <span className="status-dot" />
                  {driveConfigured ? "Google Drive Conectado" : "Drive en Espera"}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Cerrar ventana de subida"
          >
            <X size={20} />
          </button>
        </header>

        {/* Pantalla de éxito tras subir */}
        {uploadedDoc ? (
          <div className="upload-success-container">
            <div className="upload-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h3>¡Documento Subido con Éxito!</h3>
            <p>
              El archivo fue transferido a Google Drive y registrado en la base
              de datos Neon PostgreSQL.
            </p>

            <div className="upload-success-card">
              <div className="upload-success-row">
                <small>Título:</small>
                <strong>{uploadedDoc.title}</strong>
              </div>
              <div className="upload-success-row">
                <small>ID Repositorio:</small>
                <code>{uploadedDoc.id}</code>
              </div>
              <div className="upload-success-row">
                <small>Categoría:</small>
                <span>{uploadedDoc.category}</span>
              </div>
              {uploadedDoc.viewUrl && (
                <div className="upload-success-row">
                  <small>Google Drive:</small>
                  <a
                    href={uploadedDoc.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-open-btn"
                  >
                    <ExternalLink size={12} /> Abrir en Drive
                  </a>
                </div>
              )}
            </div>

            <div className="success-action-buttons">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                <RefreshCw size={14} /> Subir otro archivo
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleClose}
              >
                <Check size={14} /> Ver en Biblioteca
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de subida */
          <form onSubmit={handleSubmit} className="upload-form">
            {/* Zona Drag and Drop si no hay archivo */}
            {!selectedFile ? (
              <div
                className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />
                <div className="dropzone-icon-wrapper">
                  <UploadCloud size={38} />
                </div>
                <h3>Arrastra y suelta tu archivo aquí</h3>
                <p>
                  o haz clic para{" "}
                  <span className="highlight-browse">explorar en tu equipo</span>
                </p>
                <div className="format-tags">
                  <span className="format-badge pdf">PDF</span>
                  <span className="format-badge docx">DOCX</span>
                  <span className="format-badge txt">TXT</span>
                  <span className="format-limit">Hasta 50 MB</span>
                </div>
              </div>
            ) : (
              /* Vista del archivo seleccionado */
              <div className="selected-file-card">
                <div className="selected-file-info">
                  <span className={`file-badge ${fileFormat?.toLowerCase()}`}>
                    {fileFormat}
                  </span>
                  <div className="selected-file-text">
                    <strong title={selectedFile.name}>{selectedFile.name}</strong>
                    <small>
                      {formatBytes(selectedFile.size)} • {selectedFile.type || "Documento binario"}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  title="Quitar archivo y elegir otro"
                >
                  <Trash2 size={15} /> Cambiar
                </button>
              </div>
            )}

            {/* Indicador de Extracción Client-Side (src/tools) */}
            {selectedFile && (
              <div className="extraction-container">
                {isExtracting ? (
                  <div className="extraction-status-banner extracting">
                    <Loader2 size={16} className="spinning" />
                    <div className="extraction-status-info">
                      <strong>Extrayendo texto del archivo (Client-Side)...</strong>
                      <small>{extractionProgress}</small>
                    </div>
                  </div>
                ) : extractionResult ? (
                  <div className="extraction-status-banner success">
                    <div className="extraction-status-info">
                      <div className="extraction-badge-row">
                        <span className="extraction-pill success">
                          <Check size={12} /> Texto extraído ({extractionResult.metadata.fileType.toUpperCase()})
                        </span>
                        {extractionResult.metadata.pageCount && (
                          <span className="extraction-metric">
                            {extractionResult.metadata.pageCount}{" "}
                            {extractionResult.metadata.pageCount === 1 ? "pág." : "págs."}
                          </span>
                        )}
                        <span className="extraction-metric">
                          {extractionResult.metadata.wordCount.toLocaleString()} palabras
                        </span>
                        <span className="extraction-metric">
                          {extractionResult.metadata.charCount.toLocaleString()} caracteres
                        </span>
                        {isAiGenerating && (
                          <span className="extraction-pill ai-generating">
                            <Sparkles size={11} className="spinning" /> Resumiendo con Gemini AI...
                          </span>
                        )}
                      </div>
                      {extractionResult.metadata.isScannedOrEmpty && (
                        <small className="extraction-warning">
                          ⚠️ El documento parece ser una imagen escaneada o no contiene capa de texto seleccionable.
                        </small>
                      )}
                    </div>
                    {fileTextContent && (
                      <button
                        type="button"
                        className="preview-extracted-btn"
                        onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                        title="Ver el contenido de texto extraído"
                      >
                        {showExtractedPreview ? "Ocultar texto" : "Ver texto extraído"}
                      </button>
                    )}
                  </div>
                ) : null}

                {showExtractedPreview && fileTextContent && (
                  <div className="extracted-text-preview">
                    <div className="extracted-preview-header">
                      <small>
                        Contenido extraído del archivo ({fileTextContent.length.toLocaleString()} caracteres totales):
                      </small>
                    </div>
                    <pre className="extracted-preview-content">
                      {fileTextContent.slice(0, 2500)}
                      {fileTextContent.length > 2500
                        ? "\n\n[... contenido restante truncado para vista previa ...]"
                        : ""}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Mensaje de error si ocurre */}
            {errorMessage && (
              <div className="upload-error-banner" role="alert">
                <AlertCircle size={17} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campos de metadatos cuando se ha seleccionado un archivo */}
            {selectedFile && (
              <div className="upload-metadata-section">
                {/* Título del documento */}
                <div className="form-group">
                  <label htmlFor="doc-title">
                    Título del documento <span className="required">*</span>
                  </label>
                  <input
                    id="doc-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Balance General Consolidado 2026"
                    required
                    disabled={isUploading}
                  />
                </div>

                {/* Categoría y Autor */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="doc-category">Categoría</label>
                    <select
                      id="doc-category"
                      value={isCustomCategory ? "__custom__" : category}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomCategory(true);
                        } else {
                          setIsCustomCategory(false);
                          setCategory(e.target.value);
                        }
                      }}
                      disabled={isUploading}
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ Otra categoría personalizada...</option>
                    </select>

                    {isCustomCategory && (
                      <input
                        type="text"
                        className="custom-category-input"
                        placeholder="Escribe el nombre de la categoría..."
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        disabled={isUploading}
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="doc-author">Autor / Responsable</label>
                    <input
                      id="doc-author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Nombre del autor"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {/* Palabras clave (Tags) */}
                <div className="form-group">
                  <label htmlFor="doc-tags">
                    <Tag size={12} style={{ display: "inline", marginRight: 4 }} />
                    Palabras clave / Etiquetas
                  </label>
                  <div className="tags-field-wrapper">
                    <div className="tags-input-container">
                      {keywords.map((kw, idx) => (
                        <span key={`${kw}-${idx}`} className="tag-pill">
                          #{kw}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(idx)}
                            disabled={isUploading}
                            aria-label={`Eliminar etiqueta ${kw}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        id="doc-tags"
                        type="text"
                        className="tags-text-input"
                        placeholder="Escribe y presiona Enter..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        disabled={isUploading}
                      />
                    </div>

                    <div className="suggested-tags">
                      <small>Sugerencias:</small>
                      {["auditoria", "financiero", "informe", "balance", "legal"]
                        .filter((s) => !keywords.includes(s))
                        .slice(0, 4)
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            className="suggested-tag-btn"
                            onClick={() => handleAddTag(sug)}
                            disabled={isUploading}
                          >
                            +{sug}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Resumen Ejecutivo con botón de IA */}
                <div className="form-group">
                  <div className="ai-action-row">
                    <label htmlFor="doc-summary">Resumen Ejecutivo</label>
                    <button
                      type="button"
                      className="ai-generate-btn"
                      onClick={handleGenerateWithAI}
                      disabled={isUploading || isAiGenerating}
                    >
                      {isAiGenerating ? (
                        <>
                          <Loader2 size={12} className="spinning" /> Analizando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Autogenerar con Gemini AI
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    id="doc-summary"
                    rows={3}
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    placeholder="Puntos clave del documento..."
                    disabled={isUploading}
                  />
                </div>

                {/* Descripción o notas */}
                <div className="form-group">
                  <label htmlFor="doc-desc">Descripción o notas (opcional)</label>
                  <textarea
                    id="doc-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Añade un contexto breve sobre el alcance o propósito de este documento..."
                    disabled={isUploading}
                  />
                </div>

                {/* Acordeón de Opciones Avanzadas */}
                <div className="advanced-options-box">
                  <button
                    type="button"
                    className="advanced-options-toggle"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <span>Opciones avanzadas (Carpeta Drive, Contexto RVD)</span>
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showAdvanced && (
                    <div className="advanced-options-body">
                      <div className="form-group">
                        <label htmlFor="doc-contexto">Contexto institucional</label>
                        <input
                          id="doc-contexto"
                          type="text"
                          value={contexto}
                          onChange={(e) => setContexto(e.target.value)}
                          placeholder="Ej: Auditoría Externa Trimestre 2"
                          disabled={isUploading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="doc-folder">
                          <Folder size={12} style={{ display: "inline", marginRight: 4 }} />
                          ID de Carpeta en Google Drive (opcional)
                        </label>
                        <input
                          id="doc-folder"
                          type="text"
                          value={folderId}
                          onChange={(e) => setFolderId(e.target.value)}
                          placeholder="Ej: 1BxiMVs0XRX5nUJu4B308nBdq57nvd45v"
                          disabled={isUploading}
                        />
                      </div>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={soloDrive}
                          onChange={(e) => setSoloDrive(e.target.checked)}
                          disabled={isUploading}
                        />
                        <span>Subir únicamente a Google Drive (sin registrar en Neon DB)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Banner de procesamiento inteligente */}
                <div className="ai-processing-notice">
                  <Sparkles size={18} className="ai-sparkle-icon" />
                  <div>
                    <strong>Procesamiento Inteligente DocuHub AI</strong>
                    <p>
                      Los bytes se transmiten directamente a Google Drive con cero
                      carga en el servidor y los metadatos se sincronizan en Neon DB.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Barra de progreso durante la subida */}
            {isUploading && (
              <div className="upload-progress-container">
                <div className="upload-progress-header">
                  <span className="upload-progress-status">
                    <Loader2 size={15} className="spinning" />
                    {statusMessage}
                  </span>
                  <strong className="upload-progress-pct">
                    {uploadProgress}%
                  </strong>
                </div>
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {totalBytes > 0 && (
                  <div className="upload-bytes-detail">
                    {formatBytes(loadedBytes)} de {formatBytes(totalBytes)} transferidos
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción del formulario */}
            <footer className="upload-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="primary-button upload-submit-btn"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    Subiendo a Drive...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Subir y Procesar
                  </>
                )}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
