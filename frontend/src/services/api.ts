import type { MenageInput, PredictionResult, VulnerabiliteLabel } from "../types";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

const VULNERABILITY_MAP: Record<number, { label: VulnerabiliteLabel; color: string; icon: string; description: string }> = {
  0: {
    label: "faible",
    color: "#22c55e",
    icon: "✦",
    description: "Ce ménage présente un niveau de vulnérabilité faible. Les conditions de vie sont globalement satisfaisantes.",
  },
  1: {
    label: "modérée",
    color: "#f59e0b",
    icon: "◈",
    description: "Ce ménage présente une vulnérabilité modérée. Certains facteurs de risque nécessitent une attention particulière.",
  },
  2: {
    label: "élevée",
    color: "#ef4444",
    icon: "▲",
    description: "Ce ménage est hautement vulnérable. Une intervention urgente et ciblée est recommandée.",
  },
};

export async function predictVulnerabilite(data: MenageInput): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Erreur de prédiction");
  }

  const json = await response.json();
  const predNum  = json.prediction as number;
  const raw = json.probabilite;
  const score = Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : 0;
  const meta     = VULNERABILITY_MAP[predNum] ?? VULNERABILITY_MAP[1];
  const body = JSON.stringify(data);
console.log("Body envoyé:", body);  // ← voir exactement ce qui part
  console.log("Réponse API:", json); // ← vérifier que probabilite est bien là
  return {
    prediction: predNum,
    label:      meta.label,
    color:      meta.color,
    icon:       meta.icon,
    description: meta.description,
    score,                          // ← plus de valeur fixe
  };
}

export async function saveToSupabase(data: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_BASE}/api/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),

  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Erreur d'enregistrement");
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getHistory(userId: string) {
  const response = await fetch(
    `${API_BASE}/api/history/${userId}`
  );

  if (!response.ok) {
    throw new Error("Erreur chargement historique");
  }

  return response.json();
}