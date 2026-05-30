import React, { useState } from "react";
import type { MenageInput } from "../types";

interface FormProps {
  onSubmit: (data: MenageInput) => void;
  loading: boolean;
}

const defaultValues: MenageInput = {
  revenu_mensuel: 150000,
  taille_menage: 4,
  nb_enfants: 2,
  acces_eau: 1,
  electricite: 0,
  type_logement: 0,
  emploi_chef: 1,
  niveau_etude: 1,
  distance_centre_sante_km: 8,
  zone: 0,
  alimentation_suffisante: 0,
  acces_internet: 0,
  depenses_mensuelles: 120000,
};

const MenageForm: React.FC<FormProps> = ({ onSubmit, loading }) => {
  const [form, setForm] = useState<MenageInput>(defaultValues);

  const set = (key: keyof MenageInput, val: number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const resetForm = () => setForm(defaultValues);

  return (
    <form className="menage-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2 className="form-title">Données du Ménage</h2>
        <p className="form-subtitle">Renseignez les informations socio-économiques pour l'analyse</p>
      </div>

      {/* SECTION ÉCONOMIQUE */}
      <div className="form-section">
        <div className="section-label">
          <span className="section-num">01</span>
          <span>Profil Économique</span>
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Revenu mensuel (Ar)</label>
            <input
              type="number"
              className="field-input"
              value={form.revenu_mensuel}
              min={0}
              onChange={(e) => set("revenu_mensuel", +e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Dépenses mensuelles (Ar)</label>
            <input
              type="number"
              className="field-input"
              value={form.depenses_mensuelles}
              min={0}
              onChange={(e) => set("depenses_mensuelles", +e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Emploi du chef de ménage</label>
            <select
              className="field-select"
              value={form.emploi_chef}
              onChange={(e) => set("emploi_chef", +e.target.value)}
            >
              <option value={0}>Sans emploi</option>
              <option value={1}>Instable</option>
              <option value={2}>Stable</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Niveau d'étude</label>
            <select
              className="field-select"
              value={form.niveau_etude}
              onChange={(e) => set("niveau_etude", +e.target.value)}
            >
              <option value={0}>Aucun</option>
              <option value={1}>Primaire</option>
              <option value={2}>Secondaire</option>
              <option value={3}>Universitaire</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION MÉNAGE */}
      <div className="form-section">
        <div className="section-label">
          <span className="section-num">02</span>
          <span>Composition du Ménage</span>
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Taille du ménage</label>
            <div className="field-with-badge">
              <input
                type="range"
                className="field-range"
                min={1}
                max={15}
                value={form.taille_menage}
                onChange={(e) => set("taille_menage", +e.target.value)}
              />
              <span className="range-badge">{form.taille_menage} pers.</span>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Nombre d'enfants</label>
            <div className="field-with-badge">
              <input
                type="range"
                className="field-range"
                min={0}
                max={12}
                value={form.nb_enfants}
                onChange={(e) => set("nb_enfants", +e.target.value)}
              />
              <span className="range-badge">{form.nb_enfants} enf.</span>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Zone</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${form.zone === 0 ? "active" : ""}`}
                onClick={() => set("zone", 0)}
              >
                Rural
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.zone === 1 ? "active" : ""}`}
                onClick={() => set("zone", 1)}
              >
                Urbain
              </button>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Type de logement</label>
            <select
              className="field-select"
              value={form.type_logement}
              onChange={(e) => set("type_logement", +e.target.value)}
            >
              <option value={0}>Précaire</option>
              <option value={1}>Moyen</option>
              <option value={2}>Moderne</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION ACCÈS */}
      <div className="form-section">
        <div className="section-label">
          <span className="section-num">03</span>
          <span>Accès aux Services</span>
        </div>
        <div className="form-grid form-grid-accès">
          {[
            { key: "acces_eau" as keyof MenageInput, label: "Accès à l'eau", icon: "💧" },
            { key: "electricite" as keyof MenageInput, label: "Électricité", icon: "⚡" },
            { key: "alimentation_suffisante" as keyof MenageInput, label: "Alimentation suffisante", icon: "🌾" },
            { key: "acces_internet" as keyof MenageInput, label: "Internet", icon: "📡" },
          ].map(({ key, label, icon }) => (
            <div key={key} className="access-card">
              <span className="access-icon">{icon}</span>
              <span className="access-label">{label}</span>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn toggle-sm ${form[key] === 0 ? "active-danger" : ""}`}
                  onClick={() => set(key, 0)}
                >
                  Non
                </button>
                <button
                  type="button"
                  className={`toggle-btn toggle-sm ${form[key] === 1 ? "active-success" : ""}`}
                  onClick={() => set(key, 1)}
                >
                  Oui
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="field-group field-full">
            <label className="field-label">Distance centre de santé (km)</label>
            <div className="field-with-badge">
              <input
                type="range"
                className="field-range"
                min={0}
                max={100}
                step={0.5}
                value={form.distance_centre_sante_km}
                onChange={(e) => set("distance_centre_sante_km", +e.target.value)}
              />
              <span className="range-badge">{form.distance_centre_sante_km} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="form-actions">
        <button type="button" className="btn-reset" onClick={resetForm} disabled={loading}>
          Réinitialiser
        </button>
        <button type="submit" className="btn-predict" disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <span className="spinner" />
              Analyse en cours...
            </span>
          ) : (
            <span>
              Classifier le Ménage <span className="btn-arrow">→</span>
            </span>
          )}
        </button>
      </div>
    </form>
  );
};

export default MenageForm;