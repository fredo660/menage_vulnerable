from pydantic import BaseModel

class InputData(BaseModel):
 revenu_mensuel: float
 taille_menage: int
 nb_enfants: int
 acces_eau: int
 electricite: int
 type_logement: int
 emploi_chef: int
 niveau_etude: int
 distance_centre_sante_km: float
 zone: int
 alimentation_suffisante: int
 acces_internet: int
 depenses_mensuelles: float