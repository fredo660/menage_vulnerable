"""
batch.py — Route pour la prédiction en masse depuis un CSV uploadé (VERSION STABLE)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import joblib
import os
import io
import math

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "ml", "models")

FEATURES = [
    "revenu_mensuel", "taille_menage", "nb_enfants", "acces_eau",
    "electricite", "type_logement", "emploi_chef", "niveau_etude",
    "distance_centre_sante_km", "zone", "alimentation_suffisante",
    "acces_internet", "depenses_mensuelles"
]

BINARY_MAP = {"oui": 1, "non": 0, "1": 1, "0": 0, 1: 1, 0: 0}
ZONE_MAP = {"urbain": 1, "rural": 0}
LOGEMENT_MAP = {"précaire": 0, "moyen": 1, "moderne": 2}
EMPLOI_MAP = {"sans emploi": 0, "instable": 1, "stable": 2}
ETUDE_MAP = {"aucun": 0, "primaire": 1, "secondaire": 2, "universitaire": 3}

LABELS = {0: "Faible", 1: "Modérée", 2: "Élevée"}


# ---------------- SAFE FLOAT ----------------
def safe_float(x):
    try:
        if x is None:
            return 0.0
        if isinstance(x, (float, np.floating)):
            if math.isnan(x) or math.isinf(x):
                return 0.0
        return float(x)
    except:
        return 0.0


# ---------------- ENCODING ----------------
def encode_row(row: pd.Series) -> pd.Series:
    row = row.copy()

    for col in ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]:
        v = str(row.get(col, "0")).strip().lower()
        row[col] = BINARY_MAP.get(v, 0)

    row["zone"] = ZONE_MAP.get(str(row.get("zone", "rural")).strip().lower(), 0)
    row["type_logement"] = LOGEMENT_MAP.get(str(row.get("type_logement", "0")).strip().lower(), 0)
    row["emploi_chef"] = EMPLOI_MAP.get(str(row.get("emploi_chef", "0")).strip().lower(), 0)
    row["niveau_etude"] = ETUDE_MAP.get(str(row.get("niveau_etude", "0")).strip().lower(), 0)

    return row


# ---------------- LOAD MODELS ----------------
def load_models():
    model = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    return model, scaler


# ===================== BATCH PREDICT =====================
@router.post("/batch/predict")
async def batch_predict(file: UploadFile = File(...)):

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fichier CSV requis")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="CSV vide")

    sample = content[:2048].decode("utf-8", errors="ignore")
    sep = ";" if sample.count(";") > sample.count(",") else ","

    try:
        df = pd.read_csv(io.BytesIO(content), sep=sep, on_bad_lines="skip")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lecture CSV: {e}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV sans données exploitables")

    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(status_code=422, detail=f"Colonnes manquantes: {missing}")

    model, scaler = load_models()

    results = []

    for idx, row in df.iterrows():
        try:
            row_enc = encode_row(row)

            x = pd.DataFrame([row_enc])[FEATURES]

            # nettoyage robuste
            x = x.replace([np.inf, -np.inf], np.nan).fillna(0).astype(float)

            if x.shape[0] == 0:
                continue

            x_scaled = scaler.transform(x)

            pred = int(model.predict(x_scaled)[0])

            proba = model.predict_proba(x_scaled)[0] if hasattr(model, "predict_proba") else [0, 0, 0]

            # sécurité classes
            p0 = safe_float(proba[0]) if len(proba) > 0 else 0
            p1 = safe_float(proba[1]) if len(proba) > 1 else 0
            p2 = safe_float(proba[2]) if len(proba) > 2 else 0

            results.append({
                "ligne": idx + 1,
                "prediction": pred,
                "label_vulnerabilite": LABELS.get(pred, "Inconnu"),
                "confiance_pct": round(max(p0, p1, p2) * 100, 1),
                "proba_faible": round(p0 * 100, 1),
                "proba_moderee": round(p1 * 100, 1),
                "proba_elevee": round(p2 * 100, 1),
                **{f: safe_float(row_enc.get(f)) for f in FEATURES},
            })

        except Exception as e:
            results.append({
                "ligne": idx + 1,
                "erreur": str(e)
            })

    if not results:
        raise HTTPException(status_code=400, detail="Aucune prédiction générée")

    preds = [r.get("prediction") for r in results if "prediction" in r]

    confiance_vals = [r.get("confiance_pct", 0) for r in results]

    stats = {
        "total": len(results),
        "faible": preds.count(0),
        "moderee": preds.count(1),
        "elevee": preds.count(2),
        "confiance_moyenne": round(np.mean(confiance_vals) if confiance_vals else 0, 1)
    }

    return {"results": results, "stats": stats}


# ===================== EXPORT CSV =====================
@router.post("/batch/predict/export")
async def batch_predict_export(file: UploadFile = File(...)):

    content = await file.read()
    sample = content[:1024].decode("utf-8", errors="ignore")
    sep = ";" if sample.count(";") > sample.count(",") else ","

    try:
        df = pd.read_csv(io.BytesIO(content), sep=sep, on_bad_lines="skip")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lecture CSV: {e}")

    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(status_code=422, detail=f"Colonnes manquantes: {missing}")

    model, scaler = load_models()

    df["vulnerabilite_pred"] = ""
    df["label_vulnerabilite"] = ""
    df["confiance_pct"] = ""

    for idx, row in df.iterrows():
        try:
            row_enc = encode_row(row)

            x = pd.DataFrame([row_enc])[FEATURES]
            x = x.replace([np.inf, -np.inf], np.nan).fillna(0).astype(float)

            x_scaled = scaler.transform(x)

            pred = int(model.predict(x_scaled)[0])
            proba = model.predict_proba(x_scaled)[0]

            df.at[idx, "vulnerabilite_pred"] = pred
            df.at[idx, "label_vulnerabilite"] = LABELS.get(pred, "Inconnu")
            df.at[idx, "confiance_pct"] = round(float(np.max(proba)) * 100, 1)

        except Exception:
            df.at[idx, "vulnerabilite_pred"] = -1
            df.at[idx, "label_vulnerabilite"] = "Erreur"
            df.at[idx, "confiance_pct"] = 0

    output = io.StringIO()
    df.to_csv(output, sep=";", index=False)
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions_batch.csv"},
    )