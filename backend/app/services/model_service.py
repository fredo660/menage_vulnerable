import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH  = os.path.join(BASE_DIR, "..", "ml", "models", "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "..", "ml", "models", "scaler.pkl")

model  = None
scaler = None
features = None


def load_model():
    global model, scaler, features
    model   = joblib.load(MODEL_PATH)
    scaler  = joblib.load(SCALER_PATH)
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
        elif isinstance(v, int):
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
    print("INPUT REÇU:", data) 
    if model is None or scaler is None:
        raise Exception("Model non chargé")

    # 1. Encoder les valeurs texte
    encoded = encode_input(data)
    print("INPUT ENCODÉ:", encoded)
    # 2. DataFrame dans le bon ordre
    df = pd.DataFrame([encoded])
    df = df[features]

    # 3. Scaling
    X_scaled = scaler.transform(df)

    # 4. Prédiction + probabilité
    prediction  = int(model.predict(X_scaled)[0])
    probas      = model.predict_proba(X_scaled)[0]          # [p_faible, p_moderee, p_elevee]
    score       = round(float(probas[prediction]) * 100, 1)  # probabilité de la classe prédite

    return {"prediction": prediction, "probabilite": score}