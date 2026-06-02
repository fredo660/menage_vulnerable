"""
analytics.py — VERSION CORRIGÉE ROBUSTE
- 2 classes (0 = non vulnérable, 1 = vulnérable)
- protection dataset vide
- suppression safe des NaN
- API stable même si données incohérentes
"""

from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
import os, traceback

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "..", "data", "dataset_menages_vulnerables.csv")

LABELS = {0: "Non vulnérable", 1: "Vulnérable"}
COLORS = {0: "#22c55e", 1: "#ef4444"}


# ─────────────────────────────
# LOAD DATA SAFE
# ─────────────────────────────
def load_df() -> pd.DataFrame:
    try:
        df = pd.read_csv(DATA_PATH, sep=";")

        if "id_menage" in df.columns:
            df = df.drop(columns=["id_menage"])

        # conversion binaire
        for col in ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]:
            if col in df.columns:
                df[col] = (
                    df[col].astype(str)
                    .str.strip()
                    .str.lower()
                    .map({"oui":1,"non":0,"yes":1,"no":0,"1":1,"0":0})
                )
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # mapping catégories
        mappings = {
            "zone": {"urbain":1,"urban":1,"rural":0,"1":1,"0":0},
            "type_logement": {"précaire":0,"precaire":0,"moyen":1,"moderne":2,"0":0,"1":1,"2":2},
            "emploi_chef": {"sans emploi":0,"instable":1,"stable":2,"0":0,"1":1,"2":2},
            "niveau_etude": {"aucun":0,"primaire":1,"secondaire":2,"universitaire":3,"0":0,"1":1,"2":2,"3":3},
        }

        for col, mp in mappings.items():
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.lower().map(mp)
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # IMPORTANT : éviter dataset vide
        if "vulnerabilite" not in df.columns:
            raise ValueError("Colonne 'vulnerabilite' manquante")

        df["vulnerabilite"] = pd.to_numeric(df["vulnerabilite"], errors="coerce")

        # garder uniquement lignes valides
        df = df.dropna(subset=["vulnerabilite"])

        df["vulnerabilite"] = df["vulnerabilite"].astype(int)

        # IMPORTANT FIX GLOBAL
        if df.empty:
            return pd.DataFrame()

        return df

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────
# SUMMARY (FIX division by zero)
# ─────────────────────────────
@router.get("/analytics/summary")
def get_summary():
    try:
        df = load_df()

        if df.empty:
            return {
                "total_menages": 0,
                "revenu_moyen": 0,
                "taille_moyenne": 0,
                "pct_vulnerables": 0,
                "warning": "Dataset vide ou mal chargé"
            }

        total = len(df)
        vul_counts = df["vulnerabilite"].value_counts().to_dict()

        return {
            "total_menages": total,
            "revenu_moyen": round(float(df["revenu_mensuel"].mean()), 0) if "revenu_mensuel" in df else 0,
            "taille_moyenne": round(float(df["taille_menage"].mean()), 1) if "taille_menage" in df else 0,
            "pct_urbain": round(float(df["zone"].mean()) * 100, 1) if "zone" in df else 0,
            "pct_acces_eau": round(float(df["acces_eau"].mean()) * 100, 1) if "acces_eau" in df else 0,
            "pct_electricite": round(float(df["electricite"].mean()) * 100, 1) if "electricite" in df else 0,
            "pct_alimentation": round(float(df["alimentation_suffisante"].mean()) * 100, 1) if "alimentation_suffisante" in df else 0,
            "distance_sante_moy": round(float(df["distance_centre_sante_km"].mean()), 1) if "distance_centre_sante_km" in df else 0,

            # FIX IMPORTANT
            "pct_vulnerables": round(vul_counts.get(1, 0) / total * 100, 1) if total > 0 else 0,

            "n_classes": len(df["vulnerabilite"].unique()) if total > 0 else 0,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")


# ─────────────────────────────
# DISTRIBUTION
# ─────────────────────────────
@router.get("/analytics/distribution")
def get_distribution():
    try:
        df = load_df()

        if df.empty:
            return {"data": [], "total": 0, "n_classes": 0}

        counts = df["vulnerabilite"].value_counts().to_dict()
        total = len(df)

        return {
            "data": [
                {
                    "classe": k,
                    "label": LABELS.get(k, str(k)),
                    "count": int(counts.get(k, 0)),
                    "pourcentage": round(counts.get(k, 0) / total * 100, 1) if total else 0,
                    "color": COLORS.get(k, "#999"),
                }
                for k in LABELS.keys()
            ],
            "total": total,
            "n_classes": len(df["vulnerabilite"].unique()),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────
# BOXPLOT (FIX NaN et classes vides)
# ─────────────────────────────
@router.get("/analytics/boxplot")
def get_boxplot():
    try:
        df = load_df()

        # sécurité : dataset vide
        if df is None or df.empty:
            return {
                "revenu": [],
                "taille": [],
                "depenses": [],
                "warning": "Dataset vide ou non chargé"
            }

        result = {
            "revenu": [],
            "taille": [],
            "depenses": []
        }

        variables = [
            ("revenu_mensuel", "revenu"),
            ("taille_menage", "taille"),
            ("depenses_mensuelles", "depenses"),
        ]

        for k, label in LABELS.items():
            sub = df[df["vulnerabilite"] == k]

            for var, key in variables:
                vals = sub[var].dropna().astype(float).tolist()

                # sécurité : classe vide
                if len(vals) == 0:
                    result[key].append({
                        "classe": label,
                        "min": 0,
                        "q1": 0,
                        "median": 0,
                        "q3": 0,
                        "max": 0,
                        "mean": 0,
                        "color": COLORS[k],
                    })
                    continue

                # calculs robustes
                q1 = float(np.percentile(vals, 25))
                med = float(np.percentile(vals, 50))
                q3 = float(np.percentile(vals, 75))
                mean = float(np.mean(vals))

                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr

                result[key].append({
                    "classe": label,
                    "min": float(max(min(vals), lower_bound)),
                    "q1": q1,
                    "median": med,
                    "q3": q3,
                    "max": float(min(max(vals), upper_bound)),
                    "mean": mean,
                    "color": COLORS[k],
                })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")
# ─────────────────────────────
# CORRELATION (FIX crash)
# ─────────────────────────────
@router.get("/analytics/correlation")
def get_correlation():
    try:
        df = load_df()

        if df.empty:
            return {"labels": [], "variables": [], "matrix": []}

        cols = [
            c for c in [
                "revenu_mensuel","taille_menage","nb_enfants","acces_eau",
                "electricite","type_logement","emploi_chef","niveau_etude",
                "distance_centre_sante_km","zone","alimentation_suffisante",
                "acces_internet","depenses_mensuelles","vulnerabilite",
            ]
            if c in df.columns
        ]

        df_corr = df[cols].dropna()

        if df_corr.empty or len(cols) < 2:
            return {"labels": [], "variables": [], "matrix": []}

        corr = df_corr.corr().fillna(0).round(3)

        labels_fr = {
            "revenu_mensuel":"Revenu","taille_menage":"Taille","nb_enfants":"Enfants",
            "acces_eau":"Eau","electricite":"Électricité","type_logement":"Logement",
            "emploi_chef":"Emploi","niveau_etude":"Éducation",
            "distance_centre_sante_km":"Dist.Santé","zone":"Zone",
            "alimentation_suffisante":"Alimentation","acces_internet":"Internet",
            "depenses_mensuelles":"Dépenses","vulnerabilite":"Vulnérabilité",
        }

        return {
            "labels": [labels_fr.get(c, c) for c in cols],
            "variables": cols,
            "matrix": corr.values.tolist()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e}\n{traceback.format_exc()}")