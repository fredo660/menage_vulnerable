"""
lda_projection.py — Version corrigée robuste (LDA binaire)
- protection dataset vide
- mapping robuste CSV
- suppression dropna destructif
- LDA stable (sklearn)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib, os, traceback

router = APIRouter()

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "..", "data", "dataset_menages_vulnerables.csv")
MODEL_DIR = os.path.join(BASE_DIR, "..", "ml", "models")


FEATURES = [
    "revenu_mensuel","taille_menage","nb_enfants","acces_eau",
    "electricite","type_logement","emploi_chef","niveau_etude",
    "distance_centre_sante_km","zone","alimentation_suffisante",
    "acces_internet","depenses_mensuelles",
]

LABELS = {0: "Non vulnérable", 1: "Vulnérable"}
COLORS = {0: "#22c55e", 1: "#ef4444"}


# =========================
# LOAD DATA (FIX COMPLET)
# =========================
def load_df() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, sep=";")

    # drop id inutile
    if "id_menage" in df.columns:
        df = df.drop(columns=["id_menage"])

    # normalisation texte
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].astype(str).str.strip().str.lower()

    # mapping binaire
    binary_map = {"oui": 1, "non": 0, "yes": 1, "no": 0, "1": 1, "0": 0}

    for col in ["acces_eau","electricite","alimentation_suffisante","acces_internet"]:
        if col in df.columns:
            df[col] = df[col].map(binary_map)

    # mapping zone
    if "zone" in df.columns:
        df["zone"] = df["zone"].map({"urbain": 1, "rural": 0})

    # mapping type logement
    if "type_logement" in df.columns:
        df["type_logement"] = df["type_logement"].map({
            "précaire": 0,
            "precaire": 0,
            "moyen": 1,
            "moderne": 2
        })

    # emploi chef
    if "emploi_chef" in df.columns:
        df["emploi_chef"] = df["emploi_chef"].map({
            "sans emploi": 0,
            "instable": 1,
            "stable": 2
        })

    # niveau étude
    if "niveau_etude" in df.columns:
        df["niveau_etude"] = df["niveau_etude"].map({
            "aucun": 0,
            "primaire": 1,
            "secondaire": 2,
            "universitaire": 3
        })

    # conversion numérique safe
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # ⚠️ FIX IMPORTANT (au lieu de dropna global destructif)
    df = df.dropna(subset=FEATURES + ["vulnerabilite"])

    df["vulnerabilite"] = df["vulnerabilite"].astype(int)

    return df


# =========================
# VISUAL 2D LDA
# =========================
def _scores_to_2d(scores_1d: np.ndarray, y: np.ndarray, seed: int = 42):
    rng = np.random.default_rng(seed)

    y_jitter = np.where(y == 0, -0.5, 0.5) + rng.normal(0, 0.18, len(y))

    return np.column_stack([scores_1d.ravel(), y_jitter])


# =========================
# INPUT MODEL
# =========================
class MenagePoint(BaseModel):
    revenu_mensuel: float
    taille_menage: int
    nb_enfants: int
    acces_eau: int
    electricite: int
    type_logement: int
    emploi_chef: int
    niveau_etude: int
    distance_centre_sante_km: float
    zone: int
    alimentation_suffisante: int
    acces_internet: int
    depenses_mensuelles: float


# =========================
# ENDPOINT PROJECTION
# =========================
@router.get("/lda/projection")
def get_lda_projection():
    try:
        model  = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
        scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))

        df = load_df()

        # 🔥 FIX CRITIQUE: dataset vide
        if df.shape[0] == 0:
            raise HTTPException(
                status_code=400,
                detail="Dataset vide après nettoyage → problème de mapping CSV"
            )

        sample = df.sample(n=min(500, len(df)), random_state=42)

        X = sample[FEATURES]
        y = sample["vulnerabilite"].values

        X_scaled = scaler.transform(X)
        scores_1d = model.transform(X_scaled)

        scores_2d = _scores_to_2d(scores_1d, y)

        points = [
            {
                "x": round(float(scores_2d[i, 0]), 4),
                "y": round(float(scores_2d[i, 1]), 4),
                "ld1": round(float(scores_1d[i, 0]), 4),
                "classe": int(y[i]),
                "label": LABELS.get(int(y[i])),
                "color": COLORS.get(int(y[i]))
            }
            for i in range(len(y))
        ]

        coef_vec = model.coef_[0]

        coefs = [
            {
                "feature": feat,
                "ld1": round(float(coef_vec[i]), 4),
                "importance": round(abs(float(coef_vec[i])), 4)
            }
            for i, feat in enumerate(FEATURES)
        ]

        # FIX intercept stable
        threshold = float(-model.intercept_[0] / coef_vec[0]) if coef_vec[0] != 0 else 0.0

        return {
            "points": points,
            "coefs": coefs,
            "explained_variance": [100.0],
            "n_components": 1,
            "n_classes": 2,
            "labels": LABELS,
            "threshold_ld1": round(threshold, 4),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")


# =========================
# SINGLE PREDICTION
# =========================
@router.post("/lda/project-point")
def project_single_point(data: MenagePoint):
    try:
        model  = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
        scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))

        df_in = pd.DataFrame([data.dict()])[FEATURES]
        X_sc = scaler.transform(df_in)

        score_1d = float(model.transform(X_sc)[0, 0])
        prediction = int(model.predict(X_sc)[0])
        proba = model.predict_proba(X_sc)[0].tolist()

        return {
            "ld1": round(score_1d, 4),
            "x": round(score_1d, 4),
            "y": round(-0.5 if prediction == 0 else 0.5, 4),
            "prediction": prediction,
            "label": LABELS.get(prediction),
            "color": COLORS.get(prediction),
            "probabilities": [
                {
                    "classe": i,
                    "label": LABELS.get(i),
                    "proba": round(p * 100, 1),
                    "color": COLORS.get(i)
                }
                for i, p in enumerate(proba)
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")