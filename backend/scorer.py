"""
scorer.py — Cálculo do score de segurança (0–100).

Sistema de pontuação com pesos por header e penalidades
proporcionais à severidade dos problemas encontrados.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from analyzer import AnalysisResult, HeaderResult, Severity

# ──────────────────────────────────────────────
#  Configuração de pesos
# ──────────────────────────────────────────────

HEADER_WEIGHTS: dict[str, int] = {
    "strict-transport-security": 20,
    "content-security-policy": 25,
    "x-frame-options": 15,
    "x-content-type-options": 10,
    "referrer-policy": 10,
    "permissions-policy": 10,
    "set-cookie": 10,
}

# Penalidade aplicada sobre os pontos do header de acordo com a severidade
# dos problemas encontrados. Quanto mais grave, maior a perda.
SEVERITY_PENALTY: dict[Severity, float] = {
    "info": 0.0,       # Sem penalidade
    "low": 0.25,       # Perde 25% dos pontos
    "medium": 0.50,    # Perde 50%
    "high": 0.75,      # Perde 75%
    "critical": 1.0,   # Perde 100%
}

# ──────────────────────────────────────────────
#  Classificação
# ──────────────────────────────────────────────

Classification = Literal["Crítico", "Regular", "Bom", "Excelente"]


def classify_score(score: float) -> Classification:
    """Classifica o score em uma faixa qualitativa."""
    if score <= 40:
        return "Crítico"
    elif score <= 70:
        return "Regular"
    elif score <= 90:
        return "Bom"
    else:
        return "Excelente"


def get_classification_emoji(classification: Classification) -> str:
    """Retorna o emoji correspondente à classificação."""
    return {
        "Crítico": "🔴",
        "Regular": "🟡",
        "Bom": "🟢",
        "Excelente": "✅",
    }[classification]


# ──────────────────────────────────────────────
#  Cálculo do score
# ──────────────────────────────────────────────


@dataclass
class HeaderScore:
    """Score individual de um header."""
    name: str
    max_points: int
    earned_points: float
    penalty: float
    severity: Severity


@dataclass
class ScoreResult:
    """Resultado completo do cálculo de score."""
    total_score: float
    classification: Classification
    classification_emoji: str
    header_scores: list[HeaderScore]

    def to_dict(self) -> dict:
        return {
            "total_score": round(self.total_score, 1),
            "classification": self.classification,
            "classification_emoji": self.classification_emoji,
            "header_scores": [
                {
                    "name": hs.name,
                    "max_points": hs.max_points,
                    "earned_points": round(hs.earned_points, 1),
                    "penalty": round(hs.penalty, 2),
                    "severity": hs.severity,
                }
                for hs in self.header_scores
            ],
        }


def calculate_score(analysis: AnalysisResult) -> ScoreResult:
    """
    Calcula o score de segurança com base nos resultados da análise.

    Para cada header:
      - Se ausente e severidade info (ex: Set-Cookie): pontuação máxima
      - Se ausente com issues: penalidade total (critical)
      - Se presente com issues: penalidade proporcional à severidade
      - Se presente sem issues: pontuação máxima

    Retorna score de 0 a 100 com classificação.
    """
    header_scores: list[HeaderScore] = []
    total_earned = 0.0

    for header_key, max_points in HEADER_WEIGHTS.items():
        header_result: HeaderResult | None = analysis.headers.get(header_key)

        if header_result is None:
            # Header não foi analisado (não deveria acontecer)
            hs = HeaderScore(
                name=header_key,
                max_points=max_points,
                earned_points=0,
                penalty=1.0,
                severity="critical",
            )
            header_scores.append(hs)
            continue

        severity = header_result.severity
        penalty = SEVERITY_PENALTY.get(severity, 0.0)
        earned = max_points * (1.0 - penalty)

        hs = HeaderScore(
            name=header_result.name,
            max_points=max_points,
            earned_points=earned,
            penalty=penalty,
            severity=severity,
        )
        header_scores.append(hs)
        total_earned += earned

    # Score total é uma porcentagem (0–100)
    max_possible = sum(HEADER_WEIGHTS.values())
    total_score = (total_earned / max_possible) * 100 if max_possible > 0 else 0

    classification = classify_score(total_score)
    emoji = get_classification_emoji(classification)

    return ScoreResult(
        total_score=total_score,
        classification=classification,
        classification_emoji=emoji,
        header_scores=header_scores,
    )
