from fastapi import APIRouter
from app.schemas.input import InputData
from app.services.model_service import predict_menage

router = APIRouter()

@router.post("/predict")
def predict(data: InputData):
    result = predict_menage(data.dict())
    print("RESULT:", result)
    return {"prediction": result["prediction"], "probabilite": result["probabilite"]}