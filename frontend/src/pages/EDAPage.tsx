import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const API =
  `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;

// ── Types ─────────────────────────────────────────────────────
interface DistItem { classe:number; label:string; count:number; pourcentage:number; color:string; }
interface BoxItem  { classe:string; min:number; q1:number; median:number; q3:number; max:number; mean:number; }
interface CorrCell { x:number; y:number; xLabel:string; yLabel:string; value:number; }
interface Summary  {
  total_menages:number; revenu_moyen:number; taille_moyenne:number;
  pct_urbain:number; pct_acces_eau:number; pct_electricite:number;
  pct_alimentation:number; distance_sante_moy:number;
}

// ── Tooltip recharts ──────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1c2132", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px" }}>
      <p style={{ color:"#8b92a8", fontSize:11, marginBottom:4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color:p.color||"#e8eaf0", fontSize:13, fontFamily:"IBM Plex Mono" }}>
          {p.name}: <strong>{typeof p.value==="number" ? p.value.toLocaleString("fr-FR") : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Boxplot SVG ───────────────────────────────────────────────
const BoxplotChart: React.FC<{ data: BoxItem[]; title: string; unit?: string }> = ({ data, title, unit="" }) => {
  // Protection: data vide ou undefined
  if (!data || data.length === 0) return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <p style={{ color:"#525a72", fontFamily:"IBM Plex Mono", fontSize:12 }}>Données indisponibles</p>
      </div>
    </div>
  );

  const allVals = data.flatMap(d => [d.min, d.max]).filter(v => isFinite(v));
  if (allVals.length === 0) return null;

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = (maxV - minV) || 1;

  const W=600, H=200, PAD=60, BAR_W=60;
  const COLORS = ["#22c55e","#f59e0b","#ef4444"];
  const toX = (i:number) => PAD + i*((W-PAD*2)/data.length) + (W-PAD*2)/data.length/2;
  const toY = (v:number) => H-20-((v-minV)/range)*(H-40);

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto" }}>
        {[0,0.25,0.5,0.75,1].map(t => {
          const y   = H-20-t*(H-40);
          const val = minV+t*range;
          return (
            <g key={t}>
              <line x1={PAD-10} y1={y} x2={W-PAD+10} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD-14} y={y+4} textAnchor="end" fill="#525a72" fontSize={9} fontFamily="IBM Plex Mono">
                {val>=1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx=toX(i), hw=BAR_W/2, color=COLORS[i]||"#6c8fff";
          const yMin=toY(d.min), yMax=toY(d.max);
          const yQ1=toY(d.q1), yQ3=toY(d.q3);
          const yMed=toY(d.median), yMean=toY(d.mean);
          return (
            <g key={i}>
              <line x1={cx} y1={yMin} x2={cx} y2={yQ1} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.6}/>
              <line x1={cx} y1={yQ3} x2={cx} y2={yMax} stroke={color} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.6}/>
              <line x1={cx-hw*.5} y1={yMin} x2={cx+hw*.5} y2={yMin} stroke={color} strokeWidth={1.5}/>
              <line x1={cx-hw*.5} y1={yMax} x2={cx+hw*.5} y2={yMax} stroke={color} strokeWidth={1.5}/>
              <rect x={cx-hw} y={yQ3} width={BAR_W} height={Math.abs(yQ1-yQ3)} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} rx={3}/>
              <line x1={cx-hw} y1={yMed} x2={cx+hw} y2={yMed} stroke={color} strokeWidth={2.5}/>
              <circle cx={cx} cy={yMean} r={3.5} fill={color} opacity={0.8}/>
              <text x={cx} y={H-4} textAnchor="middle" fill="#8b92a8" fontSize={11} fontFamily="Syne" fontWeight={600}>{d.classe}</text>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize:11, color:"#525a72", textAlign:"center", fontFamily:"IBM Plex Mono", marginTop:4 }}>
        ▬ Médiane · ● Moyenne · Boîte = Q1–Q3 {unit && `· Unité: ${unit}`}
      </p>
    </div>
  );
};

// ── Heatmap corrélation ───────────────────────────────────────
const CorrelationHeatmap: React.FC<{ cells:CorrCell[]; labels:string[] }> = ({ cells, labels }) => {
  const [hovered, setHovered] = useState<CorrCell|null>(null);
  if (!cells?.length || !labels?.length) return null;

  const n=labels.length, CELL=36, LABEL_W=70, LABEL_H=70;
  const W=LABEL_W+n*CELL, H=LABEL_H+n*CELL;

  const toColor = (v:number) => {
    const abs = Math.abs(v);
    return v>0
      ? `rgba(108,143,255,${(abs*0.85).toFixed(2)})`
      : `rgba(239,68,68,${(abs*0.85).toFixed(2)})`;
  };

  return (
    <div className="chart-card chart-card-wide">
      <h3 className="chart-title">Matrice de Corrélation</h3>
      {hovered && (
        <div style={{ fontFamily:"IBM Plex Mono", fontSize:12, color:"#8b92a8", marginBottom:8 }}>
          <span style={{ color:"#e8eaf0" }}>{hovered.yLabel}</span> × <span style={{ color:"#e8eaf0" }}>{hovered.xLabel}</span>
          {" → "}
          <span style={{ color:hovered.value>0?"#6c8fff":"#ef4444", fontWeight:700 }}>{hovered.value.toFixed(3)}</span>
        </div>
      )}
      <div style={{ overflowX:"auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:Math.max(W,400), height:"auto", display:"block" }}>
          {labels.map((l,i) => (
            <text key={`xl${i}`} x={LABEL_W+i*CELL+CELL/2} y={LABEL_H-6}
              textAnchor="end" fill="#8b92a8" fontSize={8} fontFamily="IBM Plex Mono"
              transform={`rotate(-45,${LABEL_W+i*CELL+CELL/2},${LABEL_H-6})`}>{l}</text>
          ))}
          {labels.map((l,i) => (
            <text key={`yl${i}`} x={LABEL_W-6} y={LABEL_H+i*CELL+CELL/2+3}
              textAnchor="end" fill="#8b92a8" fontSize={8} fontFamily="IBM Plex Mono">{l}</text>
          ))}
          {cells.map((c,i) => (
            <g key={i} onMouseEnter={()=>setHovered(c)} onMouseLeave={()=>setHovered(null)} style={{ cursor:"pointer" }}>
              <rect x={LABEL_W+c.x*CELL} y={LABEL_H+c.y*CELL} width={CELL-1} height={CELL-1} fill={toColor(c.value)} rx={2}/>
              {Math.abs(c.value)>0.45 && (
                <text x={LABEL_W+c.x*CELL+CELL/2} y={LABEL_H+c.y*CELL+CELL/2+3}
                  textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={7} fontFamily="IBM Plex Mono">
                  {c.value.toFixed(2)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:12, justifyContent:"center" }}>
        <div style={{ width:100, height:8, borderRadius:4, background:"linear-gradient(to right,rgba(239,68,68,0.8),rgba(255,255,255,0.05),rgba(108,143,255,0.8))" }}/>
        <span style={{ fontSize:10, color:"#525a72", fontFamily:"IBM Plex Mono" }}>-1 → 0 → +1</span>
      </div>
    </div>
  );
};

// ── KPI Cards ─────────────────────────────────────────────────
const SummaryCards: React.FC<{ summary:Summary }> = ({ summary:s }) => {
  const kpis = [
    { label:"Ménages analysés",    value:s.total_menages.toLocaleString("fr-FR"), unit:"" },
    { label:"Revenu mensuel moy.", value:s.revenu_moyen.toLocaleString("fr-FR"),  unit:"Ar" },
    { label:"Taille moy. ménage",  value:s.taille_moyenne.toFixed(1),             unit:"pers." },
    { label:"Zone urbaine",        value:s.pct_urbain.toFixed(1),                 unit:"%" },
    { label:"Accès eau potable",   value:s.pct_acces_eau.toFixed(1),              unit:"%" },
    { label:"Électricité",         value:s.pct_electricite.toFixed(1),            unit:"%" },
    { label:"Alimentation suff.",  value:s.pct_alimentation.toFixed(1),           unit:"%" },
    { label:"Dist. santé moy.",    value:s.distance_sante_moy.toFixed(1),         unit:"km" },
  ];
  return (
    <div className="kpi-grid">
      {kpis.map((k,i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-value">{k.value}<span className="kpi-unit"> {k.unit}</span></div>
          <div className="kpi-label">{k.label}</div>
        </div>
      ))}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
const EDAPage: React.FC = () => {
  const [distribution, setDistribution] = useState<DistItem[]>([]);
  const [boxRevenu,    setBoxRevenu]    = useState<BoxItem[]>([]);
  const [boxTaille,    setBoxTaille]    = useState<BoxItem[]>([]);
  const [boxDepenses,  setBoxDepenses]  = useState<BoxItem[]>([]);
  const [corrCells,    setCorrCells]    = useState<CorrCell[]>([]);
  const [corrLabels,   setCorrLabels]   = useState<string[]>([]);
  const [summary,      setSummary]      = useState<Summary|null>(null);
  const [loading,      setLoading]      = useState(true);
  const [errors,       setErrors]       = useState<Record<string,string>>({});

  useEffect(() => {
    const safe = async (url: string, label: string) => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch(e) {
        setErrors(prev => ({ ...prev, [label]: (e as Error).message }));
        return null;
      }
    };

    Promise.all([
      safe(`${API}/analytics/distribution`, "distribution"),
      safe(`${API}/analytics/boxplot`,      "boxplot"),
      safe(`${API}/analytics/correlation`,  "correlation"),
      safe(`${API}/analytics/summary`,      "summary"),
    ]).then(([dist, box, corr, sum]) => {
      if (dist?.data) setDistribution(dist.data);
      if (box) {
        setBoxRevenu(  Array.isArray(box.revenu)   ? box.revenu   : []);
        setBoxTaille(  Array.isArray(box.taille)   ? box.taille   : []);
        setBoxDepenses(Array.isArray(box.depenses) ? box.depenses : []);
      }
      if (corr?.cells)  setCorrCells(corr.cells);
      if (corr?.labels) setCorrLabels(corr.labels);
      if (sum) setSummary(sum);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner-large">
        <div className="spinner-ring r1"/><div className="spinner-ring r2"/><div className="spinner-ring r3"/>
      </div>
      <p className="loading-text">Chargement des données EDA...</p>
    </div>
  );

  return (
    <div className="eda-page">
      {Object.keys(errors).length > 0 && (
        <div className="error-box">
          <span className="error-icon">⚠</span>
          <div>
            <p className="error-title">Certains graphiques indisponibles</p>
            {Object.entries(errors).map(([k,v]) => (
              <p key={k} className="error-msg">{k}: {v}</p>
            ))}
            <p className="error-hint">Vérifiez que l'API FastAPI est démarrée et que le dataset est présent.</p>
          </div>
        </div>
      )}

      {summary && <SummaryCards summary={summary} />}

      {distribution.length > 0 && (
        <div className="chart-card">
          <h3 className="chart-title">Distribution des Classes de Vulnérabilité</h3>
          <p className="chart-subtitle">Nombre de ménages par niveau dans le dataset</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribution} barSize={64}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="label" tick={{ fill:"#8b92a8", fontSize:13, fontFamily:"Syne", fontWeight:600 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#525a72", fontSize:11, fontFamily:"IBM Plex Mono" }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" name="Ménages" radius={[6,6,0,0]}>
                {distribution.map((d,i) => <Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:10 }}>
            {distribution.map(d => (
              <span key={d.classe} style={{ fontFamily:"IBM Plex Mono", fontSize:12, color:d.color }}>
                {d.label}: {d.pourcentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="charts-row">
        <BoxplotChart data={boxRevenu}  title="Revenu Mensuel par Vulnérabilité"   unit="Ar"/>
        <BoxplotChart data={boxTaille}  title="Taille du Ménage par Vulnérabilité" unit="pers."/>
      </div>
      <BoxplotChart data={boxDepenses} title="Dépenses Mensuelles par Vulnérabilité" unit="Ar"/>

      {corrCells.length > 0 && <CorrelationHeatmap cells={corrCells} labels={corrLabels}/>}
    </div>
  );
};

export default EDAPage;