import React, { useEffect, useState, useMemo } from "react";

const API = "http://localhost:8000/api";

// ── Centres urbains officiels Madagascar ──────────────────────
// Source: coordonnées GPS réelles des chefs-lieux de région
const URBAN_CENTERS = [
  { name:"Antananarivo",  lat:-18.9249, lng:47.5186, pop:"Capitale",        radius:40 },
  { name:"Toamasina",     lat:-18.1452, lng:49.4019, pop:"2e ville",        radius:25 },
  { name:"Antsirabe",     lat:-19.8659, lng:47.0333, pop:"Ville industrielle",radius:20},
  { name:"Fianarantsoa",  lat:-21.4527, lng:47.0857, pop:"Haute-Lands",     radius:20 },
  { name:"Mahajanga",     lat:-15.7167, lng:46.3167, pop:"Port Nord-Ouest", radius:22 },
  { name:"Toliara",       lat:-23.3568, lng:43.6917, pop:"Port Sud",        radius:18 },
  { name:"Antsiranana",   lat:-12.3481, lng:49.2958, pop:"Port Nord",       radius:18 },
  { name:"Nosy Be",       lat:-13.3167, lng:48.2833, pop:"Île touristique", radius:12 },
  { name:"Morondava",     lat:-20.2856, lng:44.2775, pop:"Côte Ouest",      radius:12 },
  { name:"Farafangana",   lat:-22.8219, lng:47.8261, pop:"Côte Est",        radius:10 },
  { name:"Mananjary",     lat:-21.2294, lng:48.3439, pop:"Côte Est",        radius:10 },
  { name:"Ambositra",     lat:-20.5333, lng:47.2333, pop:"Artisanat",       radius:10 },
  { name:"Sambava",       lat:-14.2667, lng:50.1667, pop:"Vanille",         radius:10 },
  { name:"Manakara",      lat:-22.1450, lng:48.0117, pop:"Côte Est",        radius:10 },
] as const;

interface Menage {
  id:number; lat:number; lng:number; ville:string;
  vulnerabilite:number; label:string; color:string;
  zone:string; revenu:number; taille:number;
}
interface GeoStats { total:number; urbain:number; rural:number; faible:number; moderee:number; elevee:number; }

// ── Projection Mercator → SVG ─────────────────────────────────
const LAT_MIN=-25.7, LAT_MAX=-11.8, LNG_MIN=43.1, LNG_MAX=50.6;
const VW=540, VH=700;

const project = (lng:number, lat:number):[number,number] => [
  ((lng-LNG_MIN)/(LNG_MAX-LNG_MIN))*VW,
  ((LAT_MAX-lat)/(LAT_MAX-LAT_MIN))*VH,
];

// ── Distance Haversine (km) ───────────────────────────────────
const haversine = (lat1:number, lng1:number, lat2:number, lng2:number):number => {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

// ── Retourne la ville la plus proche et si urbain ─────────────
const getNearestCity = (lat:number, lng:number):{city:typeof URBAN_CENTERS[number]; dist:number; isUrban:boolean} => {
  let nearest: typeof URBAN_CENTERS[number] = URBAN_CENTERS[0];
let minDist = Infinity;
  for (const c of URBAN_CENTERS) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (d < minDist) { minDist=d; nearest=c; }
  }
  return { city:nearest, dist:minDist, isUrban: minDist <= nearest.radius };
};

// ── Silhouette simplifiée Madagascar (côte réelle approximée) ─
const MDG_OUTLINE = [
  [47.8,-12.2],[48.2,-12.0],[49.0,-12.4],[49.5,-13.0],[50.0,-13.5],
  [50.3,-14.2],[50.4,-15.0],[50.2,-15.8],[50.5,-16.5],[50.4,-17.3],
  [50.5,-18.0],[49.9,-18.8],[49.2,-19.5],[48.5,-20.1],[47.8,-20.5],
  [48.0,-21.2],[47.9,-21.8],[47.5,-22.2],[47.3,-23.0],[46.5,-23.5],
  [45.8,-24.0],[44.8,-24.5],[44.0,-24.3],[43.5,-23.8],[43.3,-23.0],
  [43.5,-22.2],[43.8,-21.5],[44.0,-20.8],[43.8,-20.2],[44.1,-19.5],
  [44.2,-18.8],[43.9,-18.2],[44.1,-17.5],[44.3,-16.8],[44.1,-16.0],
  [44.4,-15.3],[45.0,-14.5],[45.8,-14.0],[46.5,-13.5],[46.9,-13.0],
  [47.3,-12.5],[47.8,-12.2],
].map(([lng,lat]) => project(lng,lat).join(",")).join(" ");

type FilterType = "all"|"0"|"1"|"2";

const GeoPage: React.FC = () => {
  const [menages,   setMenages]   = useState<Menage[]>([]);
  const [stats,     setStats]     = useState<GeoStats|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string|null>(null);
  const [hovered,   setHovered]   = useState<Menage|null>(null);
  const [filter,    setFilter]    = useState<FilterType>("all");
  const [mousePos,  setMousePos]  = useState({x:0,y:0});
  const [zoneFilter,setZoneFilter]= useState<"all"|"urbain"|"rural">("all");

  useEffect(() => {
    fetch(`${API}/geo/menages?sample=300`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setMenages(data.menages || []);
        setStats(data.stats || null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Enrichir chaque ménage avec ville+zone détectées ────────
  const enriched = useMemo(() =>
    menages.map(m => {
      const { city, dist, isUrban } = getNearestCity(m.lat, m.lng);
      return { ...m, detectedCity: city.name, nearestDist: dist, isUrban };
    }),
  [menages]);

  // ── Stats par ville pour les bulles d'indicateur ────────────
  const cityStats = useMemo(() => {
    const map: Record<string, { total:number; elevee:number; lat:number; lng:number }> = {};
    URBAN_CENTERS.forEach(c => { map[c.name]={ total:0, elevee:0, lat:c.lat, lng:c.lng }; });
    enriched.forEach(m => {
      if (map[m.detectedCity]) {
        map[m.detectedCity].total++;
        if (m.vulnerabilite===2) map[m.detectedCity].elevee++;
      }
    });
    return map;
  }, [enriched]);

  // ── Filtrage ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = enriched;
    if (filter !== "all") r = r.filter(m => m.vulnerabilite === parseInt(filter));
    if (zoneFilter === "urbain") r = r.filter(m => m.isUrban);
    if (zoneFilter === "rural")  r = r.filter(m => !m.isUrban);
    return r;
  }, [enriched, filter, zoneFilter]);

  // Compteurs dynamiques pour les boutons de filtre zone
  const urbainCount = enriched.filter(m =>  m.isUrban).length;
  const ruralCount  = enriched.filter(m => !m.isUrban).length;

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner-large">
        <div className="spinner-ring r1"/><div className="spinner-ring r2"/><div className="spinner-ring r3"/>
      </div>
      <p className="loading-text">Chargement de la carte...</p>
    </div>
  );

  if (error) return (
    <div className="error-box">
      <span className="error-icon">⚠</span>
      <div>
        <p className="error-title">Erreur chargement géo</p>
        <p className="error-msg">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="geo-page">

      {/* ── Barre de stats ──────────────────────────────────── */}
      {stats && (
        <div className="geo-stats-bar">
          {[
            { label:"Total",   val:stats.total,   color:"#8b92a8" },
            { label:"Faible",  val:stats.faible,  color:"#22c55e" },
            { label:"Modérée", val:stats.moderee, color:"#f59e0b" },
            { label:"Élevée",  val:stats.elevee,  color:"#ef4444" },
            { label:"Urbain",  val:urbainCount,   color:"#6c8fff" },
            { label:"Rural",   val:ruralCount,    color:"#a78bfa" },
          ].map(s => (
            <div key={s.label} className="geo-stat">
              <span className="geo-stat-val"  style={{ color:s.color }}>{s.val}</span>
              <span className="geo-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="geo-main">

        {/* ── Carte SVG ───────────────────────────────────────── */}
        <div
          className="map-container"
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setMousePos({ x:e.clientX-r.left, y:e.clientY-r.top });
          }}
        >
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ width:"100%", height:"auto", display:"block", background:"#080e1a" }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="1.2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Gradient fond océan */}
              <radialGradient id="oceanBg" cx="40%" cy="50%" r="70%">
                <stop offset="0%"   stopColor="#0c1628"/>
                <stop offset="100%" stopColor="#060c18"/>
              </radialGradient>
            </defs>

            {/* Fond océan */}
            <rect width={VW} height={VH} fill="url(#oceanBg)"/>

            {/* Lignes de latitude indicatives */}
            {[-15,-18,-21,-24].map(lat => {
              const [,y] = project(46, lat);
              return (
                <g key={lat}>
                  <line x1={0} y1={y} x2={VW} y2={y} stroke="rgba(108,143,255,0.04)" strokeDasharray="4,8"/>
                  <text x={4} y={y-3} fill="rgba(108,143,255,0.2)" fontSize={7} fontFamily="IBM Plex Mono">{lat}°</text>
                </g>
              );
            })}

            {/* Silhouette Madagascar */}
            <polygon
              points={MDG_OUTLINE}
              fill="#13213a"
              stroke="rgba(108,143,255,0.35)"
              strokeWidth={1.2}
            />

            {/* Zones d'influence des villes (cercles semi-transparents) */}
            {URBAN_CENTERS.map(c => {
              const [cx,cy] = project(c.lng, c.lat);
              // Convertir radius (km) en pixels approximatif
              const pxRadius = (c.radius / 111) * (VH / (LAT_MAX - LAT_MIN)) * 0.9;
              return (
                <circle
                  key={c.name}
                  cx={cx} cy={cy}
                  r={pxRadius}
                  fill="rgba(108,143,255,0.04)"
                  stroke="rgba(108,143,255,0.12)"
                  strokeWidth={0.8}
                  strokeDasharray="3,4"
                />
              );
            })}

            {/* Labels des villes */}
            {URBAN_CENTERS.map(c => {
              const [cx,cy] = project(c.lng, c.lat);
              const cs = cityStats[c.name];
              const ratio = cs && cs.total > 0 ? cs.elevee/cs.total : 0;
              const dotColor = ratio>0.5 ? "#ef4444" : ratio>0.25 ? "#f59e0b" : "#22c55e";
              return (
                <g key={c.name}>
                  <circle cx={cx} cy={cy} r={3.5} fill={dotColor} opacity={0.7} filter="url(#softGlow)"/>
                  <text x={cx+6} y={cy+3} fill="rgba(255,255,255,0.35)" fontSize={8} fontFamily="IBM Plex Mono">
                    {c.name}
                  </text>
                </g>
              );
            })}

            {/* Marqueurs ménages */}
            {filtered.map(m => {
              const [cx,cy] = project(m.lng, m.lat);
              if (cx<0||cx>VW||cy<0||cy>VH) return null;
              const isHov = hovered?.id===m.id;
              const r = isHov ? 7.5 : m.isUrban ? 4.5 : 3.5;
              // Forme: rond = urbain, losange = rural
              if (!m.isUrban && !isHov) {
                const s = r;
                return (
                  <polygon
                    key={m.id}
                    points={`${cx},${cy-s} ${cx+s},${cy} ${cx},${cy+s} ${cx-s},${cy}`}
                    fill={m.color}
                    fillOpacity={0.65}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={0.7}
                    style={{ cursor:"pointer", transition:"all 0.12s" }}
                    onMouseEnter={()=>setHovered(m)}
                    onMouseLeave={()=>setHovered(null)}
                  />
                );
              }
              return (
                <circle
                  key={m.id}
                  cx={cx} cy={cy} r={r}
                  fill={m.color}
                  fillOpacity={isHov ? 1 : 0.72}
                  stroke={isHov ? "#fff" : "rgba(0,0,0,0.45)"}
                  strokeWidth={isHov ? 1.5 : 0.8}
                  filter={isHov ? "url(#glow)" : undefined}
                  style={{ cursor:"pointer", transition:"all 0.12s" }}
                  onMouseEnter={()=>setHovered(m)}
                  onMouseLeave={()=>setHovered(null)}
                />
              );
            })}

            {/* Compas */}
            <g transform={`translate(${VW-30},28)`}>
              <circle r={15} fill="rgba(13,15,20,0.85)" stroke="rgba(108,143,255,0.2)"/>
              <text textAnchor="middle" y={-5} fill="#6c8fff" fontSize={8} fontFamily="IBM Plex Mono" fontWeight="bold">N</text>
              <line x1={0} y1={-11} x2={0} y2={-3} stroke="#6c8fff" strokeWidth={1.5}/>
              <line x1={0} y1={3}   x2={0} y2={11} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
            </g>

            {/* Échelle */}
            <g transform="translate(14,690)">
              <rect x={0} y={-6} width={56} height={10} rx={3} fill="rgba(13,15,20,0.7)"/>
              <line x1={2} y1={0} x2={54} y2={0} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}/>
              <line x1={2}  y1={-3} x2={2}  y2={3} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
              <line x1={54} y1={-3} x2={54} y2={3} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
              <text x={28} y={-9} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="IBM Plex Mono">~200 km</text>
            </g>
          </svg>

          {/* Tooltip flottant */}
          {hovered && (
            <div className="map-tooltip" style={{ left:mousePos.x+18, top:mousePos.y-14 }}>
              <div className="tooltip-header" style={{ borderColor:hovered.color }}>
                <span className="tooltip-dot"   style={{ background:hovered.color }}/>
                <span className="tooltip-label" style={{ color:hovered.color }}>{hovered.label}</span>
                <span className="tooltip-zone">
                  {(enriched.find(m=>m.id===hovered.id)?.isUrban) ? "🏙 Urbain" : "🌿 Rural"}
                </span>
              </div>
              <div className="tooltip-body">
                {(() => {
                  const em = enriched.find(m=>m.id===hovered.id);
                  return (
                    <>
                      <div><span>Ville proche</span><span>{em?.detectedCity ?? hovered.ville}</span></div>
                      <div><span>Distance ville</span><span>{em ? `${em.nearestDist.toFixed(1)} km` : "—"}</span></div>
                      <div><span>Zone</span><span>{em?.isUrban ? "Urbaine" : "Rurale"}</span></div>
                      <div><span>Revenu</span><span>{hovered.revenu.toLocaleString("fr-MG")} Ar</span></div>
                      <div><span>Ménage</span><span>{hovered.taille} personnes</span></div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── Panneau latéral ─────────────────────────────────── */}
        <div className="geo-panel">

          {/* Filtres vulnérabilité */}
          <div className="chart-card">
            <h3 className="chart-title">Vulnérabilité</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              {([
                { val:"all", label:"Tous",    color:"#8b92a8", count:enriched.length },
                { val:"0",   label:"Faible",  color:"#22c55e", count:enriched.filter(m=>m.vulnerabilite===0).length },
                { val:"1",   label:"Modérée", color:"#f59e0b", count:enriched.filter(m=>m.vulnerabilite===1).length },
                { val:"2",   label:"Élevée",  color:"#ef4444", count:enriched.filter(m=>m.vulnerabilite===2).length },
              ] as const).map(f => (
                <button key={f.val} onClick={()=>setFilter(f.val)}
                  style={{
                    display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                    borderRadius:8, cursor:"pointer", transition:"all 0.2s",
                    background: filter===f.val ? "rgba(108,143,255,0.12)" : "transparent",
                    border: filter===f.val ? "1px solid rgba(108,143,255,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    color: filter===f.val ? "#e8eaf0" : "#8b92a8",
                    fontFamily:"Libre Franklin", fontSize:13,
                  }}>
                  <span style={{ width:9,height:9,borderRadius:"50%",background:f.color,flexShrink:0 }}/>
                  {f.label}
                  <span style={{ marginLeft:"auto", fontFamily:"IBM Plex Mono", fontSize:12, color:f.color }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtre zone urbain/rural — la fonctionnalité demandée */}
          <div className="chart-card">
            <h3 className="chart-title">Zone géographique</h3>
            <p style={{ fontSize:11, color:"#525a72", fontFamily:"IBM Plex Mono", marginBottom:10, lineHeight:1.5 }}>
              Détection automatique par distance aux centres urbains de Madagascar
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {([
                { val:"all",    label:"Toutes les zones",    color:"#8b92a8", count:enriched.length,  icon:"◎" },
                { val:"urbain", label:"Zone urbaine",        color:"#6c8fff", count:urbainCount,       icon:"🏙" },
                { val:"rural",  label:"Zone rurale",         color:"#a78bfa", count:ruralCount,        icon:"🌿" },
              ] as const).map(f => (
                <button key={f.val} onClick={()=>setZoneFilter(f.val)}
                  style={{
                    display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                    borderRadius:8, cursor:"pointer", transition:"all 0.2s",
                    background: zoneFilter===f.val ? "rgba(108,143,255,0.12)" : "transparent",
                    border: zoneFilter===f.val ? "1px solid rgba(108,143,255,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    color: zoneFilter===f.val ? "#e8eaf0" : "#8b92a8",
                    fontFamily:"Libre Franklin", fontSize:13,
                  }}>
                  <span style={{ fontSize:14 }}>{f.icon}</span>
                  {f.label}
                  <span style={{ marginLeft:"auto", fontFamily:"IBM Plex Mono", fontSize:12, color:f.color }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Mini info sur la détection */}
            <div style={{ marginTop:12, padding:"10px 12px", background:"rgba(108,143,255,0.06)", borderRadius:8, border:"1px solid rgba(108,143,255,0.12)" }}>
              <p style={{ fontSize:10, color:"#8b92a8", fontFamily:"IBM Plex Mono", lineHeight:1.6 }}>
                <strong style={{ color:"#6c8fff" }}>⬤</strong> Rond = zone urbaine<br/>
                <strong style={{ color:"#a78bfa" }}>◆</strong> Losange = zone rurale<br/>
                <span style={{ color:"#525a72" }}>Seuil: distance au centre-ville le plus proche</span>
              </p>
            </div>
          </div>

          {/* Légende */}
          <div className="chart-card">
            <h3 className="chart-title">Légende</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
              {[
                { color:"#22c55e", label:"Faible vulnérabilité" },
                { color:"#f59e0b", label:"Modérée vulnérabilité" },
                { color:"#ef4444", label:"Élevée vulnérabilité" },
              ].map(l => (
                <div key={l.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <svg width={12} height={12}><circle cx={6} cy={6} r={5} fill={l.color} opacity={0.8}/></svg>
                  <span style={{ fontSize:12, color:"#8b92a8" }}>{l.label}</span>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:6, borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:4 }}>
                <svg width={12} height={12}><circle cx={6} cy={6} r={4} fill="rgba(108,143,255,0.4)" stroke="rgba(108,143,255,0.3)" strokeWidth={1} strokeDasharray="2,2"/></svg>
                <span style={{ fontSize:11, color:"#525a72" }}>Zone d'influence urbaine</span>
              </div>
            </div>
          </div>

          {/* Détail ménage survolé */}
          {hovered && (() => {
            const em = enriched.find(m=>m.id===hovered.id);
            return (
              <div className="chart-card" style={{ borderColor:hovered.color+"44" }}>
                <h3 className="chart-title" style={{ color:hovered.color }}>Ménage sélectionné</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:7, marginTop:8 }}>
                  {([
                    ["Vulnérabilité", hovered.label],
                    ["Zone",          em?.isUrban ? "🏙 Urbaine" : "🌿 Rurale"],
                    ["Ville proche",  em?.detectedCity ?? "—"],
                    ["Dist. centre",  em ? `${em.nearestDist.toFixed(1)} km` : "—"],
                    ["Revenu",        `${hovered.revenu.toLocaleString("fr-MG")} Ar`],
                    ["Taille ménage", `${hovered.taille} personnes`],
                  ] as [string,string][]).map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:13 }}>
                      <span style={{ color:"#525a72", fontFamily:"IBM Plex Mono", fontSize:11 }}>{k}</span>
                      <span style={{ color:"#e8eaf0", fontWeight:600, textAlign:"right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default GeoPage;