import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# Base path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data path
DATA_PATH = os.path.join(BASE_DIR, "..", "..", "data", "dataset_menages_vulnerables.csv")

df = pd.read_csv(DATA_PATH, sep=";")

# -------------------------
# ENCODAGE
# -------------------------
binary_columns = ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]

for col in binary_columns:
    df[col] = df[col].map({"oui": 1, "non": 0})

df["zone"] = df["zone"].map({"urbain": 1, "rural": 0})

df["type_logement"] = df["type_logement"].map({
    "précaire": 0,
    "moyen": 1,
    "moderne": 2
})

df["emploi_chef"] = df["emploi_chef"].map({
    "sans emploi": 0,
    "instable": 1,
    "stable": 2
})

df["niveau_etude"] = df["niveau_etude"].map({
    "aucun": 0,
    "primaire": 1,
    "secondaire": 2,
    "universitaire": 3
})

# 🚨 sécurité : vérifier NaN après encodage
if df.isnull().sum().sum() > 0:
    print("⚠️ Attention: valeurs non reconnues dans le dataset")
    print(df.isnull().sum())
    df = df.dropna()

# -------------------------
# FEATURES / TARGET
# -------------------------
FEATURES = [
    "revenu_mensuel",
    "taille_menage",
    "nb_enfants",
    "acces_eau",
    "electricite",
    "type_logement",
    "emploi_chef",
    "niveau_etude",
    "distance_centre_sante_km",
    "zone",
    "alimentation_suffisante",
    "acces_internet",
    "depenses_mensuelles"
]

X = df[FEATURES]
y = df["vulnerabilite"]

# -------------------------
# SPLIT
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -------------------------
# SCALING
# -------------------------
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# -------------------------
# MODEL
# -------------------------
lda = LinearDiscriminantAnalysis()
lda.fit(X_train_scaled, y_train)

# prediction
y_pred = lda.predict(X_test_scaled)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# -------------------------
# SAVE
# -------------------------
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(lda, os.path.join(MODEL_DIR, "model.pkl"))
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
joblib.dump(FEATURES, os.path.join(MODEL_DIR, "features.pkl"))

print("Modèle sauvegardé dans :", MODEL_DIR)