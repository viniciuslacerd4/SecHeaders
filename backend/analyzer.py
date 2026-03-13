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
    earned_fraction: float | None = None  # Quando definido, substitui a penalidade por severidade no scorer

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
    """Analisa Strict-Transport-Security com sub-scoring granular."""
    result = HeaderResult(name="Strict-Transport-Security", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Strict-Transport-Security ausente.")
        result.severity = "high"
        return result

    val_lower = value.lower()
    deduction = 0.0

    # Verifica max-age
    max_age_match = re.search(r"max-age=(\d+)", val_lower)
    if not max_age_match:
        result.issues.append("Diretiva 'max-age' ausente.")
        deduction += 0.60
    else:
        max_age = int(max_age_match.group(1))
        if max_age < 31536000:  # < 1 ano
            result.issues.append(
                f"max-age={max_age} é menor que o recomendado (31536000 = 1 ano)."
            )
            deduction += 0.30

    # Verifica includeSubDomains
    if "includesubdomains" not in val_lower:
        result.issues.append("Diretiva 'includeSubDomains' ausente — subdomínios não forçam HTTPS.")
        deduction += 0.15

    # Verifica preload (nice-to-have)
    if "preload" not in val_lower:
        result.issues.append("Diretiva 'preload' ausente — site não está na lista HSTS preload dos navegadores.")
        deduction += 0.10

    result.earned_fraction = round(max(0.0, 1.0 - deduction), 4)

    if deduction >= 0.60:
        result.severity = "high"
    elif deduction >= 0.30:
        result.severity = "medium"
    elif deduction > 0:
        result.severity = "low"
    else:
        result.severity = "info"

    return result


def _parse_csp_directives(value: str) -> dict[str, list[str]]:
    """Parseia um CSP em {nome_diretiva: [tokens]} para análise granular."""
    directives: dict[str, list[str]] = {}
    for part in value.split(";"):
        part = part.strip()
        if not part:
            continue
        tokens = part.lower().split()
        if tokens:
            directives[tokens[0]] = tokens[1:]
    return directives


def _analyze_csp(value: str | None) -> HeaderResult:
    """Analisa Content-Security-Policy com sub-scoring granular por diretiva."""
    result = HeaderResult(name="Content-Security-Policy", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Content-Security-Policy ausente.")
        result.severity = "critical"
        return result

    dirs = _parse_csp_directives(value)
    deduction = 0.0

    def effective(directive: str) -> list[str]:
        """Retorna tokens da diretiva ou fallback para default-src."""
        return dirs.get(directive) or dirs.get("default-src", [])

    # ── Diretivas essenciais ─────────────────────────────────
    has_default = "default-src" in dirs
    has_script = "script-src" in dirs
    has_object = "object-src" in dirs

    if not has_default:
        result.issues.append("Diretiva 'default-src' ausente — sem fallback para origens não especificadas.")
        deduction += 0.20

    if not has_script and not has_default:
        result.issues.append("Diretiva 'script-src' ausente e sem 'default-src' como fallback.")
        deduction += 0.15

    if not has_object and not has_default:
        result.issues.append("Diretiva 'object-src' ausente — plugins (Flash, Java) sem restrição.")
        deduction += 0.10

    # ── unsafe-inline por diretiva ───────────────────────────
    script_src = effective("script-src")
    style_src = effective("style-src")

    if "'unsafe-inline'" in script_src:
        result.issues.append(
            "Uso de 'unsafe-inline' em 'script-src' — alto risco de XSS via scripts inline."
        )
        deduction += 0.28

    if "'unsafe-inline'" in style_src and "'unsafe-inline'" not in effective("script-src"):
        result.issues.append(
            "Uso de 'unsafe-inline' em 'style-src' — permite estilos inline (risco baixo de CSS injection)."
        )
        deduction += 0.08

    # ── unsafe-eval por diretiva ─────────────────────────────
    if "'unsafe-eval'" in script_src:
        result.issues.append(
            "Uso de 'unsafe-eval' em 'script-src' — permite execução dinâmica de código (eval, Function)."
        )
        deduction += 0.20

    if "'unsafe-eval'" in style_src:
        result.issues.append("Uso de 'unsafe-eval' em 'style-src'.")
        deduction += 0.05

    # ── Wildcard (*) por diretiva ────────────────────────────
    HIGH_IMPACT = {"script-src", "default-src", "object-src"}
    for dname, tokens in dirs.items():
        if "*" in tokens:
            if dname in HIGH_IMPACT:
                result.issues.append(
                    f"Wildcard '*' em '{dname}' — qualquer origem permitida para scripts/recursos críticos."
                )
                deduction += 0.30
            else:
                result.issues.append(
                    f"Wildcard '*' em '{dname}' — relaxa política de origens para este tipo de recurso."
                )
                deduction += 0.10

    # ── Diretivas recomendadas ───────────────────────────────
    if "frame-ancestors" not in dirs:
        result.issues.append(
            "Diretiva 'frame-ancestors' ausente — clickjacking não mitigado via CSP."
        )
        deduction += 0.08

    if "base-uri" not in dirs:
        result.issues.append(
            "Diretiva 'base-uri' ausente — vulnerável a ataques de base tag injection."
        )
        deduction += 0.04

    # ── Earned fraction e severidade de badge ───────────────
    result.earned_fraction = round(max(0.0, 1.0 - deduction), 4)

    script_has_eval = "'unsafe-eval'" in script_src
    script_has_wildcard = any(
        "*" in (dirs.get(d, [])) for d in HIGH_IMPACT if d in dirs
    )
    script_has_inline = "'unsafe-inline'" in script_src

    if script_has_eval or script_has_wildcard:
        result.severity = "high"
    elif script_has_inline or deduction > 0.30:
        result.severity = "medium"
    elif deduction > 0:
        result.severity = "low"
    else:
        result.severity = "info"

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
    """Analisa Referrer-Policy com sub-scoring granular."""
    result = HeaderResult(name="Referrer-Policy", present=bool(value), value=value)

    if not value:
        result.issues.append("Header Referrer-Policy ausente — navegador usa política padrão (pode vazar URLs).")
        result.severity = "medium"
        result.earned_fraction = 0.50
        return result

    val_lower = value.strip().lower()

    restrictive = {
        "no-referrer",
        "same-origin",
        "strict-origin",
        "strict-origin-when-cross-origin",
        "no-referrer-when-downgrade",
    }
    insecure = {"unsafe-url"}

    if val_lower in insecure:
        result.issues.append(
            "Valor 'unsafe-url' envia a URL completa como referrer — alto risco de vazamento de dados sensíveis."
        )
        result.severity = "high"
        result.earned_fraction = 0.25
    elif val_lower not in restrictive:
        result.issues.append(
            f"Valor '{value}' pode não ser restritivo o suficiente."
        )
        result.severity = "low"
        result.earned_fraction = 0.80
    else:
        result.severity = "info"
        result.earned_fraction = 1.0

    return result


def _analyze_permissions_policy(value: str | None) -> HeaderResult:
    """Analisa Permissions-Policy com sub-scoring granular."""
    result = HeaderResult(
        name="Permissions-Policy", present=bool(value), value=value
    )

    if not value:
        result.issues.append("Header Permissions-Policy ausente.")
        result.severity = "medium"
        result.earned_fraction = 0.50
        return result

    deduction = 0.0

    if "=" not in value:
        result.issues.append("Permissions-Policy presente mas sem diretivas válidas.")
        deduction += 0.30

    sensitive_features = ["camera", "microphone", "geolocation"]
    val_lower = value.lower()
    unrestricted = [
        feat for feat in sensitive_features
        if re.search(rf"{feat}=\(\*\)", val_lower)
    ]

    if unrestricted:
        result.issues.append(
            f"Features sensíveis sem restrição: {', '.join(unrestricted)}."
        )
        deduction += 0.15 * len(unrestricted)

    result.earned_fraction = round(max(0.0, 1.0 - deduction), 4)
    result.severity = "medium" if deduction > 0.15 else ("low" if deduction > 0 else "info")

    return result


def _analyze_set_cookie(value: str | None) -> HeaderResult:
    """Analisa flags de segurança de Set-Cookie com sub-scoring granular."""
    result = HeaderResult(name="Set-Cookie", present=bool(value), value=value)

    if not value:
        result.issues.append("Nenhum cookie definido na resposta (não é um problema por si só).")
        result.severity = "info"
        result.earned_fraction = 1.0
        return result

    val_lower = value.lower()
    deduction = 0.0

    if "secure" not in val_lower:
        result.issues.append("Flag 'Secure' ausente — cookie pode ser transmitido via HTTP.")
        deduction += 0.40

    if "httponly" not in val_lower:
        result.issues.append(
            "Flag 'HttpOnly' ausente — cookie acessível via JavaScript (risco de XSS)."
        )
        deduction += 0.25

    if "samesite" not in val_lower:
        result.issues.append(
            "Flag 'SameSite' ausente — cookie pode ser enviado em requisições cross-site (risco de CSRF)."
        )
        deduction += 0.20

    result.earned_fraction = round(max(0.0, 1.0 - deduction), 4)

    if deduction >= 0.40:
        result.severity = "high"
    elif deduction >= 0.20:
        result.severity = "medium"
    elif deduction > 0:
        result.severity = "low"
    else:
        result.severity = "info"

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
