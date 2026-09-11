import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountPanel } from "./components/AccountPanel";
import { AdminLogin } from "./components/AdminLogin";
import { Dashboard } from "./components/Dashboard";
import { DocumentDetail } from "./components/DocumentDetail";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { RegisterWithInvitation } from "./components/RegisterWithInvitation";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { UploadModal } from "./components/UploadModal";
import { ChatBotWidget } from "./components/ChatBotWidget";
import { RvdSummaryModal } from "./components/RvdSummaryModal";
import { ComparativasModal } from "./components/ComparativasModal";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import { categories as defaultCategories } from "./data/documents";
import { api, Repositorio } from "./services/api";
import type { DocumentItem } from "./types/document";

function MainContent() {
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();

  const [docList, setDocList] = useState<DocumentItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState("Todas las categorías");
  const [isRvdMode, setIsRvdMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<DocumentItem[] | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showRvdModal, setShowRvdModal] = useState(false);
  const [showComparativasModal, setShowComparativasModal] = useState(false);

  // Limitantes específicas por rol:
  // - Rol 3 (Usuario / Lector): No sube archivos, no realiza RVD, no ve Dashboard.
  // - Rol 1 (Admin): Único con acceso a Dashboard y gestión (añadir/eliminar) de categorías.
  // - Rol 1 y 2: Pueden eliminar documentos.
  const isUserRole3 = user?.rol === 3;
  const canViewDashboard = isAdmin;
  const canManageCategories = isAdmin;
  const canUpload = !isUserRole3;
  const canRvd = !isUserRole3;
  const canDeleteDocument = !isUserRole3;

  // Si no tiene permisos para el Dashboard o RVD, forzar apagado
  useEffect(() => {
    if (!canViewDashboard && showDashboard) {
      setShowDashboard(false);
    }
  }, [canViewDashboard, showDashboard]);

  useEffect(() => {
    if (!canRvd && isRvdMode) {
      setIsRvdMode(false);
      setSelectedIds([]);
    }
  }, [canRvd, isRvdMode]);

  // Detección de token de invitación en la URL (?token=XYZ)
  const [invitationToken, setInvitationToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("token") || null;
    }
    return null;
  });

  // Estado para alternar entre vista de inicio de sesión y registro
  const [authView, setAuthView] = useState<"login" | "register">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("token")) {
        return "register";
      }
    }
    return "login";
  });

  // Carga inicial de repositorios reales desde la base de datos Neon
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    async function loadBackendRepos() {
      try {
        const res = await api.getRepositorios({ limit: 50 });
        const repos = Array.isArray(res) ? res : ((res as any)?.data || []);
        if (isMounted && repos && repos.length > 0) {
          const remoteDocs: DocumentItem[] = repos.map((repo: any) => {
            const ext = repo.nom_arch ? repo.nom_arch.split(".").pop()?.toUpperCase() : "PDF";
            const validFormat = ext === "PDF" || ext === "DOCX" || ext === "TXT" ? ext : "PDF";
            return {
              id: `REPO-${repo.id}`,
              repoId: repo.id,
              title: repo.nom_arch || "Documento sin título",
              category: repo.categoria || "Proyectos Activos",
              description:
                repo.descripcion || "Documento indexado en el repositorio institucional Neon DB.",
              format: validFormat,
              author: user?.nombre || "Administrador",
              summary: repo.resumen
                ? repo.resumen.split("\n").filter((l: string) => l.trim().length > 0)
                : repo.palabras_clave && repo.palabras_clave.length > 0
                  ? repo.palabras_clave
                  : ["Documento verificado e indexado en el clúster RVD."],
              driveFileId: repo.driveFileId,
              viewUrl: repo.ruta_arch,
              contexto: repo.contexto,
              palabras_clave: Array.isArray(repo.palabras_clave) ? repo.palabras_clave : undefined,
            };
          });

          // Deduplicar por título normalizado para asegurar que no se muestre 2 veces
          const seenDocs = new Map<string, DocumentItem>();
          for (const doc of remoteDocs) {
            const key = doc.title.trim().toLowerCase();
            if (!seenDocs.has(key)) {
              seenDocs.set(key, doc);
            }
          }
          const uniqueRemoteDocs = Array.from(seenDocs.values());

          setDocList((current) => {
            const remoteIds = new Set(uniqueRemoteDocs.map((d) => d.id));
            const remoteTitles = new Set(uniqueRemoteDocs.map((d) => d.title.trim().toLowerCase()));
            const optimisticLocal = current.filter(
              (d) => !remoteIds.has(d.id) && !remoteTitles.has(d.title.trim().toLowerCase())
            );
            return [...uniqueRemoteDocs, ...optimisticLocal];
          });

          // Sincronizar categorías que vengan de la base de datos
          const remoteCategories = Array.from(
            new Set(uniqueRemoteDocs.map((d) => d.category).filter(Boolean))
          );
          if (remoteCategories.length > 0) {
            setCategoriesList((prev) => {
              const combined = new Set([...prev, ...remoteCategories]);
              return Array.from(combined);
            });
          }
        }
      } catch (err) {
        console.warn("No se pudieron cargar repositorios remotos:", err);
      }
    }

    loadBackendRepos();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categoriesList) {
      counts[cat] = docList.filter((doc) => doc.category === cat).length;
    }
    return counts;
  }, [docList, categoriesList]);

  const handleAddCategory = (newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setToastMessage(`La categoría "${trimmed}" ya existe.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setCategoriesList((prev) => [...prev, trimmed]);
    setToastMessage(`Categoría "${trimmed}" creada.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setCategoriesList((prev) => prev.filter((c) => c !== categoryToDelete));
    if (activeCategory === categoryToDelete) {
      setActiveCategory("Todas las categorías");
    }
    setToastMessage(`Categoría "${categoryToDelete}" eliminada.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteDocument = async (id: string) => {
    const doc = docList.find((d) => d.id === id) || semanticResults?.find((d) => d.id === id);
    const title = doc?.title || id;

    // 1. Eliminar inmediatamente del estado local de la interfaz (optimista)
    setDocList((prev) => prev.filter((d) => d.id !== id));
    setSemanticResults((prev) => (prev ? prev.filter((d) => d.id !== id) : null));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    if (activeDocument?.id === id) {
      setActiveDocument(null);
    }

    // 2. Extraer el identificador y eliminar de la base de datos con api.deleteRepositorio(id)
    const targetId = doc?.repoId ?? id;

    try {
      await api.deleteRepositorio(targetId);
      setToastMessage(`Documento "${title}" eliminado permanentemente.`);
    } catch (err: any) {
      console.error("Error al eliminar repositorio de la base de datos:", err);
      setToastMessage(`Error al eliminar "${title}": ${err?.message || "No se pudo borrar de la base de datos"}`);
    } finally {
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Búsqueda semántica híbrida con Repositorio.buscar ('término', opciones?)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSemanticResults(null);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await Repositorio.buscar(trimmed, {
          categoria: activeCategory !== "Todas las categorías" ? activeCategory : undefined,
          limit: 30,
          modo: "hibrido",
        });

        if (!isMounted) return;

        const mapped: DocumentItem[] = results.map((repo) => {
          const ext = repo.nom_arch ? repo.nom_arch.split(".").pop()?.toUpperCase() : "PDF";
          const validFormat = ext === "PDF" || ext === "DOCX" || ext === "TXT" ? ext : "PDF";
          return {
            id: `REPO-${repo.id}`,
            repoId: repo.id,
            title: repo.nom_arch || "Documento",
            category: repo.categoria || "Proyectos Activos",
            description: repo.descripcion || "Documento recuperado por búsqueda semántica.",
            format: validFormat,
            author: user?.nombre || "Repositorio Institucional",
            summary: repo.resumen
              ? repo.resumen.split("\n").filter((l: string) => l.trim().length > 0)
              : repo.palabras_clave && repo.palabras_clave.length > 0
                ? repo.palabras_clave
                : ["Coincidencia semántica en el repositorio."],
            driveFileId: (repo as any).driveFileId,
            viewUrl: repo.ruta_arch,
            contexto: repo.contexto || undefined,
            palabras_clave: Array.isArray(repo.palabras_clave) ? repo.palabras_clave : undefined,
            similarity: repo.similarity,
            matchType: repo.matchType,
          };
        });

        setSemanticResults(mapped);
      } catch (err) {
        console.warn("Aviso al ejecutar Repositorio.buscar:", err);
        if (isMounted) setSemanticResults(null);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 320);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, activeCategory, user]);

  const visibleDocuments = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      const filtered = docList.filter((document) => {
        return (
          activeCategory === "Todas las categorías" ||
          document.category === activeCategory
        );
      });
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }

    // Si la búsqueda semántica en backend retornó resultados
    if (semanticResults !== null) {
      return semanticResults;
    }

    // Fallback de coincidencia local inmediata mientras carga o si está desconectado
    const localFiltered = docList.filter((document) => {
      const matchesCategory =
        activeCategory === "Todas las categorías" ||
        document.category === activeCategory;
      const matchesQuery =
        `${document.title} ${document.description} ${document.category} ${(document.summary || []).join(" ")} ${(document.palabras_clave || []).join(" ")}`
          .toLowerCase()
          .includes(trimmed);
      return matchesCategory && matchesQuery;
    });
    return [...localFiltered].sort((a, b) => a.title.localeCompare(b.title));
  }, [docList, activeCategory, query, semanticResults]);

  const selectedDocuments = useMemo(() => {
    return selectedIds
      .map((id) => docList.find((d) => d.id === id) || semanticResults?.find((d) => d.id === id))
      .filter((d): d is DocumentItem => Boolean(d));
  }, [selectedIds, docList, semanticResults]);

  const clearSelection = () => setSelectedIds([]);
  const openDocument = (document: DocumentItem) => {
    if (isRvdMode && canRvd) {
      setSelectedIds((current) =>
        current.includes(document.id)
          ? current.filter((id) => id !== document.id)
          : [...current, document.id],
      );
    } else {
      setActiveDocument(document);
    }
  };
  const toggleRvdMode = () => {
    if (!canRvd) return;
    setIsRvdMode(!isRvdMode);
    clearSelection();
  };
  const closeRvdMode = () => {
    setIsRvdMode(false);
    clearSelection();
  };

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    if (newDoc.category && !categoriesList.includes(newDoc.category)) {
      setCategoriesList((prev) => Array.from(new Set([...prev, newDoc.category])));
    }
    setDocList((current) => {
      const isDuplicate = current.some(
        (d) => d.id === newDoc.id || d.title.trim().toLowerCase() === newDoc.title.trim().toLowerCase()
      );
      if (isDuplicate) {
        return current.map((d) =>
          d.id === newDoc.id || d.title.trim().toLowerCase() === newDoc.title.trim().toLowerCase()
            ? newDoc
            : d
        );
      }
      return [newDoc, ...current];
    });
    if (activeCategory !== "Todas las categorías") {
      setActiveCategory(newDoc.category);
    }
    setToastMessage(`Documento "${newDoc.title}" indexado en la categoría "${newDoc.category}".`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setShowDashboard(false);
    setActiveCategory("Todas las categorías");
  };

  // 1. Pantalla de carga inicial
  if (isLoading) {
    return (
      <div className="login-page-container">
        <div className="auth-loading-card">
          <Loader2 size={36} className="spin" />
          <h2>DocuHub RVD</h2>
          <p>Verificando credenciales de sesión en Neon DB...</p>
        </div>
      </div>
    );
  }

  // 2. Flujo de registro (por invitación en URL ?token=XYZ o al pulsar Registrarse)
  if (!isAuthenticated && (authView === "register" || invitationToken)) {
    return (
      <RegisterWithInvitation
        token={invitationToken}
        onCancel={() => {
          setAuthView("login");
          setInvitationToken(null);
          if (window.history.pushState) {
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            window.history.pushState({}, "", url.pathname);
          }
        }}
        onSuccess={() => {
          setAuthView("login");
          setInvitationToken(null);
          if (window.history.pushState) {
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            window.history.pushState({}, "", url.pathname);
          }
        }}
      />
    );
  }

  // 3. Pantalla de Login del Administrador
  if (!isAuthenticated) {
    return <AdminLogin onRegister={() => setAuthView("register")} />;
  }

  // 4. Shell principal cuando el usuario está autenticado
  return (
    <div className="app-shell">
      <Sidebar
        activeCategory={activeCategory}
        mobileMenu={mobileMenu}
        categories={categoriesList}
        totalDocuments={docList.length}
        categoryCounts={categoryCounts}
        canViewDashboard={canViewDashboard}
        canManageCategories={canManageCategories}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setShowDashboard(false);
          setMobileMenu(false);
        }}
        onDashboardClick={() => {
          if (canViewDashboard) {
            setShowDashboard(true);
            setMobileMenu(false);
          }
        }}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onComparativasClick={() => setShowComparativasModal(true)}
      />
      <main className="main-area">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          onMenuToggle={() => setMobileMenu(!mobileMenu)}
          onAccountOpen={() => setShowAccount(true)}
          isSearching={isSearching}
        />
        {showDashboard && canViewDashboard ? (
          <Dashboard
            documents={docList}
            categories={categoriesList}
            onBack={() => setShowDashboard(false)}
          />
        ) : (
          <DocumentLibrary
            activeCategory={activeCategory}
            documents={visibleDocuments}
            isRvdMode={isRvdMode && canRvd}
            selectedIds={selectedIds}
            canUpload={canUpload}
            canRvd={canRvd}
            canDeleteDocument={canDeleteDocument}
            onRvdToggle={() => {
              if (canRvd) toggleRvdMode();
            }}
            onDocumentOpen={openDocument}
            onRvdClose={closeRvdMode}
            onUploadClick={canUpload ? () => setShowUploadModal(true) : undefined}
            onDeleteDocument={canDeleteDocument ? handleDeleteDocument : undefined}
            query={query}
            isSemanticSearchActive={semanticResults !== null && query.trim().length > 0}
          />
        )}
      </main>
      {selectedIds.length > 0 && canRvd && (
        <div className="selection-dock">
          <span>
            <Check size={16} /> {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <button type="button" onClick={clearSelection}>
            Limpiar
          </button>
          {selectedIds.length === 1 && (
            <button
              type="button"
              onClick={() =>
                setActiveDocument(
                  selectedDocuments[0] ||
                    docList.find((document) => document.id === selectedIds[0]) ||
                    null,
                )
              }
              title="Ver detalle del archivo individual"
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Ver detalle
            </button>
          )}
          <button
            type="button"
            className="dock-primary"
            onClick={() => setShowRvdModal(true)}
            title="Generar resumen en conjunto con Gemini AI a partir de los resúmenes individuales"
          >
            <Sparkles size={15} />{" "}
            {selectedIds.length > 1
              ? `Resumen en conjunto (${selectedIds.length})`
              : "Resumen con IA"}
          </button>
        </div>
      )}
      {showRvdModal && (
        <RvdSummaryModal
          isOpen={showRvdModal}
          onClose={() => setShowRvdModal(false)}
          selectedDocuments={selectedDocuments}
          onOpenDocument={(doc) => {
            setShowRvdModal(false);
            setActiveDocument(doc);
          }}
          onOpenComparativas={() => setShowComparativasModal(true)}
        />
      )}
      {showComparativasModal && (
        <ComparativasModal
          isOpen={showComparativasModal}
          onClose={() => setShowComparativasModal(false)}
        />
      )}
      {activeDocument && (
        <DocumentDetail
          document={activeDocument}
          canDelete={canDeleteDocument}
          onClose={() => setActiveDocument(null)}
          onDelete={canDeleteDocument ? handleDeleteDocument : undefined}
        />
      )}
      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}
      <UploadModal
        isOpen={showUploadModal}
        onClose={handleUploadModalClose}
        onUpload={handleUploadSuccess}
        currentCategory={activeCategory}
        categories={categoriesList}
      />
      {toastMessage && (
        <div className="upload-toast" role="status">
          <Check size={16} />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <ChatBotWidget
        activeDocument={activeDocument}
        activeCategory={activeCategory}
        onDocumentSelect={(doc) => setActiveDocument(doc)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
