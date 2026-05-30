from fastapi import FastAPI, HTTPException
from app.db.supabase_client import supabase
from app.api.predict import router as predict_router
from app.services.model_service import load_model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Menages Vulnérables API")


# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# STARTUP
# =====================
@app.on_event("startup")
def startup():
    load_model()
    print("✅ Model chargé")


# =====================
# ROOT
# =====================
@app.get("/")
def root():
    return {"message": "API ménages vulnérables fonctionne"}


# =====================
# SAVE TO SUPABASE
# =====================
@app.post("/save")
def save_data(data: dict):
    try:
        response = supabase.table("menages").insert(data).execute()

        # sécurité: vérifier erreur Supabase
        if response.data is None:
            raise HTTPException(status_code=400, detail="Insertion échouée")

        return {
            "message": "Données enregistrées",
            "data": response.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# ROUTES ML
# =====================
app.include_router(predict_router, prefix="/api")