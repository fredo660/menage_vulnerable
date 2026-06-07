import React from "react";
import type { PredictionResult, MenageInput } from "../types";

interface ResultCardProps {
  result: PredictionResult;
  input: MenageInput;
  onSave?: () => void;
  saving?: boolean;
}

const RISK_FACTORS: { key: keyof MenageInput; label: string; criticalFn: (v: number) => boolean }[] = [
  { key: "revenu_mensuel", label: "Revenu mensuel faible", criticalFn: (v) => v < 100000 },
  { key: "emploi_chef", label: "Emploi précaire ou absent", criticalFn: (v) => v === 0 },
  { key: "acces_eau", label: "Pas d'accès à l'eau", criticalFn: (v) => v === 0 },
  { key: "electricite", label: "Pas d'électricité", criticalFn: (v) => v === 0 },
  { key: "alimentation_suffisante", label: "Alimentation insuffisante", criticalFn: (v) => v === 0 },
  { key: "type_logement", label: "Logement précaire", criticalFn: (v) => v === 0 },
  { key: "niveau_etude", label: "Niveau d'étude insuffisant", criticalFn: (v) => v <= 1 },
  { key: "distance_centre_sante_km", label: "Éloigné du centre de santé", criticalFn: (v) => v > 15 },
  { key: "nb_enfants", label: "Grand nombre d'enfants", criticalFn: (v) => v >= 4 },
];

const LABEL_NAMES: Record<string, string> = {
  "faible": "Faible",
  "modérée": "Modérée",
  "élevée": "Élevée",
};

const ResultCard: React.FC<ResultCardProps> = ({ result, input, onSave, saving }) => {
  const risks = RISK_FACTORS.filter(({ key, criticalFn }) =>
    criticalFn(input[key] as number)
  );

  const percentage = Number.isFinite(result.score) ? result.score : 0;

  return (
    <div className="result-card" style={{ "--result-color": result.color } as React.CSSProperties}>
      <div className="result-header">
        <div className="result-badge">
          <span className="result-icon">{result.icon}</span>
          <div>
            <p className="result-meta">Niveau de vulnérabilité</p>
            <h3 className="result-label">{LABEL_NAMES[result.label]}</h3>
          </div>
        </div>
        <div className="result-score-ring">
          <svg viewBox="0 0 80 80" className="ring-svg">
            <circle cx="40" cy="40" r="34" className="ring-bg" />
            <circle
              cx="40"
              cy="40"
              r="34"
              className="ring-fill"
              strokeDasharray={`${(percentage / 100) * 213.6} 213.6`}
              style={{ stroke: result.color }}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-number">{percentage}</span>
            <span className="ring-unit">%</span>
          </div>
        </div>
      </div>

      <p className="result-description">{result.description}</p>

      {/* GAUGE */}
      <div className="gauge-container">
        <div className="gauge-track">
          <div
            className="gauge-fill"
            style={{
              width: `${percentage}%`,
              background: result.color,
            }}
          />
        </div>
        <div className="gauge-labels">
          <span>Faible</span>
          <span>Modérée</span>
          <span>Élevée</span>
        </div>
      </div>

      {/* RISK FACTORS */}
      {risks.length > 0 && (
        <div className="risks-section">
          <h4 className="risks-title">Facteurs de risque identifiés</h4>
          <ul className="risks-list">
            {risks.map(({ key, label }) => (
              <li key={key} className="risk-item">
                <span className="risk-dot" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KEY STATS */}
      <div className="result-stats">
        <div className="stat-item">
          <span className="stat-val">{input.revenu_mensuel.toLocaleString("fr-MG")}</span>
          <span className="stat-key">Ar / mois</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-val">{input.taille_menage}</span>
          <span className="stat-key">Membres</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-val">{input.nb_enfants}</span>
          <span className="stat-key">Enfants</span>
        </div>
      </div>

      {onSave && (
        <button className="btn-save" onClick={onSave} disabled={saving}>
          {saving ? "Enregistrement..." : "💾 Sauvegarder dans Supabase"}
        </button>
      )}
    </div>
  );
};

export default ResultCard;