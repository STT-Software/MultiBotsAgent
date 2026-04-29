"""Tests for intent classifier."""

import pytest

from app.contracts.agent import IntentType
from app.core.intent_classifier import RuleBasedClassifier


@pytest.fixture
def classifier():
    return RuleBasedClassifier()


def test_scheduling_intent(classifier):
    r = classifier.classify("Quiero agendar una cita")
    assert r.intent_type == IntentType.scheduling


def test_quoting_intent(classifier):
    r = classifier.classify("Cuánto cuesta el servicio?")
    assert r.intent_type == IntentType.quoting


def test_escalation_intent(classifier):
    r = classifier.classify("Quiero hablar con un humano")
    assert r.intent_type == IntentType.escalation_request


def test_greeting_intent(classifier):
    r = classifier.classify("Hola, buenos días")
    assert r.intent_type == IntentType.greeting


def test_farewell_intent(classifier):
    r = classifier.classify("Adiós, gracias")
    assert r.intent_type == IntentType.farewell


def test_general_query_default(classifier):
    r = classifier.classify("Algo random sin keywords claros xyz")
    assert r.intent_type == IntentType.general_query
    assert r.confidence >= 0.3
