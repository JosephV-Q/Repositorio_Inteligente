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
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import { categories as defaultCategories, documents as initialDocuments } from "./data/documents";
import { api } from "./services/api";
import type { DocumentItem } from "./types/document";

function MainContent() {
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();

  const [docList, setDocList] = useState<DocumentItem[]>(initialDocuments);
  const [categoriesList, setCategoriesList] = useState<string[]>(defaultCategories);
  const [activeCategory, setActiveCategory] = useState("Todas las categorías");
  const [isRvdMode, setIsRvdMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

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
            };
          });

          setDocList((current) => {
            const existingIds = new Set(current.map((d) => d.id));
            const newOnes = remoteDocs.filter((d) => !existingIds.has(d.id));
            return [...newOnes, ...current];
          });
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

  const handleDeleteDocument = (id: string) => {
    const doc = docList.find((d) => d.id === id);
    const title = doc?.title || id;
    setDocList((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    if (activeDocument?.id === id) {
      setActiveDocument(null);
    }
    setToastMessage(`Documento "${title}" eliminado.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const visibleDocuments = useMemo(() => {
    const filtered = docList.filter((document) => {
      const matchesCategory =
        activeCategory === "Todas las categorías" ||
        document.category === activeCategory;
      const matchesQuery =
        !query.trim() ||
        `${document.title} ${document.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [docList, activeCategory, query]);

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
    setDocList((current) => [newDoc, ...current]);
    if (activeCategory !== "Todas las categorías") {
      setActiveCategory(newDoc.category);
    }
    setToastMessage(`Documento "${newDoc.title}" subido y analizado con éxito.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
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
      />
      <main className="main-area">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          onMenuToggle={() => setMobileMenu(!mobileMenu)}
          onAccountOpen={() => setShowAccount(true)}
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
          />
        )}
      </main>
      {selectedIds.length > 0 && canRvd && (
        <div className="selection-dock">
          <span>
            <Check size={16} /> {selectedIds.length} seleccionados
          </span>
          <button type="button" onClick={clearSelection}>
            Limpiar
          </button>
          <button
            type="button"
            className="dock-primary"
            onClick={() =>
              setActiveDocument(
                docList.find((document) => document.id === selectedIds[0]) ??
                  null,
              )
            }
          >
            <Sparkles size={15} /> Ver resumen
          </button>
        </div>
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
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadSuccess}
        currentCategory={activeCategory}
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
