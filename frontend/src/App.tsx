import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import MenageForm from "./components/MenageForm";
import ResultCard from "./components/ResultCard";
import HistoryPanel from "./components/HistoryPanel";
import { usePrediction } from "./hooks/usePrediction";
import type { MenageInput } from "./types";
import { checkHealth, saveToSupabase } from "./services/api";
import "./App.css";

type TabType = "classifier" | "historique" | "apropos";

const App: React.FC = () => {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("classifier");
  const [lastInput, setLastInput] = useState<MenageInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { loading, result, error, history, stats, predict, clearHistory } = usePrediction();

  useEffect(() => {
    checkHealth().then(setApiOnline);
    const interval = setInterval(() => checkHealth().then(setApiOnline), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (data: MenageInput) => {
    setLastInput(data);
    setSaveMsg(null);
    const res = await predict(data);
    if (res) setActiveTab("classifier");
  };

  const handleSave = async () => {
    if (!lastInput || !result) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveToSupabase({ ...lastInput, vulnerabilite: result.prediction });
      setSaveMsg("✓ Données enregistrées dans Supabase");
    } catch (e) {
      setSaveMsg("✗ Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-root">
      {/* Background decoration */}
      <div className="bg-decoration" aria-hidden>
        <div className="bg-circle bg-circle-1" />
        <div className="bg-circle bg-circle-2" />
        <div className="bg-circle bg-circle-3" />
        <div className="bg-grid" />
      </div>

      <div className="app-container">
        <Header apiOnline={apiOnline} />

        {/* TABS */}
        <nav className="app-tabs">
          {(["classifier", "historique", "apropos"] as TabType[]).map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "classifier" && "◈ Classifier"}
              {tab === "historique" && `◎ Historique ${history.length > 0 ? `(${history.length})` : ""}`}
              {tab === "apropos" && "✦ À propos"}
            </button>
          ))}
        </nav>

        {/* CONTENT */}
        <main className="app-main">
          {activeTab === "classifier" && (
            <div className="classifier-layout">
              {/* FORM COLUMN */}
              <div className="form-column">
                <MenageForm onSubmit={handleSubmit} loading={loading} />
              </div>

              {/* RESULT COLUMN */}
              <div className="result-column">
                {error && (
                  <div className="error-box">
                    <span className="error-icon">⚠</span>
                    <div>
                      <p className="error-title">Erreur de prédiction</p>
                      <p className="error-msg">{error}</p>
                      {!apiOnline && (
                        <p className="error-hint">Vérifiez que le serveur FastAPI est démarré sur le port 8000.</p>
                      )}
                    </div>
                  </div>
                )}

                {!result && !error && !loading && (
                  <div className="result-placeholder">
                    <div className="placeholder-visual">
                      <div className="placeholder-ring" />
                      <span className="placeholder-icon">◈</span>
                    </div>
                    <h3 className="placeholder-title">En attente d'analyse</h3>
                    <p className="placeholder-text">
                      Renseignez les données du ménage et cliquez sur "Classifier" pour obtenir le niveau de vulnérabilité prédit par le modèle LDA.
                    </p>
                    <div className="placeholder-steps">
                      <div className="step"><span className="step-num">1</span><span>Remplissez le formulaire</span></div>
                      <div className="step"><span className="step-num">2</span><span>Lancez la classification</span></div>
                      <div className="step"><span className="step-num">3</span><span>Analysez les résultats</span></div>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="loading-state">
                    <div className="loading-spinner-large">
                      <div className="spinner-ring r1" />
                      <div className="spinner-ring r2" />
                      <div className="spinner-ring r3" />
                    </div>
                    <p className="loading-text">Classification en cours...</p>
                    <p className="loading-sub">Le modèle LDA analyse les données du ménage</p>
                  </div>
                )}

                {result && lastInput && !loading && (
                  <>
                    <ResultCard
                      result={result}
                      input={lastInput}
                      onSave={handleSave}
                      saving={saving}
                    />
                    {saveMsg && (
                      <p className={`save-message ${saveMsg.startsWith("✓") ? "save-ok" : "save-err"}`}>
                        {saveMsg}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "historique" && (
            <HistoryPanel history={history} stats={stats} onClear={clearHistory} />
          )}

          {activeTab === "apropos" && (
            <div className="about-page">
              <div className="about-section">
                <h2 className="about-title">Analyse Discriminante Linéaire</h2>
                <p className="about-text">
                  Ce système utilise l'<strong>Analyse Discriminante Linéaire (LDA)</strong> pour classifier les ménages selon leur niveau de vulnérabilité. Le modèle est entraîné sur des données socio-économiques réelles et permet une classification en trois catégories distinctes.
                </p>
              </div>

              <div className="about-grid">
                <div className="about-card">
                  <h3>🎯 Objectif</h3>
                  <p>Identifier et classifier automatiquement les ménages vulnérables pour optimiser les interventions sociales et l'allocation des ressources.</p>
                </div>
                <div className="about-card">
                  <h3>⚙️ Modèle LDA</h3>
                  <p>La LDA cherche les combinaisons linéaires de caractéristiques qui maximisent la séparation entre les classes de vulnérabilité tout en minimisant la variance intra-classe.</p>
                </div>
                <div className="about-card">
                  <h3>📊 Variables</h3>
                  <p>13 variables socio-économiques : revenus, dépenses, accès aux services, emploi, éducation, composition du ménage, zone géographique.</p>
                </div>
                <div className="about-card">
                  <h3>🏷️ Classes</h3>
                  <ul className="class-list">
                    <li><span className="class-dot" style={{ background: "#22c55e" }} />Faible — Conditions satisfaisantes</li>
                    <li><span className="class-dot" style={{ background: "#f59e0b" }} />Modérée — Risques partiels</li>
                    <li><span className="class-dot" style={{ background: "#ef4444" }} />Élevée — Intervention urgente</li>
                  </ul>
                </div>
              </div>

              <div className="about-section">
                <h2 className="about-title">Stack Technique</h2>
                <div className="tech-stack">
                  {[
                    { name: "FastAPI", desc: "Backend REST API" },
                    { name: "scikit-learn", desc: "Modèle LDA" },
                    { name: "Supabase", desc: "Base de données" },
                    { name: "React + TSX", desc: "Interface utilisateur" },
                    { name: "Python 3.11+", desc: "Traitement ML" },
                    { name: "joblib", desc: "Persistance du modèle" },
                  ].map((tech) => (
                    <div key={tech.name} className="tech-pill">
                      <span className="tech-name">{tech.name}</span>
                      <span className="tech-desc">{tech.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>VulnéraScope · Classification LDA · Madagascar · {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;