import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "..", "ml", "models", "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "..", "ml", "models", "scaler.pkl")

model = None
scaler = None
features = None


def load_model():
    global model, scaler, features

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # 🔥 très important : récupérer l’ordre des colonnes utilisé à l’entraînement
    features = scaler.feature_names_in_

    print("✅ Model chargé")


def predict_menage(data: dict):

    if model is None or scaler is None:
        raise Exception("Model non chargé")

    # 🔥 DataFrame au lieu de numpy
    df = pd.DataFrame([data])

    # 🔥 forcer l’ordre exact des features
    df = df[features]

    # scaling
    features_scaled = scaler.transform(df)

    # prediction
    prediction = model.predict(features_scaled)[0]

    return int(prediction)