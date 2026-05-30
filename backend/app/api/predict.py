from fastapi import APIRouter
from app.schemas.input import InputData
from app.services.model_service import predict_menage

router = APIRouter()

@router.post("/predict")
def predict(data: InputData):
    result = predict_menage(data.dict())
    return {"prediction": result}