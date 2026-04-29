"""Intent classifier: Strategy pattern with rule-based implementation."""

from abc import ABC, abstractmethod

from pydantic import BaseModel

from app.contracts.agent import IntentType


class IntentClassification(BaseModel):
    intent_type: IntentType
    confidence: float


class IntentClassifier(ABC):
    @abstractmethod
    def classify(self, message: str, context: dict | None = None) -> IntentClassification: ...


_RULES: list[tuple[list[str], IntentType, float]] = [
    (["hablar con", "humano", "persona", "agente real", "operador"], IntentType.escalation_request, 0.9),
    (["agendar", "cita", "reservar", "disponibilidad", "horario"], IntentType.scheduling, 0.8),
    (["cuánto cuesta", "precio", "cotiz", "cuanto vale", "tarifa"], IntentType.quoting, 0.8),
    (["queja", "reclamo", "molest", "mal servicio"], IntentType.complaint, 0.8),
    (["comprar", "quiero", "pedir", "ordenar"], IntentType.purchase_intent, 0.7),
    (["hola", "buenos", "buenas", "hey", "qué tal"], IntentType.greeting, 0.9),
    (["adiós", "chao", "hasta luego", "bye", "gracias por todo"], IntentType.farewell, 0.9),
]


class RuleBasedClassifier(IntentClassifier):
    def classify(self, message: str, context: dict | None = None) -> IntentClassification:
        lower = message.lower()
        for keywords, intent, confidence in _RULES:
            if any(kw in lower for kw in keywords):
                return IntentClassification(intent_type=intent, confidence=confidence)
        return IntentClassification(intent_type=IntentType.general_query, confidence=0.5)
