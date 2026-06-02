/**
 * App.tsx — Coquille de navigation pure
 * Lit useAppContext() pour décider quelle vue afficher :
 *   "landing" → <LandingPage>
 *   "auth"    → <Auth>
 *   "app"     → Dashboard complet (header + tabs + pages)
 */
import React, { Suspense, lazy } from "react";
import { useAppContext, type TabType } from "./context/AppContext";
import Header      from "./components/Header";
import MenageForm  from "./components/MenageForm";
import ResultCard  from "./components/ResultCard";
import HistoryPanel from "./components/HistoryPanel";
import Auth        from "./components/Auth";
import LandingPage from "./components/Landing";
import type { MenageInput, PredictionResult, HistoryEntry, StatsData } from "./types";
import "./App.css";
import "./extensions.css";
import "./components/Landing.css";

const EDAPage   = lazy(() => import("./pages/EDAPage"));
const LDAPage   = lazy(() => import("./pages/LDAPage"));
const GeoPage   = lazy(() => import("./pages/GeoPage"));
const BatchPage = lazy(() => import("./pages/BatchPage"));

// ── Définition des onglets ────────────────────────────────────
interface TabDef { id: TabType; icon: string; label: string; group: "main"|"analyse"|"data"|"meta"; }

const TAB_DEFS: TabDef[] = [
  { id:"classifier", icon:"◈", label:"Classifier",     group:"main"    },
  { id:"eda",        icon:"◉", label:"EDA",            group:"analyse" },
  { id:"lda",        icon:"⬡", label:"Projection LDA", group:"analyse" },
  { id:"geo",        icon:"⊕", label:"Carte",          group:"analyse" },
  { id:"batch",      icon:"≡", label:"Import CSV",     group:"data"    },
  { id:"historique", icon:"◎", label:"Historique",     group:"meta"    },
  { id:"apropos",    icon:"✦", label:"À propos",       group:"meta"    },
];

const TAB_GROUPS = [
  { key:"main"    as const, label:""         },
  { key:"analyse" as const, label:"Analyse"  },
  { key:"data"    as const, label:"Données"  },
  { key:"meta"    as const, label:""         },
];

const PageSpinner: React.FC<{ label?: string }> = ({ label="Chargement..." }) => (
  <div className="page-loading">
    <div className="loading-spinner-large">
      <div className="spinner-ring r1"/><div className="spinner-ring r2"/><div className="spinner-ring r3"/>
    </div>
    <p className="loading-text">{label}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const {
    appView, onStart,
    session, loadingSession, signOut,
    apiOnline,
    activeTab, setActiveTab,
    lastInput, loading, result, error,
    handleSubmit, handleSave, saving, saveMsg,
    history, stats, clearHistory,
  } = useAppContext();

  // ── Chargement session ────────────────────────────────────
  if (loadingSession) {
    return (
      <div className="app-root">
        <div className="bg-decoration" aria-hidden>
          <div className="bg-circle bg-circle-1"/>
          <div className="bg-circle bg-circle-2"/>
          <div className="bg-grid"/>
        </div>
        <PageSpinner label="Vérification de la session..." />
      </div>
    );
  }

  // ── LANDING ───────────────────────────────────────────────
  if (appView === "landing") {
    return (
      <div className="app-root">
        <div className="bg-decoration" aria-hidden>
          <div className="bg-circle bg-circle-1"/>
          <div className="bg-circle bg-circle-2"/>
          <div className="bg-circle bg-circle-3"/>
          <div className="bg-grid"/>
        </div>
        <div className="app-container">
          <LandingPage
            isAuthenticated={!!session}
            onStart={onStart}
          />
        </div>
      </div>
    );
  }

  // ── AUTH ──────────────────────────────────────────────────
  if (appView === "auth") {
    return (
      <div className="app-root">
        <div className="bg-decoration" aria-hidden>
          <div className="bg-circle bg-circle-1"/>
          <div className="bg-circle bg-circle-2"/>
          <div className="bg-grid"/>
        </div>
        <div className="app-container" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
          {/* Bouton retour landing */}
          <button
            onClick={() => {/* setAppView via contexte — on passe par signOut flow */}}
            style={{
              position:"absolute", top:24, left:24,
              background:"transparent", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8, padding:"8px 16px", color:"var(--text-muted)",
              fontFamily:"var(--font-mono)", fontSize:12, cursor:"pointer",
            }}
          >
            ← Retour
          </button>
          <Auth onSuccess={() => {}} />
        </div>
      </div>
    );
  }

  // ── APP (dashboard) ───────────────────────────────────────
  const tabs = TAB_DEFS.map(t => ({
    ...t,
    badge: t.id === "historique" && history.length > 0 ? history.length : undefined,
  }));

  return (
    <div className="app-root">
      <div className="bg-decoration" aria-hidden>
        <div className="bg-circle bg-circle-1"/>
        <div className="bg-circle bg-circle-2"/>
        <div className="bg-circle bg-circle-3"/>
        <div className="bg-grid"/>
      </div>

      <div className="app-container">

        <Header apiOnline={apiOnline} onSignOut={signOut} />

        {/* ── Navigation ─────────────────────────────────── */}
        <nav className="app-tabs-v2">
          {TAB_GROUPS.map(group => {
            const groupTabs = tabs.filter(t => t.group === group.key);
            if (!groupTabs.length) return null;
            return (
              <div key={group.key} className="tab-group">
                {group.label && <span className="tab-group-label">{group.label}</span>}
                {groupTabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn-v2 ${activeTab === tab.id ? "tab-active-v2" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                  >
                    <span className="tab-icon-v2">{tab.icon}</span>
                    <span className="tab-label-v2">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="tab-badge">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
          {/* Déconnexion */}
          <div className="tab-group" style={{ marginLeft:"auto" }}>
            <button className="tab-btn-v2 tab-signout" onClick={signOut} title="Se déconnecter">
              <span className="tab-icon-v2">⏻</span>
              <span className="tab-label-v2">Déconnexion</span>
            </button>
          </div>
        </nav>

        {/* ── Contenu ────────────────────────────────────── */}
        <main className="app-main">
          <PageContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            apiOnline={apiOnline}
            lastInput={lastInput}
            loading={loading}
            result={result}
            error={error}
            handleSubmit={handleSubmit}
            handleSave={handleSave}
            saving={saving}
            saveMsg={saveMsg}
            history={history}
            stats={stats}
            clearHistory={clearHistory}
          />
        </main>

        <footer className="app-footer">
          <p>VulnéraScope · Classification LDA · Madagascar · {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PageContent — switch par onglet
// ─────────────────────────────────────────────────────────────
interface PageContentProps {
  activeTab: TabType; setActiveTab: (t: TabType) => void;
  apiOnline: boolean | null; lastInput: MenageInput | null;
  loading: boolean; result: PredictionResult | null; error: string | null;
  handleSubmit: (data: MenageInput) => Promise<void>;
  handleSave: () => Promise<void>; saving: boolean; saveMsg: string | null;
  history: HistoryEntry[]; stats: StatsData; clearHistory: () => void;
}

const PageContent: React.FC<PageContentProps> = ({
  activeTab, setActiveTab, apiOnline, lastInput,
  loading, result, error, handleSubmit, handleSave,
  saving, saveMsg, history, stats, clearHistory,
}) => {
  switch (activeTab) {
    case "classifier": return (
      <div className="classifier-layout">
        <div className="form-column">
          <MenageForm onSubmit={handleSubmit} loading={loading} />
        </div>
        <div className="result-column">
          {error && !loading && (
            <div className="error-box">
              <span className="error-icon">⚠</span>
              <div>
                <p className="error-title">Erreur de prédiction</p>
                <p className="error-msg">{error}</p>
                {!apiOnline && <p className="error-hint">Vérifiez que FastAPI est démarré sur le port 8000.</p>}
              </div>
            </div>
          )}
          {!result && !error && !loading && <PlaceholderResult />}
          {loading && <LoadingResult />}
          {result && lastInput && !loading && (
            <>
              <ResultCard result={result} input={lastInput} onSave={handleSave} saving={saving} />
              {saveMsg && (
                <p className={`save-message ${saveMsg.startsWith("✓") ? "save-ok" : "save-err"}`}>
                  {saveMsg}
                </p>
              )}
              <button className="shortcut-btn" onClick={() => setActiveTab("lda")}>
                ⬡ Voir la position dans l'espace LDA →
              </button>
            </>
          )}
        </div>
      </div>
    );

    case "eda": return (
      <Suspense fallback={<PageSpinner label="Chargement des graphiques EDA..." />}>
        <EDAPage />
      </Suspense>
    );

    case "lda": return (
      <Suspense fallback={<PageSpinner label="Calcul de la projection LDA..." />}>
        <LDAPage lastInput={lastInput} lastResult={result} />
      </Suspense>
    );

    case "geo": return (
      <Suspense fallback={<PageSpinner label="Chargement de la carte..." />}>
        <GeoPage />
      </Suspense>
    );

    case "batch": return (
      <Suspense fallback={<PageSpinner label="Initialisation du module batch..." />}>
        <BatchPage />
      </Suspense>
    );

    case "historique": return (
      <HistoryPanel history={history} stats={stats} onClear={clearHistory} />
    );

    case "apropos": return <AboutPage />;
    default: return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Sous-composants statiques
// ─────────────────────────────────────────────────────────────
const PlaceholderResult: React.FC = () => (
  <div className="result-placeholder">
    <div className="placeholder-visual">
      <div className="placeholder-ring"/>
      <span className="placeholder-icon">◈</span>
    </div>
    <h3 className="placeholder-title">En attente d'analyse</h3>
    <p className="placeholder-text">
      Renseignez les données du ménage et cliquez sur "Classifier" pour
      obtenir le niveau de vulnérabilité prédit par le modèle LDA.
    </p>
    <div className="placeholder-steps">
      <div className="step"><span className="step-num">1</span><span>Remplissez le formulaire</span></div>
      <div className="step"><span className="step-num">2</span><span>Lancez la classification</span></div>
      <div className="step"><span className="step-num">3</span><span>Analysez les résultats</span></div>
    </div>
  </div>
);

const LoadingResult: React.FC = () => (
  <div className="loading-state">
    <div className="loading-spinner-large">
      <div className="spinner-ring r1"/><div className="spinner-ring r2"/><div className="spinner-ring r3"/>
    </div>
    <p className="loading-text">Classification en cours...</p>
    <p className="loading-sub">Le modèle LDA analyse les données du ménage</p>
  </div>
);

const AboutPage: React.FC = () => (
  <div className="about-page">
    <div className="about-section">
      <h2 className="about-title">Analyse Discriminante Linéaire</h2>
      <p className="about-text">
        Ce système utilise l'<strong>Analyse Discriminante Linéaire (LDA)</strong> pour
        classifier les ménages selon leur vulnérabilité. Classification binaire :
        <strong style={{color:"#22c55e"}}> Non vulnérable (0)</strong> et
        <strong style={{color:"#ef4444"}}> Vulnérable (1)</strong>.
      </p>
    </div>
    <div className="about-grid">
      {[
        { icon:"🎯", t:"Objectif",   b:"Identifier les ménages vulnérables pour optimiser les interventions sociales." },
        { icon:"⚙️", t:"Modèle LDA", b:"Maximise la séparation entre classes via combinaisons linéaires de features." },
        { icon:"📊", t:"Variables",  b:"13 variables socio-économiques : revenus, dépenses, accès aux services, emploi..." },
        { icon:"🏷️", t:"Classes",    b:"Binaire : Non vulnérable (0) · Vulnérable (1) selon le dataset réel." },
      ].map(c => (
        <div key={c.icon} className="about-card">
          <h3>{c.icon} {c.t}</h3><p>{c.b}</p>
        </div>
      ))}
    </div>
    <div className="about-section">
      <h2 className="about-title">Stack Technique</h2>
      <div className="tech-stack">
        {[
          {name:"FastAPI",desc:"Backend REST"},{name:"scikit-learn",desc:"Modèle LDA"},
          {name:"Supabase",desc:"Auth + BDD"},{name:"React + TSX",desc:"UI"},
          {name:"Recharts",desc:"Graphiques"},{name:"Python 3.11+",desc:"ML"},
          {name:"joblib",desc:"Persistance"},{name:"pandas",desc:"Données"},
        ].map(t => (
          <div key={t.name} className="tech-pill">
            <span className="tech-name">{t.name}</span>
            <span className="tech-desc">{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default App;