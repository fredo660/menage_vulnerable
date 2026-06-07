import os
import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH  = os.path.join(BASE_DIR, "..", "ml", "models", "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "..", "ml", "models", "scaler.pkl")

model    = None
scaler   = None
features = None


def load_model():
    global model, scaler, features
    model    = joblib.load(MODEL_PATH)
    scaler   = joblib.load(SCALER_PATH)
    features = scaler.feature_names_in_
    print("✅ Model chargé")


def encode_input(data: dict) -> dict:
    d = dict(data)
    for col in ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]:
        v = d.get(col)
        if isinstance(v, bool):
            d[col] = int(v)
        elif isinstance(v, str):
            d[col] = 1 if v.lower() in ("oui", "true", "1") else 0
        elif v is not None:
            d[col] = int(bool(v))

    if isinstance(d.get("zone"), str):
        d["zone"] = 1 if d["zone"].lower() == "urbain" else 0
    elif isinstance(d.get("zone"), bool):
        d["zone"] = int(d["zone"])

    logement_map = {"précaire": 0, "precaire": 0, "moyen": 1, "moderne": 2}
    if isinstance(d.get("type_logement"), str):
        d["type_logement"] = logement_map.get(d["type_logement"].lower(), 0)

    emploi_map = {"sans emploi": 0, "instable": 1, "stable": 2}
    if isinstance(d.get("emploi_chef"), str):
        d["emploi_chef"] = emploi_map.get(d["emploi_chef"].lower(), 0)

    etude_map = {"aucun": 0, "primaire": 1, "secondaire": 2, "universitaire": 3}
    if isinstance(d.get("niveau_etude"), str):
        d["niveau_etude"] = etude_map.get(d["niveau_etude"].lower(), 0)

    return d


def predict_menage(data: dict) -> dict:
    if model is None or scaler is None:
        raise Exception("Model non chargé")

    print("INPUT REÇU:", data)

    encoded = encode_input(data)
    print("INPUT ENCODÉ:", encoded)

    df = pd.DataFrame([encoded])
    df = df[features]
    X_scaled = scaler.transform(df)

    prediction = int(model.predict(X_scaled)[0])

    # ── Score nuancé : distance de Mahalanobis normalisée ──────
    # Centroïdes des classes dans l'espace transformé LDA
    X_lda = model.transform(X_scaled)                    # projection dans espace LDA
    means = model.means_                                 # centroïdes originaux
    means_lda = model.transform(means)                   # centroïdes projetés

    # Distance euclidienne aux centroïdes dans l'espace LDA
    dists = np.linalg.norm(X_lda - means_lda, axis=1)   # distance à chaque classe

    # Score = proximité à la classe prédite, normalisée entre 30 et 95
    d_pred  = dists[prediction]
    d_max   = dists.max()
    d_min   = dists.min()

    if d_max == d_min:
        score = 70.0
    else:
        # Plus proche du centroïde → score plus haut
        proximity = 1 - (d_pred - d_min) / (d_max - d_min)
        score = round(30 + proximity * 65, 1)   # entre 30% et 95%

    print(f"DEBUG → prediction={prediction}, score={score}")

    return {"prediction": prediction, "probabilite": score}