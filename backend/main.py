"""
main.py — Entrypoint da API FastAPI do SecHeaders.

Versão sem banco de dados — todo o estado é gerenciado no frontend (localStorage).

Rotas:
  GET  /health              → Healthcheck
  GET  /llm-status          → Status do LLM padrão
  POST /analyze             → Análise de security headers (retorna headers + score)
  POST /report              → Gera relatório de IA a partir dos dados enviados
  POST /export              → Exportar análise em PDF
"""

from __future__ import annotations

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from typing import Any

from analyzer import analyze_url, AnalysisResult
from llm import explain_all_headers, generate_summary, get_default_llm_info
from pdf_export import generate_pdf
from scorer import calculate_score, ScoreResult


# ──────────────────────────────────────────────
#  App FastAPI
# ──────────────────────────────────────────────

app = FastAPI(
    title="SecHeaders API",
    description="API para análise de Security Headers HTTP com LLM",
    version="2.0.0",
)

# CORS — aceita requisições do frontend (dev local + produção Vercel)
_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Em produção, adiciona a URL do Vercel via variável de ambiente
import os as _os
_frontend_url = _os.getenv("FRONTEND_URL")
if _frontend_url:
    _cors_origins.append(_frontend_url.rstrip("/"))

# Regex para aceitar qualquer deploy do Vercel (preview + production)
_cors_regex = r"https://sec-headers.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
#  Middleware — API Secret (proteção contra acesso não-autorizado)
# ──────────────────────────────────────────────

_API_SECRET = _os.getenv("API_SECRET", "").strip()

# Rotas que NÃO exigem o secret (healthcheck, docs)
_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def verify_api_secret(request: Request, call_next):
    """
    Valida o header X-API-Secret em todas as requisições.
    Se API_SECRET não estiver definido no .env, permite tudo (dev local).
    """
    if not _API_SECRET:
        return await call_next(request)

    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    if request.method == "OPTIONS":
        return await call_next(request)

    provided = request.headers.get("x-api-secret", "").strip()
    if provided != _API_SECRET:
        from starlette.responses import JSONResponse
        return JSONResponse(
            status_code=403,
            content={"detail": "Acesso negado. API secret inválido ou ausente."},
        )

    return await call_next(request)


# ──────────────────────────────────────────────
#  Middleware — Security Headers (proteção nas respostas)
# ──────────────────────────────────────────────

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Adiciona headers de segurança em todas as respostas da API."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), "
        "usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    )
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'"
    )
    return response


# ──────────────────────────────────────────────
#  Schemas (Pydantic)
# ──────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    """Corpo da requisição para análise."""
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL não pode ser vazia.")
        clean = v.lower().replace("http://", "").replace("https://", "")
        if not clean or "." not in clean:
            raise ValueError("URL inválida. Informe um domínio válido (ex: example.com).")
        return v


class AnalyzeResponse(BaseModel):
    """Resposta da análise (sem LLM)."""
    url: str
    headers: dict
    score: dict


class ReportRequest(BaseModel):
    """Corpo da requisição para gerar relatório de IA."""
    url: str
    headers: dict[str, Any]
    score: dict[str, Any]


class ReportResponse(BaseModel):
    """Resposta do relatório de IA."""
    explanations: dict
    summary: str


class ExportRequest(BaseModel):
    """Corpo da requisição para exportar PDF."""
    url: str
    headers: dict[str, Any]
    score: dict[str, Any]
    explanations: dict[str, Any] = {}
    summary: str = ""


# ──────────────────────────────────────────────
#  Rotas
# ──────────────────────────────────────────────


@app.get("/health")
async def healthcheck():
    """Healthcheck — verifica se o servidor está rodando."""
    return {"status": "ok", "service": "SecHeaders API"}


@app.get("/llm-status")
async def llm_status():
    """Retorna se existe um LLM padrão configurado no servidor."""
    return get_default_llm_info()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Analisa os security headers de uma URL.
    Retorna headers coletados + score calculado.
    O relatório de IA é gerado separadamente via POST /report.
    """
    url = request.url

    try:
        analysis: AnalysisResult = await analyze_url(url)
    except httpx.InvalidURL:
        raise HTTPException(status_code=400, detail="URL inválida.")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível conectar ao site. Verifique se a URL está correta e o site está no ar.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao tentar acessar o site. Tente novamente.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado ao analisar a URL: {str(e)}",
        )

    score_result: ScoreResult = calculate_score(analysis)

    headers_dict = {k: v.to_dict() for k, v in analysis.headers.items()}
    score_dict = score_result.to_dict()

    return AnalyzeResponse(
        url=url,
        headers=headers_dict,
        score=score_dict,
    )


@app.post("/report", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """
    Gera explicações LLM + resumo executivo para uma análise.
    Recebe os dados no body (não usa banco de dados).
    """
    explanations = await explain_all_headers(request.headers)
    summary = await generate_summary(
        url=request.url,
        score=request.score.get("total_score", 0),
        classification=request.score.get("classification", "Regular"),
        headers_data=request.headers,
    )

    return ReportResponse(explanations=explanations, summary=summary)


@app.post("/export")
async def export_pdf(request: ExportRequest):
    """Exporta uma análise em formato PDF."""
    data = {
        "url": request.url,
        "headers": request.headers,
        "score": request.score,
        "explanations": request.explanations,
        "summary": request.summary,
    }

    pdf_bytes = generate_pdf(data)

    safe_url = request.url.replace("https://", "").replace("http://", "").replace("/", "_")[:50]
    filename = f"secheaders_{safe_url}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
