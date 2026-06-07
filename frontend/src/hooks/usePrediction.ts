import { useState, useCallback } from "react";
import type { MenageInput, PredictionResult, HistoryEntry, StatsData } from "../types";
import { predictVulnerabilite } from "../services/api";

// Mapping identique à api.ts
const VULNERABILITY_MAP: Record<number, { label: string; color: string; icon: string; description: string }> = {
  0: {
    label: "faible",
    color: "#22c55e",
    icon: "✦",
    description: "Ce ménage présente un niveau de vulnérabilité faible. Les conditions de vie sont globalement satisfaisantes.",
  },
  1: {
    label: "élevée",
    color: "#ef4444",
    icon: "▲",
    description: "Ce ménage est hautement vulnérable. Une intervention urgente et ciblée est recommandée.",
  },
};

// Convertit une ligne Supabase en HistoryEntry
function supabaseRowToEntry(row: Record<string, unknown>): HistoryEntry | null {
  try {
    const predNum = Number(row.prediction ?? 1);
    const meta = VULNERABILITY_MAP[predNum] ?? VULNERABILITY_MAP[1];

    const result: PredictionResult = {
      prediction:  predNum,
      label:       meta.label as never,
      color:       meta.color,
      icon:        meta.icon,
      description: meta.description,
      score:       Number(row.probabilite ?? 0),
    };

    const input: MenageInput = {
      revenu_mensuel:          Number(row.revenu_mensuel ?? 0),
      taille_menage:           Number(row.taille_menage ?? 0),
      nb_enfants:              Number(row.nb_enfants ?? 0),
      acces_eau:               Number(row.acces_eau ?? 0) as 0 | 1,
      electricite:             Number(row.electricite ?? 0) as 0 | 1,
      type_logement:           Number(row.type_logement ?? 0) as 0 | 1 | 2,
      emploi_chef:             Number(row.emploi_chef ?? 0) as 0 | 1 | 2,
      niveau_etude:            Number(row.niveau_etude ?? 0) as 0 | 1 | 2 | 3,
      distance_centre_sante_km: Number(row.distance_centre_sante_km ?? 0),
      zone:                    Number(row.zone ?? 0) as 0 | 1,
      alimentation_suffisante: Number(row.alimentation_suffisante ?? 0) as 0 | 1,
      acces_internet:          Number(row.acces_internet ?? 0) as 0 | 1,
      depenses_mensuelles:     Number(row.depenses_mensuelles ?? 0),
    };

    return {
      id:        String(row.id ?? crypto.randomUUID()),
      timestamp: new Date(String(row.created_at ?? new Date())),
      input,
      result,
    };
  } catch {
    return null;
  }
}

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<PredictionResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const predict = useCallback(async (data: MenageInput) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prediction = await predictVulnerabilite(data);
      if (!prediction) throw new Error("Réponse API invalide");

      setResult(prediction);

      const entry: HistoryEntry = {
        id:        crypto.randomUUID(),
        timestamp: new Date(),
        input:     data,
        result:    prediction,
      };

      setHistory((prev) => [entry, ...prev].slice(0, 20));
      return prediction;

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Charge l'historique depuis Supabase (données brutes)
  const loadHistory = useCallback((data: Record<string, unknown>[]) => {
    const entries = (data || [])
      .map(supabaseRowToEntry)
      .filter((e): e is HistoryEntry => e !== null);
    setHistory(entries);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const safeHistory = history.filter(h => h?.result?.label);

  const stats: StatsData = {
    total:   safeHistory.length,
    faible:  safeHistory.filter(h => h.result.label === "faible").length,
    moderee: 0,
    elevee:  safeHistory.filter(h => h.result.label === "élevée").length,
  };

  return {
    loading,
    result,
    error,
    history,
    stats,
    predict,
    clearHistory,
    loadHistory,
  };
}