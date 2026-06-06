import { useState, useCallback } from "react";
import type {
  MenageInput,
  PredictionResult,
  HistoryEntry,
  StatsData
} from "../types";

import { predictVulnerabilite } from "../services/api";

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // ─────────────────────────────────────────────
  // PREDICTION
  // ─────────────────────────────────────────────
  const predict = useCallback(async (data: MenageInput) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prediction = await predictVulnerabilite(data);

      // sécurité API
      if (!prediction || typeof prediction !== "object") {
        throw new Error("Réponse API invalide");
      }

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

  // ─────────────────────────────────────────────
  // STATS (SAFE VERSION)
  // ─────────────────────────────────────────────
  const stats: StatsData = {
    total: history.length,

    faible: history.filter(
      (h) => h.result?.label === "faible"
    ).length,

    moderee: history.filter(
      (h) => h.result?.label === "modérée"
    ).length,

    elevee: history.filter(
      (h) => h.result?.label === "élevée"
    ).length,
  };

  // ─────────────────────────────────────────────
  // CLEAR HISTORY
  // ─────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // ─────────────────────────────────────────────
  // LOAD HISTORY (FROM BACKEND / SUPABASE)
  // ─────────────────────────────────────────────
  const loadHistory = useCallback((data: HistoryEntry[]) => {
    if (!Array.isArray(data)) {
      console.warn("Historique invalide");
      return;
    }

    setHistory(data);
  }, []);

  // ─────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────
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