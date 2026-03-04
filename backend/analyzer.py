"""
analyzer.py — Lógica de coleta e análise de Security Headers HTTP.

Responsável por:
  1. Buscar os headers HTTP de uma URL (fetch_headers)
  2. Analisar cada header de segurança individualmente
  3. Retornar diagnóstico detalhado (presente, valor, problemas, severidade)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Literal

import httpx

# ──────────────────────────────────────────────
#  Tipos e estruturas
# ──────────────────────────────────────────────

Severity = Literal["info", "low", "medium", "high", "critical"]


@dataclass
class HeaderResult:
    """Resultado da análise de um único header."""

    name: str
    present: bool
    value: str | None = None
    issues: list[str] = field(default_factory=list)
    severity: Severity = "info"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AnalysisResult:
    """Resultado completo da análise de todos os headers de uma URL."""

    url: str
    headers: dict[str, HeaderResult] = field(default_factory=dict)
    raw_headers: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "headers": {k: v.to_dict() for k, v in self.headers.items()},
            "raw_headers": self.raw_headers,
        }


# ──────────────────────────────────────────────
#  Constantes – headers monitorados
# ──────────────────────────────────────────────

SECURITY_HEADERS = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "set-cookie",
]

# ──────────────────────────────────────────────
#  Coleta de headers
# ──────────────────────────────────────────────


async def fetch_headers(url: str, timeout: float = 10.0) -> dict[str, str]:
    """
    Faz uma requisição GET à URL e retorna os headers da resposta.

    Raises:
        httpx.InvalidURL: URL malformada
        httpx.ConnectError: Site fora do ar / DNS inválido
        httpx.TimeoutException: Timeout excedido
    """
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=timeout,
        verify=False,  # Aceita certificados inválidos p/ análise
    ) as client:
        response = await client.get(url)

    # Normaliza nomes dos headers para lowercase
    return {k.lower(): v for k, v in response.headers.items()}


# ──────────────────────────────────────────────
#  Funções de análise por header
# ──────────────────────────────────────────────


def _analyze_hsts(value: str | None) -> HeaderResult:
    """Analisa Strict-Transport-Security."""
    result = HeaderResult(name="Strict-Transport-Security", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Strict-Transport-Security ausente.")
        result.severity = "high"
        return result

    val_lower = value.lower()

    # Verifica max-age
    max_age_match = re.search(r"max-age=(\d+)", val_lower)
    if not max_age_match:
        result.issues.append("Diretiva 'max-age' ausente.")
        result.severity = "high"
    else:
        max_age = int(max_age_match.group(1))
        if max_age < 31536000:  # < 1 ano
            result.issues.append(
                f"max-age={max_age} é menor que o recomendado (31536000 = 1 ano)."
            )
            result.severity = "medium"

    # Verifica includeSubDomains
    if "includesubdomains" not in val_lower:
        result.issues.append("Diretiva 'includeSubDomains' ausente.")
        if result.severity == "info":
            result.severity = "low"

    # Verifica preload
    if "preload" not in val_lower:
        result.issues.append("Diretiva 'preload' ausente (recomendado).")
        if result.severity == "info":
            result.severity = "low"

    return result


def _analyze_csp(value: str | None) -> HeaderResult:
    """Analisa Content-Security-Policy."""
    result = HeaderResult(name="Content-Security-Policy", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Content-Security-Policy ausente.")
        result.severity = "critical"
        return result

    val_lower = value.lower()

    # Verifica diretivas mínimas recomendadas
    essential_directives = ["default-src", "script-src", "object-src"]
    missing = [d for d in essential_directives if d not in val_lower]
    if missing:
        result.issues.append(
            f"Diretivas essenciais ausentes: {', '.join(missing)}."
        )
        result.severity = "high"

    # Verifica uso de unsafe-inline
    if "unsafe-inline" in val_lower:
        result.issues.append(
            "Uso de 'unsafe-inline' detectado — enfraquece a proteção contra XSS."
        )
        if result.severity in ("info", "low"):
            result.severity = "medium"

    # Verifica uso de unsafe-eval
    if "unsafe-eval" in val_lower:
        result.issues.append(
            "Uso de 'unsafe-eval' detectado — permite execução dinâmica de código."
        )
        if result.severity in ("info", "low"):
            result.severity = "high"

    # Verifica wildcard
    if re.search(r"(^|\s)\*(\s|;|$)", val_lower):
        result.issues.append(
            "Uso de wildcard '*' detectado — permite carregamento de recursos de qualquer origem."
        )
        result.severity = "high"

    return result


def _analyze_x_frame_options(value: str | None) -> HeaderResult:
    """Analisa X-Frame-Options."""
    result = HeaderResult(name="X-Frame-Options", present=bool(value), value=value)

    if not value:
        result.issues.append("Header X-Frame-Options ausente.")
        result.severity = "high"
        return result

    val_upper = value.strip().upper()
    valid_values = {"DENY", "SAMEORIGIN"}

    if val_upper not in valid_values:
        result.issues.append(
            f"Valor '{value}' não é recomendado. Use 'DENY' ou 'SAMEORIGIN'."
        )
        result.severity = "medium"

    return result


def _analyze_x_content_type_options(value: str | None) -> HeaderResult:
    """Analisa X-Content-Type-Options."""
    result = HeaderResult(
        name="X-Content-Type-Options", present=bool(value), value=value
    )

    if not value:
        result.issues.append("Header X-Content-Type-Options ausente.")
        result.severity = "medium"
        return result

    if value.strip().lower() != "nosniff":
        result.issues.append(
            f"Valor '{value}' incorreto. O único valor válido é 'nosniff'."
        )
        result.severity = "medium"

    return result


def _analyze_referrer_policy(value: str | None) -> HeaderResult:
    """Analisa Referrer-Policy."""
    result = HeaderResult(name="Referrer-Policy", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Referrer-Policy ausente.")
        result.severity = "medium"
        return result

    val_lower = value.strip().lower()

    # Valores restritivos (seguros)
    restrictive = {
        "no-referrer",
        "same-origin",
        "strict-origin",
        "strict-origin-when-cross-origin",
        "no-referrer-when-downgrade",
    }

    # Valores inseguros
    insecure = {"unsafe-url"}

    if val_lower in insecure:
        result.issues.append(
            "Valor 'unsafe-url' envia a URL completa como referrer — risco de vazamento de dados."
        )
        result.severity = "high"
    elif val_lower not in restrictive:
        result.issues.append(
            f"Valor '{value}' pode não ser restritivo o suficiente."
        )
        result.severity = "low"

    return result


def _analyze_permissions_policy(value: str | None) -> HeaderResult:
    """Analisa Permissions-Policy."""
    result = HeaderResult(
        name="Permissions-Policy", present=bool(value), value=value
    )

    if not value:
        result.issues.append("Header Permissions-Policy ausente.")
        result.severity = "medium"
        return result

    # Verifica se há pelo menos alguma restrição definida
    if "=" not in value:
        result.issues.append(
            "Permissions-Policy presente mas sem diretivas válidas."
        )
        result.severity = "medium"

    # Verifica se features sensíveis estão restritas
    sensitive_features = ["camera", "microphone", "geolocation"]
    val_lower = value.lower()
    unrestricted = []
    for feat in sensitive_features:
        # Se a feature aparece com =(*)  significa habilitada para todos
        if re.search(rf"{feat}=\(\*\)", val_lower):
            unrestricted.append(feat)

    if unrestricted:
        result.issues.append(
            f"Features sensíveis sem restrição: {', '.join(unrestricted)}."
        )
        result.severity = "medium"

    return result


def _analyze_set_cookie(value: str | None) -> HeaderResult:
    """Analisa flags de segurança de Set-Cookie."""
    result = HeaderResult(name="Set-Cookie", present=bool(value), value=value)

    if not value:
        # Não ter Set-Cookie não é necessariamente um problema
        result.issues.append("Nenhum cookie definido na resposta (não é um problema por si só).")
        result.severity = "info"
        return result

    val_lower = value.lower()

    if "secure" not in val_lower:
        result.issues.append("Flag 'Secure' ausente — cookie pode ser transmitido via HTTP.")
        result.severity = "high"

    if "httponly" not in val_lower:
        result.issues.append(
            "Flag 'HttpOnly' ausente — cookie acessível via JavaScript (risco de XSS)."
        )
        if result.severity in ("info", "low"):
            result.severity = "medium"

    if "samesite" not in val_lower:
        result.issues.append(
            "Flag 'SameSite' ausente — cookie pode ser enviado em requisições cross-site (risco de CSRF)."
        )
        if result.severity in ("info", "low"):
            result.severity = "medium"

    return result


# ──────────────────────────────────────────────
#  Mapeamento header → função de análise
# ──────────────────────────────────────────────

_ANALYZERS: dict[str, callable] = {
    "strict-transport-security": _analyze_hsts,
    "content-security-policy": _analyze_csp,
    "x-frame-options": _analyze_x_frame_options,
    "x-content-type-options": _analyze_x_content_type_options,
    "referrer-policy": _analyze_referrer_policy,
    "permissions-policy": _analyze_permissions_policy,
    "set-cookie": _analyze_set_cookie,
}


# ──────────────────────────────────────────────
#  Função principal de análise
# ──────────────────────────────────────────────


async def analyze_url(url: str) -> AnalysisResult:
    """
    Realiza a análise completa de security headers de uma URL.

    1. Faz fetch dos headers
    2. Analisa cada security header
    3. Retorna resultado estruturado

    Raises:
        httpx.InvalidURL, httpx.ConnectError, httpx.TimeoutException
    """
    raw_headers = await fetch_headers(url)
    analysis = AnalysisResult(url=url, raw_headers=raw_headers)

    for header_key, analyzer_fn in _ANALYZERS.items():
        header_value = raw_headers.get(header_key)
        header_result = analyzer_fn(header_value)
        analysis.headers[header_key] = header_result

    return analysis
