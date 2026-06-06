import React from "react";
import type { HistoryEntry, StatsData } from "../types";

interface HistoryPanelProps {
  history: HistoryEntry[];
  stats: StatsData;
  onClear: () => void;
}

const LABEL_NAMES: Record<string, string> = {
  faible: "Faible",
  "modérée": "Modérée",
  "élevée": "Élevée",
};

const getColor = (label: string) => {
  switch (label) {
    case "faible": return "#22c55e";
    case "modérée": return "#f59e0b";
    case "élevée": return "#ef4444";
    default: return "#8b92a8";
  }
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, stats, onClear }) => {
  return (
    <div className="history-panel">
      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <span className="stat-big">{stats.total}</span>
          <span className="stat-desc">Total analysés</span>
        </div>
        <div className="stat-card stat-faible">
          <span className="stat-big">{stats.faible}</span>
          <span className="stat-desc">Vulnérabilité faible</span>
        </div>
        <div className="stat-card stat-moderee">
          <span className="stat-big">{stats.moderee}</span>
          <span className="stat-desc">Vulnérabilité modérée</span>
        </div>
        <div className="stat-card stat-elevee">
          <span className="stat-big">{stats.elevee}</span>
          <span className="stat-desc">Vulnérabilité élevée</span>
        </div>
      </div>

      {/* DISTRIBUTION BAR */}
      {stats.total > 0 && (
        <div className="dist-bar-container">
          <p className="dist-label">Distribution des classifications</p>
          <div className="dist-bar">
            {stats.faible > 0 && (
              <div
                className="dist-seg seg-faible"
                style={{ width: `${(stats.faible / stats.total) * 100}%` }}
                title={`Faible: ${stats.faible}`}
              />
            )}
            {stats.moderee > 0 && (
              <div
                className="dist-seg seg-moderee"
                style={{ width: `${(stats.moderee / stats.total) * 100}%` }}
                title={`Modérée: ${stats.moderee}`}
              />
            )}
            {stats.elevee > 0 && (
              <div
                className="dist-seg seg-elevee"
                style={{ width: `${(stats.elevee / stats.total) * 100}%` }}
                title={`Élevée: ${stats.elevee}`}
              />
            )}
          </div>
          <div className="dist-legend">
            <span className="legend-item"><span className="dot dot-faible" />Faible ({Math.round((stats.faible / stats.total) * 100)}%)</span>
            <span className="legend-item"><span className="dot dot-moderee" />Modérée ({Math.round((stats.moderee / stats.total) * 100)}%)</span>
            <span className="legend-item"><span className="dot dot-elevee" />Élevée ({Math.round((stats.elevee / stats.total) * 100)}%)</span>
          </div>
        </div>
      )}

      {/* HISTORY LIST */}
      <div className="history-header">
        <h3 className="history-title">Historique des analyses</h3>
        {history.length > 0 && (
          <button className="btn-clear" onClick={onClear}>
            Effacer tout
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <span className="empty-icon">◎</span>
          <p>Aucune analyse effectuée</p>
          <p className="empty-sub">Les résultats apparaîtront ici après chaque classification</p>
        </div>
      ) : (
        <ul className="history-list">
          {history.map((entry, idx) => (
            <li key={entry.id} className="history-item">
              <div className="history-item-left">
                <span
                  className="history-dot"
                  style={{ background: getColor(entry.result.label) }}
                />
                <div>
                  <p className="history-label">
                    {LABEL_NAMES[entry.result.label]}
                    {idx === 0 && <span className="new-badge">Nouveau</span>}
                  </p>
                  <p className="history-meta">
                    {entry.input.revenu_mensuel.toLocaleString("fr-MG")} Ar · {entry.input.taille_menage} pers. · {entry.input.zone === 1 ? "Urbain" : "Rural"}
                  </p>
                </div>
              </div>
              <div className="history-item-right">
                <span className="history-score" style={{ color: entry.result.color }}>
                  {entry.result.score}%
                </span>
                <span className="history-time">
                  {entry.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryPanel;