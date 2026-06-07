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
# CALCUL DES DISTANCES DE RÉFÉRENCE (par classe)
# -------------------------
X_train_lda = lda.transform(X_train_scaled)
means_lda   = lda.transform(lda.means_)
classes     = list(lda.classes_)

# Pour chaque point d'entraînement, calculer la distance à son centroïde
ref_distances = {cls: [] for cls in classes}

for i in range(len(X_train_lda)):
    true_cls  = y_train.iloc[i]
    cls_idx   = classes.index(true_cls)
    dist      = float(np.linalg.norm(X_train_lda[i] - means_lda[cls_idx]))
    ref_distances[true_cls].append(dist)

# Sauvegarder les percentiles pour normalisation
distance_percentiles = {}
for cls in classes:
    dists = np.array(ref_distances[cls])
    distance_percentiles[cls] = {
        "p10": float(np.percentile(dists, 10)),
        "p90": float(np.percentile(dists, 90)),
    }
    print(f"Classe {cls} → p10={distance_percentiles[cls]['p10']:.3f}, p90={distance_percentiles[cls]['p90']:.3f}")

# -------------------------
# VÉRIFICATION
# -------------------------
X_test_lda = lda.transform(X_test_scaled)
scores = []
for i in range(len(X_test_lda)):
    pred     = lda.predict(X_test_scaled[i:i+1])[0]
    cls_idx  = classes.index(pred)
    dist     = float(np.linalg.norm(X_test_lda[i] - means_lda[cls_idx]))
    p10      = distance_percentiles[pred]["p10"]
    p90      = distance_percentiles[pred]["p90"]
    # Plus loin du centroïde → score plus bas
    if p90 == p10:
        score = 70.0
    else:
        proximity = 1 - (dist - p10) / (p90 - p10)
        proximity = max(0.0, min(1.0, proximity))  # clamp [0,1]
        score = round(35 + proximity * 55, 1)       # [35%, 90%]
    scores.append(score)

scores = np.array(scores)
print(f"\n✅ Score — min: {scores.min()}, max: {scores.max()}, mean: {scores.mean():.1f}")
print(f"   Distribution → <50%: {(scores<50).sum()}, 50-75%: {((scores>=50)&(scores<75)).sum()}, >75%: {(scores>=75).sum()}")

# -------------------------
# SAVE
# -------------------------
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(lda,                  os.path.join(MODEL_DIR, "model.pkl"))
joblib.dump(scaler,               os.path.join(MODEL_DIR, "scaler.pkl"))
joblib.dump(FEATURES,             os.path.join(MODEL_DIR, "features.pkl"))
joblib.dump(distance_percentiles, os.path.join(MODEL_DIR, "distance_percentiles.pkl"))  # ← nouveau

print("\n✅ Modèle sauvegardé dans :", MODEL_DIR)