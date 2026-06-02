"""
geo.py — Route pour les données géographiques des ménages
Génère des coordonnées simulées réalistes pour Madagascar (urbain/rural).
"""

from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
import os

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "..", "data", "dataset_menages_vulnerables.csv")

BINARY_MAP = {"oui": 1, "non": 0}

# Centres urbains de Madagascar avec coordonnées réelles
URBAN_CENTERS = [
    {"name": "Antananarivo", "lat": -18.9249, "lng": 47.5186, "weight": 0.35},
    {"name": "Toamasina", "lat": -18.1452, "lng": 49.4019, "weight": 0.12},
    {"name": "Antsirabe", "lat": -19.8659, "lng": 47.0333, "weight": 0.10},
    {"name": "Fianarantsoa", "lat": -21.4527, "lng": 47.0857, "weight": 0.09},
    {"name": "Mahajanga", "lat": -15.7167, "lng": 46.3167, "weight": 0.08},
    {"name": "Toliara", "lat": -23.3568, "lng": 43.6917, "weight": 0.07},
    {"name": "Antsiranana", "lat": -12.3481, "lng": 49.2958, "weight": 0.07},
    {"name": "Nosy Be", "lat": -13.3167, "lng": 48.2833, "weight": 0.05},
    {"name": "Morondava", "lat": -20.2856, "lng": 44.2775, "weight": 0.04},
    {"name": "Farafangana", "lat": -22.8219, "lng": 47.8261, "weight": 0.03},
]

# Zones rurales (dispersion plus large)
RURAL_ZONES = [
    {"lat": -17.0, "lng": 46.5, "spread": 2.5},
    {"lat": -20.0, "lng": 48.0, "spread": 2.0},
    {"lat": -22.5, "lng": 45.0, "spread": 2.5},
    {"lat": -15.0, "lng": 49.5, "spread": 2.0},
    {"lat": -24.5, "lng": 46.0, "spread": 2.0},
    {"lat": -19.0, "lng": 44.0, "spread": 1.5},
    {"lat": -13.5, "lng": 48.8, "spread": 1.5},
    {"lat": -16.5, "lng": 47.5, "spread": 2.0},
]


def load_df() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, sep=";")
    for col in ["acces_eau", "electricite", "alimentation_suffisante", "acces_internet"]:
        df[col] = df[col].map(BINARY_MAP)
    df["zone"] = df["zone"].map({"urbain": 1, "rural": 0})
    df["type_logement"] = df["type_logement"].map({"précaire": 0, "moyen": 1, "moderne": 2})
    df["emploi_chef"] = df["emploi_chef"].map({"sans emploi": 0, "instable": 1, "stable": 2})
    df["niveau_etude"] = df["niveau_etude"].map({"aucun": 0, "primaire": 1, "secondaire": 2, "universitaire": 3})
    return df.dropna()


def generate_coords(zone: int, seed: int) -> tuple:
    """Génère des coordonnées réalistes selon la zone (1=urbain, 0=rural)."""
    rng = np.random.default_rng(seed)

    if zone == 1:  # Urbain
        weights = [c["weight"] for c in URBAN_CENTERS]
        idx = rng.choice(len(URBAN_CENTERS), p=weights)
        center = URBAN_CENTERS[idx]
        lat = center["lat"] + rng.normal(0, 0.05)
        lng = center["lng"] + rng.normal(0, 0.05)
        city = center["name"]
    else:  # Rural
        idx = rng.integers(0, len(RURAL_ZONES))
        zone_data = RURAL_ZONES[idx]
        lat = zone_data["lat"] + rng.normal(0, zone_data["spread"] * 0.4)
        lng = zone_data["lng"] + rng.normal(0, zone_data["spread"] * 0.3)
        # Contraindre à Madagascar [lat: -26 à -12, lng: 43 à 51]
        lat = float(np.clip(lat, -25.5, -12.0))
        lng = float(np.clip(lng, 43.2, 50.5))
        city = "Zone rurale"

    return round(lat, 5), round(lng, 5), city


@router.get("/geo/menages")
def get_geo_menages(sample: int = 300):
    """
    Retourne un échantillon de ménages avec coordonnées géographiques simulées.
    """
    try:
        df = load_df()
        n = min(sample, len(df))
        sample_df = df.sample(n=n, random_state=99).reset_index(drop=True)

        labels_map = {0: "Faible", 1: "Modérée", 2: "Élevée"}
        colors_map = {0: "#22c55e", 1: "#f59e0b", 2: "#ef4444"}

        menages = []
        for i, row in sample_df.iterrows():
            lat, lng, city = generate_coords(int(row["zone"]), seed=i + 1000)
            menages.append({
                "id": i,
                "lat": lat,
                "lng": lng,
                "ville": city,
                "vulnerabilite": int(row["vulnerabilite"]),
                "label": labels_map.get(int(row["vulnerabilite"]), "?"),
                "color": colors_map.get(int(row["vulnerabilite"]), "#888"),
                "zone": "Urbain" if int(row["zone"]) == 1 else "Rural",
                "revenu": int(row["revenu_mensuel"]),
                "taille": int(row["taille_menage"]),
            })

        # Statistiques par région
        stats = {
            "total": len(menages),
            "urbain": int(sum(1 for m in menages if m["zone"] == "Urbain")),
            "rural": int(sum(1 for m in menages if m["zone"] == "Rural")),
            "faible": int(sum(1 for m in menages if m["vulnerabilite"] == 0)),
            "moderee": int(sum(1 for m in menages if m["vulnerabilite"] == 1)),
            "elevee": int(sum(1 for m in menages if m["vulnerabilite"] == 2)),
        }

        return {"menages": menages, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))