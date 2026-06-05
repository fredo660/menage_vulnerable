import React, { useEffect, useState } from "react";
import type { MenageInput, PredictionResult } from "../types";

const API =
  `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;

interface LDAPoint {
  x: number; y: number; ld1: number;
  classe: number; label: string; color: string;
}
interface LDACoef {
  feature: string; ld1: number; importance: number;
}
interface ProjectedPoint {
  ld1: number; x: number; y: number;
  prediction: number; label: string; color: string;
  probabilities: { classe: number; label: string; proba: number; color: string }[];
}
interface ProjectionData {
  points: LDAPoint[];
  coefs: LDACoef[];
  explained_variance: number[];
  n_classes: number;
  labels: Record<string, string>;
  threshold_ld1: number;
}

const FEATURE_LABELS: Record<string, string> = {
  revenu_mensuel: "Revenu mensuel", taille_menage: "Taille ménage",
  nb_enfants: "Nbre enfants", acces_eau: "Accès eau",
  electricite: "Électricité", type_logement: "Type logement",
  emploi_chef: "Emploi chef", niveau_etude: "Niveau étude",
  distance_centre_sante_km: "Dist. santé", zone: "Zone",
  alimentation_suffisante: "Alimentation", acces_internet: "Internet",
  depenses_mensuelles: "Dépenses",
};

interface LDAPageProps {
  lastInput?: MenageInput | null;
  lastResult?: PredictionResult | null;
}

const LDAPage: React.FC<LDAPageProps> = ({ lastInput }) => {
  const [data,      setData]      = useState<ProjectionData | null>(null);
  const [projected, setProjected] = useState<ProjectedPoint | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [projecting,setProjecting]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [hovered,   setHovered]   = useState<LDAPoint | null>(null);

  useEffect(() => {
    fetch(`${API}/lda/projection`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!lastInput) return;
    setProjecting(true);
    fetch(`${API}/lda/project-point`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastInput),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setProjected(d); setProjecting(false); })
      .catch(() => setProjecting(false));
  }, [lastInput]);

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner-large">
        <div className="spinner-ring r1" /><div className="spinner-ring r2" /><div className="spinner-ring r3" />
      </div>
      <p className="loading-text">Calcul de la projection LDA...</p>
    </div>
  );

  if (error) return (
    <div className="error-box">
      <span className="error-icon">⚠</span>
      <div>
        <p className="error-title">Erreur projection LDA</p>
        <p className="error-msg">{error}</p>
        <p className="error-hint">Vérifiez que le modèle est entraîné (python train_model.py) et que l'API est démarrée.</p>
      </div>
    </div>
  );

  const points = data?.points ?? [];
  const coefs  = data?.coefs  ?? [];
  const threshold = data?.threshold_ld1 ?? 0;

  // ── Coordonnées SVG ──────────────────────────────────────
  const W = 580, H = 380, PAD = { top:30, right:24, bottom:40, left:56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = xs.length ? Math.min(...xs) : -3;
  const maxX = xs.length ? Math.max(...xs) :  3;
  const minY = ys.length ? Math.min(...ys) : -1;
  const maxY = ys.length ? Math.max(...ys) :  1;
  const rX   = (maxX - minX) || 1;
  const rY   = (maxY - minY) || 1;

  const toX = (x: number) => PAD.left  + ((x - minX) / rX) * innerW;
  const toY = (y: number) => PAD.top   + ((maxY - y) / rY) * innerH;

  // Position de la frontière de décision (seuil LD1)
  const threshX = toX(threshold);

  // Top coefs
  const topCoefs = [...coefs].sort((a,b) => b.importance - a.importance).slice(0, 10);
  const maxImp   = topCoefs[0]?.importance || 1;

  return (
    <div className="lda-page">

      {/* ── En-tête ─────────────────────────────────────── */}
      <div className="lda-intro">
        <div className="lda-intro-text">
          <h2 className="section-h2">Projection LDA — Classification Binaire</h2>
          <p>
            Votre dataset comporte <strong>2 classes</strong> : ménages{" "}
            <span style={{ color:"#22c55e" }}>non vulnérables (0)</span> et{" "}
            <span style={{ color:"#ef4444" }}>vulnérables (1)</span>.
            La LDA binaire produit <strong>1 axe discriminant</strong> (LD1) qui maximise
            la séparation entre les deux groupes.
          </p>
          <div className="explained-pills" style={{ marginTop:12 }}>
            <div className="explained-pill">
              <span className="explained-label">Axe LD1</span>
              <span className="explained-val">100% variance</span>
            </div>
            <div className="explained-pill" style={{ borderColor:"rgba(239,68,68,0.3)" }}>
              <span className="explained-label">Frontière décision</span>
              <span className="explained-val" style={{ color:"#f59e0b" }}>
                LD1 = {threshold.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
        <div className="scatter-legend">
          <div className="legend-row">
            <span style={{ width:10,height:10,borderRadius:"50%",background:"#22c55e",display:"inline-block" }}/>
            <span>Non vulnérable (0)</span>
          </div>
          <div className="legend-row">
            <span style={{ width:10,height:10,borderRadius:"50%",background:"#ef4444",display:"inline-block" }}/>
            <span>Vulnérable (1)</span>
          </div>
          {lastInput && (
            <div className="legend-row">
              <span style={{ width:14,height:14,borderRadius:3,background:"#fff",border:"2.5px solid #6c8fff",display:"inline-block" }}/>
              <span style={{ color:"#6c8fff" }}>Votre ménage</span>
            </div>
          )}
        </div>
      </div>

      <div className="lda-main-grid">

        {/* ── Scatter plot LD1 ──────────────────────────── */}
        <div className="chart-card scatter-card">
          <h3 className="chart-title" style={{ marginBottom:4 }}>Distribution sur l'Axe Discriminant LD1</h3>
          <p style={{ fontSize:12, color:"#525a72", fontFamily:"IBM Plex Mono", marginBottom:12 }}>
            Axe horizontal = LD1 (score discriminant) · Axe vertical = dispersion pour lisibilité
          </p>

          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto" }}>
            {/* Grille */}
            {[0.25,0.5,0.75].map(t => (
              <line key={t}
                x1={PAD.left + t*innerW} y1={PAD.top}
                x2={PAD.left + t*innerW} y2={PAD.top + innerH}
                stroke="rgba(255,255,255,0.04)"
              />
            ))}

            {/* Zone rouge (vulnérable) / verte (non vulnérable) */}
            <rect
              x={PAD.left} y={PAD.top}
              width={Math.max(0, threshX - PAD.left)} height={innerH}
              fill="rgba(34,197,94,0.04)"
            />
            <rect
              x={threshX} y={PAD.top}
              width={Math.max(0, PAD.left + innerW - threshX)} height={innerH}
              fill="rgba(239,68,68,0.04)"
            />

            {/* Frontière de décision */}
            <line
              x1={threshX} y1={PAD.top - 8}
              x2={threshX} y2={PAD.top + innerH + 8}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3"
            />
            <text x={threshX + 4} y={PAD.top + 14}
              fill="#f59e0b" fontSize={10} fontFamily="IBM Plex Mono">
              seuil = {threshold.toFixed(2)}
            </text>

            {/* Axes */}
            <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.1)"/>
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.1)"/>

            {/* Ticks axe X */}
            {[0,0.25,0.5,0.75,1].map(t => {
              const val = minX + t*rX;
              const x   = PAD.left + t*innerW;
              return (
                <g key={t}>
                  <line x1={x} y1={PAD.top + innerH} x2={x} y2={PAD.top + innerH + 4} stroke="rgba(255,255,255,0.15)"/>
                  <text x={x} y={PAD.top + innerH + 14} textAnchor="middle"
                    fill="#525a72" fontSize={9} fontFamily="IBM Plex Mono">{val.toFixed(1)}</text>
                </g>
              );
            })}

            {/* Label axe X */}
            <text x={PAD.left + innerW/2} y={H - 4} textAnchor="middle"
              fill="#525a72" fontSize={11} fontFamily="IBM Plex Mono">
              Score discriminant LD1
            </text>

            {/* Labels zones */}
            <text x={PAD.left + 8} y={PAD.top + 20}
              fill="rgba(34,197,94,0.5)" fontSize={10} fontFamily="Syne" fontWeight={700}>
              ← Non vulnérable
            </text>
            <text x={PAD.left + innerW - 8} y={PAD.top + 20}
              textAnchor="end" fill="rgba(239,68,68,0.5)" fontSize={10} fontFamily="Syne" fontWeight={700}>
              Vulnérable →
            </text>

            {/* Points */}
            {[0,1].map(cls => (
              <g key={cls}>
                {points.filter(p => p.classe === cls).map((p, i) => (
                  <circle
                    key={i}
                    cx={toX(p.x)} cy={toY(p.y)}
                    r={hovered?.classe === cls ? 4.5 : 3.5}
                    fill={p.color}
                    fillOpacity={hovered && hovered.classe !== cls ? 0.12 : 0.5}
                    stroke={hovered?.ld1 === p.ld1 ? "#fff" : "none"}
                    strokeWidth={1}
                    style={{ cursor:"crosshair" }}
                    onMouseEnter={() => setHovered(p)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </g>
            ))}

            {/* Point projeté */}
            {projected && !projecting && (
              <g>
                <circle cx={toX(projected.x)} cy={toY(projected.y)} r={16}
                  fill="rgba(108,143,255,0.08)" stroke="#6c8fff"
                  strokeWidth={1} strokeDasharray="4,3">
                  <animate attributeName="r" values="12;18;12" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <rect
                  x={toX(projected.x)-7} y={toY(projected.y)-7}
                  width={14} height={14} rx={3}
                  fill="#fff" stroke="#6c8fff" strokeWidth={2.5}
                />
                <text x={toX(projected.x)+12} y={toY(projected.y)-10}
                  fill="#6c8fff" fontSize={11} fontFamily="Syne" fontWeight={700}>
                  Votre ménage (LD1={projected.ld1.toFixed(2)})
                </text>
              </g>
            )}

            {/* Tooltip hover */}
            {hovered && (
              <g>
                <rect
                  x={Math.min(toX(hovered.x)+8, W-120)} y={toY(hovered.y)-36}
                  width={112} height={30} rx={5}
                  fill="#1c2132" stroke={hovered.color} strokeWidth={1}
                />
                <text
                  x={Math.min(toX(hovered.x)+64, W-64)} y={toY(hovered.y)-22}
                  textAnchor="middle" fill={hovered.color} fontSize={11}
                  fontFamily="Syne" fontWeight={700}>{hovered.label}</text>
                <text
                  x={Math.min(toX(hovered.x)+64, W-64)} y={toY(hovered.y)-9}
                  textAnchor="middle" fill="#8b92a8" fontSize={9} fontFamily="IBM Plex Mono">
                  LD1 = {hovered.ld1.toFixed(3)}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* ── Panneau droit ──────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Résultat ménage projeté */}
          {projected && !projecting && (
            <div className="chart-card" style={{ borderColor: projected.color + "55" }}>
              <h3 className="chart-title" style={{ color: projected.color }}>
                Votre Ménage — {projected.label}
              </h3>
              <div style={{ fontFamily:"IBM Plex Mono", fontSize:12, color:"#8b92a8", margin:"10px 0 14px" }}>
                Score LD1 = <span style={{ color:projected.color, fontWeight:700 }}>{projected.ld1.toFixed(4)}</span>
                {" "} · Seuil = <span style={{ color:"#f59e0b" }}>{threshold.toFixed(4)}</span>
              </div>
              {projected.probabilities.map(p => (
                <div key={p.classe} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:13, color:"#8b92a8" }}>{p.label}</span>
                    <span style={{ fontFamily:"IBM Plex Mono", fontSize:14, fontWeight:700, color:p.color }}>
                      {p.proba}%
                    </span>
                  </div>
                  <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:6 }}>
                    <div style={{
                      height:"100%", width:`${p.proba}%`,
                      background:p.color, borderRadius:6,
                      transition:"width 0.9s cubic-bezier(.16,1,.3,1)"
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {projecting && (
            <div className="chart-card" style={{ textAlign:"center", padding:32 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                <div className="spinner" style={{ width:24,height:24,borderWidth:2 }}/>
                <p style={{ color:"#8b92a8", fontSize:13 }}>Projection en cours...</p>
              </div>
            </div>
          )}

          {/* Importance des variables */}
          {topCoefs.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Importance des Variables</h3>
              <p style={{ fontSize:11, color:"#525a72", marginBottom:14, fontFamily:"IBM Plex Mono" }}>
                Coefficients LD1 — impact sur la discrimination
              </p>
              {topCoefs.map((c, i) => {
                const pct    = (c.importance / maxImp) * 100;
                const isPos  = c.ld1 > 0;
                const barColor = isPos ? "#ef4444" : "#22c55e";
                // Positif → pousse vers vulnérable, Négatif → pousse vers non vulnérable
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:"#8b92a8", fontFamily:"IBM Plex Mono" }}>
                        {FEATURE_LABELS[c.feature] || c.feature}
                      </span>
                      <span style={{ fontFamily:"IBM Plex Mono", fontSize:11, color:barColor, fontWeight:700 }}>
                        {c.ld1 > 0 ? "+" : ""}{c.ld1.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:6 }}>
                      <div style={{
                        height:"100%", width:`${pct}%`,
                        background:barColor, borderRadius:6, opacity:0.8
                      }}/>
                    </div>
                    <p style={{ fontSize:9, color:"#525a72", fontFamily:"IBM Plex Mono", marginTop:2 }}>
                      {isPos ? "↑ vulnérabilité" : "↓ vulnérabilité"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!lastInput && !projecting && (
        <div className="lda-hint">
          <span>💡</span>
          <p>
            Classifiez un ménage dans l'onglet <strong>Classifier</strong> pour voir
            son score LD1 exact et ses probabilités de vulnérabilité.
          </p>
        </div>
      )}
    </div>
  );
};

export default LDAPage;