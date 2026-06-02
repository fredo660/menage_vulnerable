import React from "react";
import "./Landing.css";

interface LandingProps {
  onStart: () => void;
  isAuthenticated: boolean;
}

const Landing: React.FC<LandingProps> = ({
  onStart,
  isAuthenticated,
}) => {
  return (
    <div className="landing-container">

      {/* Overlay */}
      <div className="background-overlay"></div>

      {/* Hero Content */}
      <div className="landing-content">

        <div className="hero-badge">
          <span className="badge-dot"></span>
          Intelligence artificielle · Analyse sociale · Madagascar
        </div>

        <h1 className="title">
          Classification des
          <span className="gradient-text">
            {" "}Ménages Vulnérables
          </span>
        </h1>

        <p className="subtitle">
          Plateforme intelligente de classification basée sur
          l’Analyse Discriminante Linéaire (LDA),
          le Machine Learning et la visualisation géospatiale
          des données socio-économiques.
        </p>

        {/* Features */}
        <div className="features-grid">

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analyse statistique</h3>
            <p>
              Exploration interactive des données
              socio-économiques des ménages.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Modèle LDA</h3>
            <p>
              Classification intelligente des niveaux
              de vulnérabilité sociale.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Cartographie</h3>
            <p>
              Visualisation géographique et analyse
              spatiale des données.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Import CSV</h3>
            <p>
              Traitement et classification de données
              massives en quelques secondes.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="landing-actions">

          <button
            className="start-button"
            onClick={onStart}
          >
            {isAuthenticated
              ? "Accéder au tableau de bord"
              : "Commencer"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default Landing;