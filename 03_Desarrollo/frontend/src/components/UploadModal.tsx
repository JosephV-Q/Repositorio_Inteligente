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
import type { Repositorio } from "../../client/ApiClient";
import type { DocumentItem } from "../types/document";
import { extractDocument, type UnifiedExtractionResult } from "../tools";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newDocument: DocumentItem) => void;
  currentCategory?: string;
  categories?: string[];
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
  categories = defaultCategories,
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
  const [availableCategories, setAvailableCategories] = useState<string[]>(() =>
    Array.from(new Set([...(categories || []), ...defaultCategories]))
  );
  const [category, setCategory] = useState(
    currentCategory && currentCategory !== "Todas las categorías"
      ? currentCategory
      : (categories && categories.length > 0 ? categories[0] : defaultCategories[0]) || "Proyectos Activos"
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isAiClassified, setIsAiClassified] = useState(false);
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
  const [existingDocNotice, setExistingDocNotice] = useState<string | null>(null);

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

  // Sincronizar categorías cuando cambie la prop categories
  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories((prev) => Array.from(new Set([...prev, ...categories])));
    }
  }, [categories]);

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
        : (categories && categories.length > 0 ? categories[0] : defaultCategories[0]) || "Proyectos Activos";
    setCategory(initialCategory);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setIsAiClassified(false);
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
    setExistingDocNotice(null);
    setUploadedDoc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [currentCategory, categories]);

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

  // Heurística de clasificación semántica para asociar contenido con categorías disponibles
  const classifyDocumentByContent = (
    fileName: string,
    text: string,
    categoriesPool: string[]
  ): string => {
    const combined = `${fileName} ${text}`.toLowerCase();

    const categoryRules: Array<{ category: string; terms: string[] }> = [
      {
        category: "Finanzas & Legal",
        terms: [
          "finanz", "financier", "balance", "contab", "presupuesto", "factura", "auditor",
          "contrato", "legal", "jurídic", "juridic", "cláusula", "clausula", "fiscal",
          "tributar", "gasto", "ingreso", "arancel", "soc2", "capital", "usd", "precio", "pago", "deuda"
        ],
      },
      {
        category: "Recursos Humanos",
        terms: [
          "recursos humanos", "rrhh", "personal", "emplead", "nómina", "nomina", "contratación",
          "contratacion", "talento", "vacante", "desempeño", "desempeno", "capacitación", "capacitacion",
          "laboral", "currículum", "curriculum", "salario", "sueldo", "beneficios", "colaborador"
        ],
      },
      {
        category: "Informes Técnicos",
        terms: [
          "técnic", "tecnic", "informe", "reporte", "especificación", "especificacion", "manual",
          "arquitectura", "servidor", "microservicio", "api", "infraestructura", "despliegue",
          "código", "codigo", "sistema", "ingeniería", "ingenieria", "redes", "base de datos",
          "latencia", "cluster", "clúster", "logs", "openapi"
        ],
      },
      {
        category: "Investigación + I+D",
        terms: [
          "investig", "i+d", "científic", "cientific", "estudio", "metodología", "metodologia",
          "hipótesis", "hipotesis", "experimento", "análisis estadístico", "publicación", "publicacion",
          "desarrollo tecnológico", "innovación", "innovacion", "tesis", "paper", "patente"
        ],
      },
      {
        category: "Proyectos Activos",
        terms: [
          "proyecto", "hito", "cronograma", "entregable", "sprint", "roadmap", "plan estratégico",
          "plan estrategico", "plan de trabajo", "avance", "fase", "gestión de proyecto", "gestion de proyecto",
          "requerimiento", "kpi"
        ],
      },
    ];

    let bestCat = categoriesPool.find((c) => c !== "Todas las categorías") || "Proyectos Activos";
    let maxScore = 0;

    for (const rule of categoryRules) {
      const matchingAvailable = categoriesPool.find(
        (c) => c.toLowerCase() === rule.category.toLowerCase()
      );
      if (!matchingAvailable) continue;

      let score = 0;
      for (const term of rule.terms) {
        if (combined.includes(term)) {
          score += term.length > 5 ? 2 : 1;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestCat = matchingAvailable;
      }
    }

    return bestCat;
  };

  const generateSmartSummary = (
    fileName: string,
    fileFormat: "PDF" | "DOCX" | "TXT",
    docTitle: string,
    docCategory: string,
    rawText: string,
  ): string[] => {
    const titleClean = docTitle || fileName;

    if (rawText && rawText.trim().length > 50) {
      // Extraer párrafos sustanciales y coherentes del propio texto extraído/escaneado
      const paragraphs = rawText
        .split(/\n\s*\n+/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter((p) => p.length >= 60 && !p.startsWith("--- Página"));

      if (paragraphs.length >= 3) {
        return [
          `**Contexto y Objeto:** ${paragraphs[0]}`,
          `**Puntos Clave y Desarrollo:** ${paragraphs[Math.floor(paragraphs.length / 2)]}`,
          `**Conclusiones y Cierre:** ${paragraphs[paragraphs.length - 1]}`,
        ];
      } else if (paragraphs.length > 0) {
        return paragraphs.slice(0, 4).map((p, idx) => `**Punto clave ${idx + 1}:** ${p}`);
      }
    }

    return [
      `**Contexto del Archivo:** Documento "${titleClean}" en formato ${fileFormat}, clasificado en la categoría "${docCategory}".`,
      `**Estado de Extracción:** El archivo no contiene capa de texto digital legible o el escaneo fue realizado como imagen pura sin OCR incrustado.`,
      `**Recomendación:** Puedes pegar o ingresar el texto escaneado en el panel de texto extraído para generar un análisis completo y detallado con Gemini AI.`,
    ];
  };

  // Función central para clasificar y generar resumen inteligente con Gemini AI a partir del contenido extraído
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

    // Listado de categorías activas para orientar la clasificación de la IA
    const categoriesForPrompt = availableCategories
      .filter((c) => c !== "Todas las categorías")
      .map((c) => `"${c}"`)
      .join(", ");

    try {
      // Preparar el texto completo o una muestra generosa (hasta 80,000 caracteres) cubriendo inicio, mitad y fin
      let textSnippet = "";
      if (rawText && rawText.trim().length > 0) {
        const trimmed = rawText.trim();
        if (trimmed.length <= 80000) {
          textSnippet = trimmed;
        } else {
          const start = trimmed.slice(0, 40000);
          const midPos = Math.floor(trimmed.length / 2) - 12000;
          const middle = trimmed.slice(midPos, midPos + 24000);
          const end = trimmed.slice(-16000);
          textSnippet = `[SECCIÓN INICIAL]:\n${start}\n\n[SECCIÓN INTERMEDIA]:\n${middle}\n\n[SECCIÓN FINAL Y CONCLUSIONES]:\n${end}`;
        }
      }

      const prompt = `Analiza minuciosamente el contenido del siguiente documento y genera su clasificación temática automática y una síntesis exhaustiva y estructurada.

REQUISITOS FUNDAMENTALES:
1. CLASIFICACIÓN TEMÁTICA OBLIGATORIA:
   Debes clasificar el documento seleccionando EXACTAMENTE una de las siguientes categorías disponibles en el sistema:
   [ ${categoriesForPrompt} ]
   - "Finanzas & Legal": Balances, presupuestos, estados contables, contratos, auditorías legales o normativas, acuerdos contractuales, cláusulas jurídicas, impuestos o costos.
   - "Recursos Humanos": Nóminas, perfiles laborales, contrataciones de personal, talento humano, capacitaciones, evaluaciones de desempeño o políticas internas de empleados.
   - "Informes Técnicos": Diseños de sistemas, manuales de software, APIs, microservicios, infraestructura de servidores, seguridad informática, despliegues, logs técnicos o reportes de desarrollo.
   - "Investigación + I+D": Proyectos científicos, estudios experimentales, metodologías, investigación académica, patentes, tesis o papers.
   - "Proyectos Activos": Hitos de proyectos, planes de trabajo operativos, cronogramas, roadmaps, requerimientos funcionales o actas de seguimiento.
   - Si ninguna de las categorías anteriores se ajusta de manera razonable al contenido, sugiere una categoría breve, formal y precisa.

2. CONTEXTO Y PROPÓSITO: Especifica claramente qué tipo de documento es, quién lo emite, a quién va dirigido, fechas/períodos relevantes y el objetivo o problemática central.
3. PUNTOS CLAVE: Detalla los aspectos más importantes, antecedentes, diagnósticos o temas desarrollados en el cuerpo del texto.
4. CIFRAS, OBLIGACIONES Y ACUERDOS: Resalta cifras numéricas, montos, plazos, artículos o compromisos clave si existen en el documento.
5. CONCLUSIONES Y PRÓXIMOS PASOS: Explica el dictamen final, resoluciones o acuerdos concluyentes.
6. PROFUNDIDAD: El campo "resumen" DEBE ser una lista de 4 a 6 puntos sustanciales. Cada punto debe ser un párrafo informativo bien redactado (2 a 4 oraciones) que empiece con un título en negrita (ej: "**Contexto y Objeto:** ...", "**Diagnóstico y Puntos Clave:** ...", "**Acuerdos y Cifras Relevantes:** ...", "**Conclusiones:** ..."). NO uses frases cortas, vacías o repetitivas.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "categoria": "Nombre exacto de una de las categorías disponibles en el sistema (ej. Finanzas & Legal, Recursos Humanos, Informes Técnicos, etc.)",
  "resumen": [
    "**Contexto y Objeto:** [Explicación detallada del origen, emisor y propósito]",
    "**Puntos Clave y Desarrollo:** [Temas nodales y antecedentes abordados]",
    "**Acuerdos, Cifras y Obligaciones:** [Cifras, plazos o resoluciones específicas]",
    "**Conclusiones y Cierre:** [Conclusiones finales y dictámenes]"
  ],
  "palabras_clave": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4", "etiqueta5"],
  "descripcion": "Descripción ejecutiva concisa del contenido del documento (2 a 3 oraciones completas)",
  "contexto": "Ámbito operativo, institucional o legal específico (ej. Auditoría Contable 2025, Contratación de Personal)"
}

DATOS DEL DOCUMENTO:
- Nombre de archivo: "${file.name}"
- Título: "${docTitle || file.name}"
- Formato: "${format}"
${textSnippet ? `\nCONTENIDO TEXTUAL COMPLETO DEL DOCUMENTO:\n"""\n${textSnippet}\n"""` : "\n(Nota: No se detectó texto digital seleccionable en el documento. Si es un archivo escaneado, indícalo claramente en el contexto y resumen)."}`;

      const res = await api.askGemini({
        prompt,
        systemInstruction:
          "Eres un especialista senior en análisis documental, extracción semántica y catalogación de alta precisión. Proporciona clasificación temática certera según las categorías existentes y resúmenes ejecutivos profundos, contextualmente ricos y estructurados, basados fielmente en los datos fácticos del texto.",
        temperature: 0.2,
        maxOutputTokens: 2048,
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
          // 1. Clasificación automática y selección de categoría en el formulario
          let appliedCategory = activeCat;
          if (parsed.categoria && typeof parsed.categoria === "string" && parsed.categoria.trim()) {
            const rawSuggested = parsed.categoria.trim();
            const match = availableCategories.find(
              (c) => c.trim().toLowerCase() === rawSuggested.toLowerCase()
            );

            if (match) {
              appliedCategory = match;
              setCategory(match);
              setIsCustomCategory(false);
              setIsAiClassified(true);
            } else {
              setAvailableCategories((prev) => {
                if (!prev.some((c) => c.toLowerCase() === rawSuggested.toLowerCase())) {
                  return [...prev, rawSuggested];
                }
                return prev;
              });
              appliedCategory = rawSuggested;
              setCategory(rawSuggested);
              setIsCustomCategory(false);
              setIsAiClassified(true);
            }
          }

          // 2. Resumen ejecutivo estructurado
          let summaryArray: string[] = [];
          if (Array.isArray(parsed.resumen) && parsed.resumen.length > 0) {
            summaryArray = parsed.resumen.map((r: any) => String(r).trim()).filter(Boolean);
          } else if (typeof parsed.resumen === "string" && parsed.resumen.trim().length > 0) {
            summaryArray = parsed.resumen
              .split(/\n\s*[-*•]?\s*|\n\n+/)
              .map((s: string) => s.trim().replace(/^[-*•]\s*/, ""))
              .filter((s: string) => s.length > 15);
            if (summaryArray.length === 0) {
              summaryArray = [parsed.resumen.trim()];
            }
          }

          if (summaryArray.length > 0) {
            setSummaryText(summaryArray.join("\n"));
          }
          if (Array.isArray(parsed.palabras_clave) && parsed.palabras_clave.length > 0) {
            setKeywords((prev) =>
              Array.from(
                new Set([
                  ...prev,
                  ...parsed.palabras_clave.map((k: string) => String(k).toLowerCase()),
                  appliedCategory.toLowerCase(),
                ])
              )
            );
          }
          if (parsed.descripcion && typeof parsed.descripcion === "string" && parsed.descripcion.trim()) {
            setDescription(parsed.descripcion.trim());
          }
          if (parsed.contexto && typeof parsed.contexto === "string" && parsed.contexto.trim()) {
            setContexto(parsed.contexto.trim());
          }
          return;
        } else {
          setSummaryText(res.data.response.trim());
          const fallbackCat = classifyDocumentByContent(
            file.name,
            rawText || res.data.response,
            availableCategories
          );
          setCategory(fallbackCat);
          setIsCustomCategory(false);
          setIsAiClassified(true);
          return;
        }
      }

      // Fallback si la respuesta de Gemini no es exitosa
      const fallbackCat = classifyDocumentByContent(
        file.name,
        rawText || docTitle,
        availableCategories
      );
      setCategory(fallbackCat);
      setIsCustomCategory(false);
      setIsAiClassified(true);

      const fallbackSummary = generateSmartSummary(
        file.name,
        format,
        docTitle,
        fallbackCat,
        rawText
      );
      setSummaryText(fallbackSummary.join("\n"));
    } catch (aiErr) {
      console.warn("[UploadModal] Gemini AI no respondió, aplicando resumen estructurado:", aiErr);
      const fallbackCat = classifyDocumentByContent(
        file.name,
        rawText || docTitle,
        availableCategories
      );
      setCategory(fallbackCat);
      setIsCustomCategory(false);
      setIsAiClassified(true);

      const fallbackSummary = generateSmartSummary(
        file.name,
        format,
        docTitle,
        fallbackCat,
        rawText
      );
      setSummaryText(fallbackSummary.join("\n"));
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

    // Comprobar si el archivo ya existe en la base de datos para notificar al usuario
    setExistingDocNotice(null);
    api.getRepositorios({ nom_arch: baseName })
      .then((existing) => {
        if (Array.isArray(existing) && existing.length > 0) {
          const match = existing.find(
            (r) =>
              r.nom_arch.trim().toLowerCase() === baseName.toLowerCase() ||
              r.nom_arch.trim().toLowerCase() === file.name.toLowerCase()
          );
          if (match) {
            setExistingDocNotice(
              `Aviso: Este archivo ya existe en el repositorio (ID #${match.id}). Al confirmar la subida se actualizarán sus datos y análisis sin duplicar el registro.`
            );
          }
        }
      })
      .catch(() => {});

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
    setIsAiClassified(false);
    setKeywords([]);
    setSummaryText("");
    setExistingDocNotice(null);
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

    const fileNameToUpload = title.trim() || selectedFile.name;

    try {
      // -----------------------------------------------------------------------
      // PASO 1: Subir el archivo al servidor mediante api.subirArchivo(file, params?)
      // -----------------------------------------------------------------------
      setStatusMessage("Paso 1/4: Subiendo archivo al servidor (Google Drive)...");
      setUploadProgress(15);

      const uploadResult = await api.subirArchivo(selectedFile, {
        nom_arch: fileNameToUpload,
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
          setUploadProgress(Math.max(10, Math.min(50, Math.round(percent * 0.5))));
          setLoadedBytes(loaded);
          setTotalBytes(total);
          setStatusMessage(`Transmitiendo archivo a Google Drive (${percent}%)...`);
        },
      });

      // -----------------------------------------------------------------------
      // PASO 2: Obtener el enlace del mismo archivo usando api.getRepositorios(filtros?)
      // -----------------------------------------------------------------------
      setStatusMessage("Paso 2/4: Obteniendo enlace del repositorio desde la base de datos...");
      setUploadProgress(60);

      let remoteUrl = uploadResult.viewUrl || "";
      let remoteRepoId = uploadResult.repositorio?.id;

      try {
        const repos = await api.getRepositorios({
          nom_arch: fileNameToUpload,
          categoria: finalCategory,
        });
        const matchingRepo = Array.isArray(repos)
          ? (repos.find(
              (r) =>
                r.nom_arch === fileNameToUpload ||
                (remoteRepoId && r.id === remoteRepoId)
            ) || repos[0])
          : null;

        if (matchingRepo?.ruta_arch) {
          remoteUrl = matchingRepo.ruta_arch;
        }
        if (matchingRepo?.id) {
          remoteRepoId = matchingRepo.id;
        }
      } catch (repoErr) {
        console.warn("[UploadModal] Aviso al consultar getRepositorios:", repoErr);
      }

      // -----------------------------------------------------------------------
      // PASO 3: Extraer texto del archivo en memoria del navegador usando src/tools
      // -----------------------------------------------------------------------
      setStatusMessage("Paso 3/4: Extrayendo texto en memoria del navegador con src/tools...");
      setUploadProgress(75);

      let textToProcess = currentExtractedText || fileTextContent;
      if (!textToProcess || textToProcess.trim().length === 0) {
        try {
          const extraction = await extractDocument(selectedFile, {
            onPageProgress: (current, total) => {
              setStatusMessage(`Extrayendo texto: página ${current} de ${total}...`);
            },
          });
          if (extraction.success && extraction.text) {
            textToProcess = extraction.text;
            setFileTextContent(extraction.text);
            setExtractionResult(extraction);
          }
        } catch (extractErr) {
          console.warn("[UploadModal] Error en extracción client-side con src/tools:", extractErr);
        }
      }

      // -----------------------------------------------------------------------
      // PASO 4: Usar api.procesarTextoDocumento({ texto, ... }) para generar el repositorio
      // -----------------------------------------------------------------------
      setStatusMessage("Paso 4/4: Generando repositorio y metadatos vectoriales con IA...");
      setUploadProgress(90);

      let finalRepo: Repositorio | undefined = uploadResult.repositorio;

      if (textToProcess && textToProcess.trim().length > 0) {
        try {
          const processedRepo = await api.procesarTextoDocumento({
            texto: textToProcess,
            nom_arch: fileNameToUpload,
            ruta_arch: remoteUrl || uploadResult.viewUrl || `https://drive.google.com/file/d/${uploadResult.driveFileId}/view`,
            driveFileId: uploadResult.driveFileId,
            categoria: finalCategory,
            contexto: contexto.trim() || undefined,
            resumen: finalSummary.join("\n"),
            descripcion: description.trim() || undefined,
            palabras_clave: keywords.length > 0 ? keywords : undefined,
          });

          if (processedRepo) {
            finalRepo = processedRepo;
            if (processedRepo.id) {
              remoteRepoId = processedRepo.id;
            }
            if (processedRepo.ruta_arch) {
              remoteUrl = processedRepo.ruta_arch;
            }
          }
        } catch (processErr: any) {
          console.warn("[UploadModal] Aviso en procesarTextoDocumento:", processErr);
        }
      }

      setUploadProgress(100);
      setStatusMessage("¡Archivo subido, extraído e indexado exitosamente!");

      const numericRepoId = finalRepo?.id ?? (remoteRepoId ? Number(remoteRepoId) : undefined);
      const repoId = numericRepoId
        ? `REPO-${numericRepoId}`
        : `DOC-${Date.now().toString().slice(-4)}`;

      const newDoc: DocumentItem = {
        id: repoId,
        repoId: numericRepoId,
        title: finalRepo?.nom_arch || fileNameToUpload,
        category: finalRepo?.categoria || finalCategory,
        description:
          finalRepo?.descripcion ||
          description.trim() ||
          `Documento procesado e indexado en la categoría ${finalCategory}.`,
        format,
        author: author.trim() || user?.nombre || "Administrador",
        summary: finalRepo?.resumen
          ? finalRepo.resumen.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
          : finalSummary,
        driveFileId: uploadResult.driveFileId,
        viewUrl: remoteUrl || finalRepo?.ruta_arch || uploadResult.viewUrl,
        palabras_clave: finalRepo?.palabras_clave || keywords,
        contexto: finalRepo?.contexto || contexto.trim() || undefined,
      };

      setIsUploading(false);
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

            {existingDocNotice && (
              <div style={{ marginTop: "10px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", fontSize: "11px", display: "flex", gap: "6px", alignItems: "center" }}>
                <Check size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
                <span>{existingDocNotice}</span>
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
                    <button
                      type="button"
                      className="preview-extracted-btn"
                      onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                      title="Ver o editar el texto del documento para el análisis de IA"
                    >
                      {showExtractedPreview
                        ? "Ocultar texto"
                        : (fileTextContent ? "Ver / Editar texto extraído" : "✏️ Pegar texto escaneado")}
                    </button>
                  </div>
                ) : null}

                {showExtractedPreview && (
                  <div className="extracted-text-preview">
                    <div className="extracted-preview-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <small>
                        Texto para análisis de IA ({fileTextContent.length.toLocaleString()} caracteres):
                      </small>
                      <small style={{ color: "#778ca3" }}>
                        (Puedes editarlo o pegar texto escaneado de OCR)
                      </small>
                    </div>
                    <textarea
                      className="extracted-preview-content"
                      style={{ width: "100%", minHeight: "120px", resize: "vertical", fontFamily: "monospace", fontSize: "11px", padding: "8px", border: "1px solid #dbe4ed", borderRadius: "6px" }}
                      value={fileTextContent}
                      onChange={(e) => setFileTextContent(e.target.value)}
                      placeholder="Pega aquí el texto escaneado del documento si no se detectó automáticamente..."
                    />
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label htmlFor="doc-category" style={{ margin: 0 }}>Categoría</label>
                      {isAiClassified && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            color: "#1d4ed8",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            padding: "2px 7px",
                            borderRadius: "10px",
                            fontWeight: 600,
                          }}
                          title="Categoría clasificada automáticamente por Gemini AI según el contenido del documento"
                        >
                          <Sparkles size={11} style={{ color: "#2563eb" }} /> Auto-clasificado por IA
                        </span>
                      )}
                    </div>
                    <select
                      id="doc-category"
                      value={isCustomCategory ? "__custom__" : category}
                      onChange={(e) => {
                        setIsAiClassified(false);
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
                        onChange={(e) => {
                          setIsAiClassified(false);
                          setCustomCategoryName(e.target.value);
                        }}
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
                    rows={7}
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    placeholder="Puntos clave y resumen ejecutivo estructurado..."
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
