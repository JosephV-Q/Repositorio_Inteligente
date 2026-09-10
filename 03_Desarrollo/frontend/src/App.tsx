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
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";
import { categories as defaultCategories, documents as initialDocuments } from "./data/documents";
import { api } from "./services/api";
import type { DocumentItem } from "./types/document";

function MainContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  const [docList, setDocList] = useState<DocumentItem[]>(initialDocuments);
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

  // Detección de token de invitación en la URL (?token=XYZ)
  const [invitationToken, setInvitationToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("token") || null;
    }
    return null;
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
    for (const cat of defaultCategories) {
      counts[cat] = docList.filter((doc) => doc.category === cat).length;
    }
    return counts;
  }, [docList]);

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
    if (isRvdMode) {
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

  // 2. Flujo de registro por invitación (?token=XYZ)
  if (!isAuthenticated && invitationToken) {
    return (
      <RegisterWithInvitation
        token={invitationToken}
        onCancel={() => {
          setInvitationToken(null);
          if (window.history.pushState) {
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            window.history.pushState({}, "", url.pathname);
          }
        }}
        onSuccess={() => {
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
    return <AdminLogin />;
  }

  // 4. Shell principal cuando el usuario está autenticado
  return (
    <div className="app-shell">
      <Sidebar
        activeCategory={activeCategory}
        mobileMenu={mobileMenu}
        totalDocuments={docList.length}
        categoryCounts={categoryCounts}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setShowDashboard(false);
          setMobileMenu(false);
        }}
        onDashboardClick={() => {
          setShowDashboard(true);
          setMobileMenu(false);
        }}
      />
      <main className="main-area">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          onMenuToggle={() => setMobileMenu(!mobileMenu)}
          onAccountOpen={() => setShowAccount(true)}
        />
        {showDashboard ? (
          <Dashboard
            documents={docList}
            categories={defaultCategories}
            onBack={() => setShowDashboard(false)}
          />
        ) : (
          <DocumentLibrary
            activeCategory={activeCategory}
            documents={visibleDocuments}
            isRvdMode={isRvdMode}
            selectedIds={selectedIds}
            onRvdToggle={toggleRvdMode}
            onDocumentOpen={openDocument}
            onRvdClose={closeRvdMode}
            onUploadClick={() => setShowUploadModal(true)}
          />
        )}
      </main>
      {selectedIds.length > 0 && (
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
          onClose={() => setActiveDocument(null)}
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
