import os
import joblib
import numpy as np
import pandas as pd

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, "..", "ml", "models", "model.pkl")
SCALER_PATH  = os.path.join(BASE_DIR, "..", "ml", "models", "scaler.pkl")
DIST_PATH    = os.path.join(BASE_DIR, "..", "ml", "models", "distance_percentiles.pkl")

model                = None
scaler               = None
features             = None
distance_percentiles = None


def load_model():
    global model, scaler, features, distance_percentiles
    model                = joblib.load(MODEL_PATH)
    scaler               = joblib.load(SCALER_PATH)
    features             = scaler.feature_names_in_
    distance_percentiles = joblib.load(DIST_PATH)
    print("✅ Model chargé — classes:", list(model.classes_))
    print("✅ Percentiles keys:", list(distance_percentiles.keys()))


def encode_input(data: dict) -> dict:
    d = dict(data)

    for col in ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]:
        v = d.get(col)
        if isinstance(v, bool):  d[col] = int(v)
        elif isinstance(v, str): d[col] = 1 if v.lower() in ("oui", "true", "1") else 0
        elif v is not None:      d[col] = int(bool(v))

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

    encoded  = encode_input(data)
    df       = pd.DataFrame([encoded])
    df       = df[features]
    X_scaled = scaler.transform(df)

    prediction     = model.predict(X_scaled)[0]          # type original (int ou str)
    prediction_int = int(prediction)                      # pour le frontend
    classes        = list(model.classes_)
    cls_idx        = classes.index(prediction)

    # Distance au centroïde de la classe prédite
    X_lda     = model.transform(X_scaled)
    means_lda = model.transform(model.means_)
    dist      = float(np.linalg.norm(X_lda[0] - means_lda[cls_idx]))

    # Clé dans distance_percentiles (peut être int ou str selon le dataset)
    dist_key = prediction
    if dist_key not in distance_percentiles:
        # Essayer avec int ou str selon ce qui existe
        dist_key = prediction_int if prediction_int in distance_percentiles else str(prediction)

    perc = distance_percentiles.get(dist_key, {"p10": 0.0, "p90": 1.0})
    p10  = perc["p10"]
    p90  = perc["p90"]

    if p90 == p10:
        score = 70.0
    else:
        proximity = 1 - (dist - p10) / (p90 - p10)
        proximity = max(0.0, min(1.0, proximity))
        score = round(35 + proximity * 55, 1)

    print(f"DEBUG → prediction={prediction_int}, dist={dist:.3f}, score={score}")
    return {"prediction": prediction_int, "probabilite": score}