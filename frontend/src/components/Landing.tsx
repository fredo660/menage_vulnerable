/**
 * pages/LandingPage.tsx
 * Page d'accueil avant authentification.
 * Bouton "Commencer" → onStart() géré par AppContext
 *   - Non connecté → ouvre Auth
 *   - Déjà connecté → ouvre l'App directement
 */
import React, { useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onStart: () => void;
  isAuthenticated: boolean;
}

// ── Particules flottantes ─────────────────────────────────────
interface Particle {
  id:number; x:number; y:number; size:number;
  opacity:number; speedX:number; speedY:number; color:string;
}

const PALETTE = ["#6c8fff","#22c55e","#ef4444","#f59e0b","#a78bfa"];

const mkParticle = (id:number): Particle => ({
  id, x: Math.random()*100, y: Math.random()*100,
  size: Math.random()*2.5 + 0.8,
  opacity: Math.random()*0.45 + 0.08,
  speedX: (Math.random()-0.5)*0.014,
  speedY: (Math.random()-0.5)*0.014,
  color: PALETTE[Math.floor(Math.random()*PALETTE.length)],
});

// ── Données statiques ─────────────────────────────────────────
const STATS = [
  { value:"500+", label:"Ménages analysés",       icon:"◎" },
  { value:"2",    label:"Classes détectées",       icon:"◈" },
  { value:"13",   label:"Variables socio-éco",    icon:"⬡" },
  { value:"LDA",  label:"Modèle discriminant",    icon:"✦" },
];

const FEATURES = [
  { icon:"◈", color:"#6c8fff", title:"Classification LDA",
    desc:"Analyse Discriminante Linéaire pour identifier les ménages vulnérables avec précision statistique." },
  { icon:"◉", color:"#22c55e", title:"EDA Interactif",
    desc:"Explorez boxplots, distributions et matrice de corrélation directement depuis le dataset." },
  { icon:"⊕", color:"#f59e0b", title:"Carte Madagascar",
    desc:"Distribution géographique urbaine/rurale avec détection automatique par distance aux centres." },
  { icon:"≡", color:"#a78bfa", title:"Import CSV Batch",
    desc:"Classifiez des centaines de ménages en une opération et exportez les résultats enrichis." },
];

// ─────────────────────────────────────────────────────────────
const Landing: React.FC<LandingPageProps> = ({ onStart, isAuthenticated }) => {
  const [pts,      setPts]     = useState<Particle[]>(() =>
    Array.from({ length: 52 }, (_, i) => mkParticle(i))
  );
  const [mouse,    setMouse]   = useState({ x: 50, y: 50 });
  const [visible,  setVisible] = useState(false);
  const raf = useRef<number>(0);

  // Entrée progressive
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Particules animées
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 16; last = now;
      setPts(prev => prev.map(p => {
        let nx = p.x + p.speedX * dt;
        let ny = p.y + p.speedY * dt;
        const sx = (nx<0||nx>100) ? -p.speedX : p.speedX;
        const sy = (ny<0||ny>100) ? -p.speedY : p.speedY;
        nx = Math.max(0, Math.min(100, nx));
        ny = Math.max(0, Math.min(100, ny));
        return { ...p, x:nx, y:ny, speedX:sx, speedY:sy };
      }));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const onMove = (e: React.MouseEvent) => setMouse({
    x: (e.clientX / window.innerWidth)  * 100,
    y: (e.clientY / window.innerHeight) * 100,
  });

  return (
    <div className="lp-root" onMouseMove={onMove}>

      {/* ─── FOND ───────────────────────────────────────────── */}
      <div className="lp-bg">
        <div className="lp-orb lp-orb1" style={{
          transform:`translate(${(mouse.x-50)*0.14}px,${(mouse.y-50)*0.14}px)`}} />
        <div className="lp-orb lp-orb2" style={{
          transform:`translate(${(mouse.x-50)*-0.09}px,${(mouse.y-50)*-0.09}px)`}} />
        <div className="lp-orb lp-orb3" style={{
          transform:`translate(${(mouse.x-50)*0.06}px,${(mouse.y-50)*0.07}px)`}} />
        <div className="lp-grid" />
        <svg className="lp-particles" viewBox="0 0 100 100" preserveAspectRatio="none">
          {pts.map(p => (
            <circle key={p.id} cx={p.x} cy={p.y} r={p.size*0.14}
              fill={p.color} opacity={p.opacity}/>
          ))}
        </svg>
      </div>

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className={`lp-header ${visible?"lp-in":""}`} style={{animationDelay:"0ms"}}>
        <div className="lp-logo">
          <div className="lp-logo-mark">◈</div>
          <span className="lp-logo-name">VulnéraScope</span>
        </div>
        <div className="lp-tag">
          <span className="lp-tag-dot" />
          Madagascar · Analyse LDA
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="lp-hero">

        <div className={`lp-eyebrow ${visible?"lp-in":""}`} style={{animationDelay:"100ms"}}>
          <span className="lp-eyebrow-dot" />
          Système d'aide à la décision socio-économique
        </div>

        <h1 className={`lp-title ${visible?"lp-in":""}`} style={{animationDelay:"180ms"}}>
          <span className="lp-tl">Identifier les</span>
          <span className="lp-tl lp-tl-accent">ménages</span>
          <span className="lp-tl lp-tl-accent2">vulnérables</span>
        </h1>

        <p className={`lp-sub ${visible?"lp-in":""}`} style={{animationDelay:"280ms"}}>
          Propulsé par l'Analyse Discriminante Linéaire, VulnéraScope
          classe et visualise les ménages à risque à Madagascar —
          pour des interventions sociales ciblées et efficaces.
        </p>

        {/* ─── BOUTON COMMENCER ─────────────────────────────── */}
        <div className={`lp-cta-row ${visible?"lp-in":""}`} style={{animationDelay:"360ms"}}>
          <button className="lp-btn-start"   onClick={onStart}
          >
            {isAuthenticated
             }
            <span className="lp-btn-label">Commencer l'analyse</span>
            <span className="lp-btn-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9h11M10 5l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="lp-btn-shimmer" />
          </button>
          <p className="lp-cta-hint">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0}}>
              <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="#525a72" strokeWidth="1.2"/>
              <path d="M3.5 5V3.5a2.5 2.5 0 015 0V5" stroke="#525a72" strokeWidth="1.2"/>
            </svg>
            Accès sécurisé 
          </p>
        </div>

        {/* ─── STATS ────────────────────────────────────────── */}
        <div className={`lp-stats ${visible?"lp-in":""}`} style={{animationDelay:"460ms"}}>
          {STATS.map((s,i) => (
            <div key={i} className="lp-stat">
              <span className="lp-stat-icon">{s.icon}</span>
              <span className="lp-stat-val">{s.value}</span>
              <span className="lp-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section className={`lp-features ${visible?"lp-in":""}`} style={{animationDelay:"540ms"}}>
        <p className="lp-section-label">
          <span className="lp-section-line" />
          Modules disponibles
          <span className="lp-section-line" />
        </p>
        <div className="lp-feat-grid">
          {FEATURES.map((f,i) => (
            <div key={i} className="lp-feat-card"
              style={{"--fc":f.color} as React.CSSProperties}>
              <div className="lp-feat-icon-wrap">
                <span className="lp-feat-icon">{f.icon}</span>
                <div className="lp-feat-icon-glow" />
              </div>
              <h3 className="lp-feat-title">{f.title}</h3>
              <p className="lp-feat-desc">{f.desc}</p>
              <div className="lp-feat-bottom-line" />
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA BOTTOM ─────────────────────────────────────── */}
      <section className={`lp-bottom ${visible?"lp-in":""}`} style={{animationDelay:"620ms"}}>
        <div className="lp-bottom-card">
          <div className="lp-bottom-glow" />
          <h2 className="lp-bottom-title">
            Prêt à analyser votre premier ménage ?
          </h2>
          <p className="lp-bottom-sub">
            Connectez-vous pour accéder à l'ensemble des outils — classification,
            visualisation, carte et import en masse.
          </p>
          <button className="lp-btn-start lp-btn-lg"   onClick={onStart}
          >
            {isAuthenticated
              } 
           
            <span className="lp-btn-label">Commencer maintenant</span>
            <span className="lp-btn-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9h11M10 5l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="lp-btn-shimmer" />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="lp-footer">
        <p>VulnéraScope · Classification LDA · Madagascar · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Landing;