import React, { useState, useRef } from "react";

const API = "http://localhost:8000/api";

interface BatchResult {
  ligne: number;
  prediction: number;
  label_vulnerabilite: string;
  confiance_pct: number;
  proba_faible: number;
  proba_moderee: number;
  proba_elevee: number;
  revenu_mensuel: number;
  taille_menage: number;
  zone: number;
}

interface BatchStats {
  total: number;
  erreurs: number;
  faible: number;
  moderee: number;
  elevee: number;
  confiance_moyenne: number;
}

const COLORS: Record<string, string> = {
  Faible: "#22c55e",
  Modérée: "#f59e0b",
  Élevée: "#ef4444",
};

const CSV_TEMPLATE = `revenu_mensuel;taille_menage;nb_enfants;acces_eau;electricite;type_logement;emploi_chef;niveau_etude;distance_centre_sante_km;zone;alimentation_suffisante;acces_internet;depenses_mensuelles
150000;4;2;oui;non;précaire;instable;primaire;8;rural;non;non;120000
320000;3;1;oui;oui;moyen;stable;secondaire;3;urbain;oui;oui;280000
80000;6;3;non;non;précaire;sans emploi;aucun;15;rural;non;non;65000`;

const BatchPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [errors, setErrors] = useState<{ ligne: number; erreur: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Seuls les fichiers .csv sont acceptés.");
      return;
    }
    setFile(f);
    setError(null);
    setResults([]);
    setStats(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/batch/predict`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur serveur");
      }
      const data = await res.json();
      setResults(data.results);
      setStats(data.stats);
      setErrors(data.errors);
      setPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API}/batch/predict/export`, { method: "POST", body: formData });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "predictions_batch.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_menages.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="batch-page">
      {/* Header */}
      <div className="batch-header">
        <div>
          <h2 className="section-h2">Import CSV — Prédiction en Masse</h2>
          <p className="section-sub">Uploadez un fichier CSV pour classifier plusieurs ménages en une seule opération.</p>
        </div>
        <button className="btn-template" onClick={downloadTemplate}>
          ⬇ Télécharger le template CSV
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="drop-file-info">
            <span className="drop-icon">📄</span>
            <div>
              <p className="drop-filename">{file.name}</p>
              <p className="drop-size">{(file.size / 1024).toFixed(1)} Ko · Prêt pour l'analyse</p>
            </div>
            <button className="drop-remove" onClick={e => { e.stopPropagation(); setFile(null); setResults([]); setStats(null); }}>✕</button>
          </div>
        ) : (
          <div className="drop-empty">
            <span className="drop-icon">⬆</span>
            <p className="drop-title">Glissez votre CSV ici</p>
            <p className="drop-hint">ou cliquez pour parcourir · séparateur ; ou ,</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-box" style={{ marginTop: 0 }}>
          <span className="error-icon">⚠</span>
          <div><p className="error-title">Erreur</p><p className="error-msg">{error}</p></div>
        </div>
      )}

      {/* Submit */}
      {file && !results.length && (
        <button className="btn-predict" style={{ width: "100%", justifyContent: "center" }} onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <span className="btn-loading"><span className="spinner" />Classification en cours...</span>
          ) : (
            <span>▶ Lancer la classification ({file.name})</span>
          )}
        </button>
      )}

      {/* Stats */}
      {stats && (
        <div className="batch-stats-grid">
          {[
            { label: "Total traité", val: stats.total, color: "#e8eaf0", icon: "◎" },
            { label: "Vulnérabilité faible", val: stats.faible, color: "#22c55e", icon: "✦" },
            { label: "Vulnérabilité modérée", val: stats.moderee, color: "#f59e0b", icon: "◈" },
            { label: "Vulnérabilité élevée", val: stats.elevee, color: "#ef4444", icon: "▲" },
            { label: "Confiance moyenne", val: `${stats.confiance_moyenne}%`, color: "#6c8fff", icon: "◉" },
            { label: "Erreurs", val: stats.erreurs, color: stats.erreurs > 0 ? "#ef4444" : "#525a72", icon: "✕" },
          ].map(s => (
            <div key={s.label} className="batch-stat-card">
              <span className="batch-stat-icon" style={{ color: s.color }}>{s.icon}</span>
              <span className="batch-stat-val" style={{ color: s.color }}>{s.val}</span>
              <span className="batch-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Distribution bar */}
      {stats && stats.total > 0 && (
        <div className="chart-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 className="chart-title" style={{ margin: 0 }}>Distribution des résultats</h3>
            <button className="btn-export" onClick={handleExport}>⬇ Exporter CSV enrichi</button>
          </div>
          <div className="dist-bar" style={{ height: 16 }}>
            {stats.faible > 0 && <div className="dist-seg seg-faible" style={{ width: `${(stats.faible / stats.total) * 100}%` }} />}
            {stats.moderee > 0 && <div className="dist-seg seg-moderee" style={{ width: `${(stats.moderee / stats.total) * 100}%` }} />}
            {stats.elevee > 0 && <div className="dist-seg seg-elevee" style={{ width: `${(stats.elevee / stats.total) * 100}%` }} />}
          </div>
          <div className="dist-legend" style={{ marginTop: 10 }}>
            <span className="legend-item"><span className="dot dot-faible" />Faible ({Math.round((stats.faible / stats.total) * 100)}%)</span>
            <span className="legend-item"><span className="dot dot-moderee" />Modérée ({Math.round((stats.moderee / stats.total) * 100)}%)</span>
            <span className="legend-item"><span className="dot dot-elevee" />Élevée ({Math.round((stats.elevee / stats.total) * 100)}%)</span>
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="chart-title" style={{ margin: 0 }}>
              Résultats détaillés
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "#525a72", fontWeight: 400, marginLeft: 12 }}>
                {results.length} ménages
              </span>
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Classification</th>
                  <th>Confiance</th>
                  <th>P. Faible</th>
                  <th>P. Modérée</th>
                  <th>P. Élevée</th>
                  <th>Revenu (Ar)</th>
                  <th>Taille</th>
                  <th>Zone</th>
                </tr>
              </thead>
              <tbody>
                {pageResults.map(r => {
                  const color = COLORS[r.label_vulnerabilite] || "#8b92a8";
                  return (
                    <tr key={r.ligne}>
                      <td style={{ color: "#525a72", fontFamily: "IBM Plex Mono" }}>{r.ligne}</td>
                      <td>
                        <span className="table-badge" style={{ color, background: color + "1a", border: `1px solid ${color}44` }}>
                          {r.label_vulnerabilite}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                            <div style={{ width: `${r.confiance_pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color }}>{r.confiance_pct}%</span>
                        </div>
                      </td>
                      <td style={{ color: "#22c55e", fontFamily: "IBM Plex Mono", fontSize: 12 }}>{r.proba_faible}%</td>
                      <td style={{ color: "#f59e0b", fontFamily: "IBM Plex Mono", fontSize: 12 }}>{r.proba_moderee}%</td>
                      <td style={{ color: "#ef4444", fontFamily: "IBM Plex Mono", fontSize: 12 }}>{r.proba_elevee}%</td>
                      <td style={{ fontFamily: "IBM Plex Mono", fontSize: 12 }}>{r.revenu_mensuel?.toLocaleString("fr-FR")}</td>
                      <td style={{ fontFamily: "IBM Plex Mono", fontSize: 12 }}>{r.taille_menage}</td>
                      <td style={{ fontSize: 12, color: "#8b92a8" }}>{r.zone === 1 ? "Urbain" : "Rural"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="table-pagination">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="page-btn">← Préc.</button>
              <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "#8b92a8" }}>
                Page {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="page-btn">Suiv. →</button>
            </div>
          )}
        </div>
      )}

      {/* Error rows */}
      {(errors?.length ?? 0) > 0 && (
  <div className="error-box">
    <span className="error-icon">⚠</span>
    <div>
      <p className="error-title">{errors.length} ligne(s) en erreur</p>

      {errors.slice(0, 3).map((e) => (
        <p key={e.ligne} className="error-msg">
          Ligne {e.ligne}: {e.erreur}
        </p>
      ))}
    </div>
  </div>
)}
    </div>
  );
};

export default BatchPage;