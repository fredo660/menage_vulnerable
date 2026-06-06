import { useState, useCallback } from "react";
import type { MenageInput, PredictionResult, HistoryEntry, StatsData } from "../types";
import { predictVulnerabilite } from "../services/api";

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        id: crypto.randomUUID(),
        timestamp: new Date(),
        input: data,
        result: prediction,
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

  const safeHistory = history.filter(h => h?.result?.label);

  const stats: StatsData = {
    total: safeHistory.length,
    faible: safeHistory.filter((h) => h.result.label === "faible").length,
    moderee: safeHistory.filter((h) => h.result.label === "modérée").length,
    elevee: safeHistory.filter((h) => h.result.label === "élevée").length,
  };

  const clearHistory = useCallback(() => setHistory([]), []);

  const loadHistory = useCallback((data: HistoryEntry[]) => {
    const cleaned = (data || []).filter(h => h?.result?.label);
    setHistory(cleaned);
  }, []);

  return {
    loading,
    result,
    error,
    history,
    stats,
    predict,
    clearHistory,
    loadHistory
  };
}