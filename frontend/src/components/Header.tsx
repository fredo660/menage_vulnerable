/**
 * components/Header.tsx
 * Reçoit apiOnline + onSignOut depuis App.tsx (via useAppContext)
 */
import React from "react";

interface HeaderProps {
  apiOnline: boolean | null;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ apiOnline, onSignOut }) => {
  return (
    <header className="app-header">
      <div className="header-inner">

        {/* ── Brand ─────────────────────────────────────── */}
        <div className="header-brand">
          <div className="brand-mark">
            <span className="brand-glyph">◈</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">VulnéraScope</h1>
            <p className="brand-sub">
              Analyse Discriminante Linéaire · Classification des Ménages
            </p>
          </div>
        </div>

        {/* ── Statuts + actions ─────────────────────────── */}
        <div className="header-status">
          {/* Statut API */}
          <div
            className={`status-pill ${
              apiOnline === null
                ? "status-checking"
                : apiOnline
                ? "status-online"
                : "status-offline"
            }`}
          >
            <span className="status-dot" />
            <span className="status-label">
              {apiOnline === null
                ? "Vérification..."
                : apiOnline
                ? "API en ligne"
                : "API hors ligne"}
            </span>
          </div>

          {/* Badge modèle */}
          <div className="model-badge">
            <span className="model-label">Modèle</span>
            <span className="model-name">LDA</span>
          </div>

          {/* Bouton déconnexion (optionnel dans le header) */}
          {onSignOut && (
            <button className="signout-btn" onClick={onSignOut} title="Se déconnecter">
              ⏻
            </button>
          )}
        </div>
      </div>

      <div className="header-tagline">
        <p>
          Système d'aide à la décision pour l'identification et la classification
          des ménages vulnérables à Madagascar — propulsé par l'Analyse Discriminante Linéaire.
        </p>
      </div>
    </header>
  );
};

export default Header;