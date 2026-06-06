"""
main.py — Point d'entrée FastAPI
IMPORTANT : tous les routers doivent être importés ICI pour que le CORS fonctionne.
Le middleware CORSMiddleware doit être ajouté AVANT d'inclure les routers.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db.supabase_client import supabase
from app.api.predict        import router as predict_router
from app.api.analytics      import router as analytics_router
from app.api.lda_projection import router as lda_router
from app.api.geo            import router as geo_router
from app.api.batch          import router as batch_router
from app.services.model_service import load_model
from dotenv import load_dotenv
import os

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")
app = FastAPI(title="Ménages Vulnérables API", version="2.0")

# ── CORS — DOIT être avant include_router ─────────────────────
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if FRONTEND_URL:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    load_model()
    print("✅ Modèle LDA chargé")

# ── Routes de base ────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "API ménages vulnérables", "version": "2.0", "status": "ok"}
@app.post("/api/save")
def save_data(data: dict):
    try:
        safe = {
    "revenu_mensuel": int(data.get("revenu_mensuel") or 0),
    "taille_menage": int(data.get("taille_menage") or 0),
    "nb_enfants": int(data.get("nb_enfants") or 0),

    "acces_eau": bool(data.get("acces_eau")),
    "electricite": bool(data.get("electricite")),
    
    "type_logement": data.get("type_logement"),
    "emploi_chef": data.get("emploi_chef"),
    "niveau_etude": data.get("niveau_etude"),

    "distance_centre_sante_km": float(data.get("distance_centre_sante_km") or 0),
    "zone": data.get("zone"),

    "alimentation_suffisante": bool(data.get("alimentation_suffisante")),
    "acces_internet": bool(data.get("acces_internet")),

    "depenses_mensuelles": int(data.get("depenses_mensuelles") or 0),

    "prediction": data.get("prediction"),
    "probabilite": float(data.get("probabilite") or 0),

    "user_id": data.get("user_id"),
}

        response = supabase.table("predictions").insert(safe).execute()

        return {
            "message": "OK",
            "data": response.data
        }

    except Exception as e:
        print("SAVE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    try:
        response = (
            supabase
            .table("predictions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ── Tous les routers sous /api ────────────────────────────────
app.include_router(predict_router,   prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(lda_router,       prefix="/api")
app.include_router(geo_router,       prefix="/api")
app.include_router(batch_router,     prefix="/api")