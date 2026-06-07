import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
import numpy as np

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

df["zone"]          = df["zone"].map({"urbain": 1, "rural": 0})
df["type_logement"] = df["type_logement"].map({"précaire": 0, "moyen": 1, "moderne": 2})
df["emploi_chef"]   = df["emploi_chef"].map({"sans emploi": 0, "instable": 1, "stable": 2})
df["niveau_etude"]  = df["niveau_etude"].map({"aucun": 0, "primaire": 1, "secondaire": 2, "universitaire": 3})

if df.isnull().sum().sum() > 0:
    print("⚠️ Valeurs non reconnues dans le dataset :")
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
X_test_scaled  = scaler.transform(X_test)

# -------------------------
# MODEL
# -------------------------
lda = LinearDiscriminantAnalysis()
lda.fit(X_train_scaled, y_train)

y_pred = lda.predict(X_test_scaled)
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# -------------------------
# VÉRIFICATION DU SCORE NUANCÉ
# -------------------------
# Tester que la distance de Mahalanobis fonctionne bien sur le test set
X_lda      = lda.transform(X_test_scaled)
means_lda  = lda.transform(lda.means_)
classes    = list(lda.classes_)

scores = []
for i in range(len(X_lda)):
    point      = X_lda[i]
    pred_idx   = classes.index(lda.predict(X_test_scaled[i:i+1])[0])
    dists      = np.linalg.norm(point - means_lda, axis=1)
    d_pred     = dists[pred_idx]
    d_max      = dists.max()
    d_min      = dists.min()
    if d_max == d_min:
        score = 70.0
    else:
        proximity = 1 - (d_pred - d_min) / (d_max - d_min)
        score = round(30 + proximity * 65, 1)
    scores.append(score)

scores = np.array(scores)
print(f"\n✅ Score nuancé — min: {scores.min()}, max: {scores.max()}, mean: {scores.mean():.1f}")
print(f"   Distribution → <50%: {(scores<50).sum()}, 50-75%: {((scores>=50)&(scores<75)).sum()}, >75%: {(scores>=75).sum()}")

# -------------------------
# SAVE
# -------------------------
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(lda,      os.path.join(MODEL_DIR, "model.pkl"))
joblib.dump(scaler,   os.path.join(MODEL_DIR, "scaler.pkl"))
joblib.dump(FEATURES, os.path.join(MODEL_DIR, "features.pkl"))

print("\n✅ Modèle sauvegardé dans :", MODEL_DIR)