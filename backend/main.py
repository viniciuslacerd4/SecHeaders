"""
main.py — Entrypoint da API FastAPI do SecHeaders.

Rotas:
  GET  /health              → Healthcheck
  POST /analyze             → Análise completa de security headers
  GET  /history             → Lista de análises anteriores
  GET  /history/{id}        → Detalhes de uma análise específica
  GET  /export/{id}         → Exportar análise em PDF
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from analyzer import analyze_url, AnalysisResult
from database import init_db, get_db
from llm import explain_all_headers, generate_summary
from models import Analysis
from pdf_export import generate_pdf
from scorer import calculate_score, ScoreResult


# ──────────────────────────────────────────────
#  Lifespan (startup / shutdown)
# ──────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa banco de dados ao iniciar o servidor."""
    await init_db()
    yield


# ──────────────────────────────────────────────
#  App FastAPI
# ──────────────────────────────────────────────

app = FastAPI(
    title="SecHeaders API",
    description="API para análise de Security Headers HTTP com LLM",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — aceita requisições do frontend React em desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        # Remove protocolo para re-adicionar depois se necessário
        clean = v.lower().replace("http://", "").replace("https://", "")
        if not clean or "." not in clean:
            raise ValueError("URL inválida. Informe um domínio válido (ex: example.com).")
        return v


class ListModelsRequest(BaseModel):
    """Corpo da requisição para listar modelos disponíveis."""
    provider: str
    api_key: str


class AnalyzeResponse(BaseModel):
    """Resposta completa da análise."""

    url: str
    headers: dict
    score: dict
    explanations: dict
    summary: str
    analysis_id: int


class HistoryItem(BaseModel):
    """Item do histórico de análises."""

    id: int
    url: str
    score: float
    classification: str
    created_at: str


class HistoryDetailResponse(BaseModel):
    """Detalhes completos de uma análise do histórico."""

    id: int
    url: str
    score: dict
    headers: dict
    explanations: dict
    summary: str
    created_at: str


# ──────────────────────────────────────────────
#  Rotas
# ──────────────────────────────────────────────


@app.get("/health")
async def healthcheck():
    """Healthcheck — verifica se o servidor está rodando."""
    return {"status": "ok", "service": "SecHeaders API"}


@app.post("/models")
async def list_models(request: ListModelsRequest):
    """
    Lista modelos disponíveis para um provider usando a API key informada.
    Retorna lista de nomes de modelos.
    """
    import asyncio

    provider = request.provider.lower().strip()
    api_key = request.api_key.strip()

    if not api_key:
        raise HTTPException(status_code=400, detail="API key é obrigatória.")

    try:
        if provider == "openai":
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=api_key)
            response = await client.models.list()
            # Filtrar apenas modelos de chat (gpt) e ordenar
            models = sorted(
                [m.id for m in response.data if any(
                    k in m.id for k in ("gpt-4", "gpt-3.5", "o1", "o3", "o4")
                ) and "realtime" not in m.id and "audio" not in m.id],
                key=lambda x: x,
            )
            return {"models": models}

        elif provider == "anthropic":
            # Anthropic não tem endpoint de listar modelos — usamos lista conhecida
            # Validamos a key fazendo uma chamada mínima
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=api_key)
            try:
                await client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1,
                    messages=[{"role": "user", "content": "hi"}],
                )
            except Exception:
                pass  # key pode ser válida mesmo se modelo específico falhar

            models = [
                "claude-sonnet-4-20250514",
                "claude-3-5-sonnet-20241022",
                "claude-3-5-haiku-20241022",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
            ]
            return {"models": models}

        elif provider == "gemini":
            from google import genai

            client = genai.Client(api_key=api_key)
            response = await asyncio.to_thread(client.models.list)
            models = sorted(
                [
                    m.name.replace("models/", "")
                    for m in response
                    if "generateContent" in (m.supported_actions or [])
                ],
                key=lambda x: x,
            )
            return {"models": models}

        else:
            raise HTTPException(status_code=400, detail=f"Provider '{provider}' não suportado.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Erro ao listar modelos. Verifique sua API key. ({type(e).__name__}: {str(e)[:120]})",
        )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest, raw: Request, db: AsyncSession = Depends(get_db)):
    """
    Realiza análise completa de security headers de uma URL.

    Fluxo:
      1. Coleta headers HTTP via httpx
      2. Analisa cada security header
      3. Calcula score de segurança
      4. Gera explicações via LLM (em paralelo)
      5. Gera resumo executivo via LLM
      6. Salva análise no banco de dados
      7. Retorna resultado completo
    """
    url = request.url

    # Extrair config de LLM dos headers HTTP (enviados pelo frontend)
    llm_config: dict | None = None
    llm_provider = raw.headers.get("x-llm-provider", "").strip()
    llm_api_key = raw.headers.get("x-llm-api-key", "").strip()
    llm_model = raw.headers.get("x-llm-model", "").strip()
    if llm_api_key:
        llm_config = {
            "provider": llm_provider,
            "api_key": llm_api_key,
            "model": llm_model,
        }

    # 1-2. Coleta e análise de headers
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

    # 3. Calcular score
    score_result: ScoreResult = calculate_score(analysis)

    # Dados dos headers em dict para uso no LLM e resposta
    headers_dict = {k: v.to_dict() for k, v in analysis.headers.items()}
    score_dict = score_result.to_dict()

    # 4. Gerar explicações via LLM (em paralelo)
    explanations = await explain_all_headers(headers_dict, llm_config)

    # 5. Gerar resumo executivo
    summary = await generate_summary(
        url=url,
        score=score_result.total_score,
        classification=score_result.classification,
        headers_data=headers_dict,
        llm_config=llm_config,
    )

    # 6. Salvar no banco de dados
    full_result = {
        "url": url,
        "headers": headers_dict,
        "score": score_dict,
        "explanations": explanations,
        "summary": summary,
    }

    db_analysis = Analysis(
        url=url,
        score=score_result.total_score,
        classification=score_result.classification,
    )
    db_analysis.set_result(full_result)

    db.add(db_analysis)
    await db.commit()
    await db.refresh(db_analysis)

    # 7. Retornar resultado
    return AnalyzeResponse(
        url=url,
        headers=headers_dict,
        score=score_dict,
        explanations=explanations,
        summary=summary,
        analysis_id=db_analysis.id,
    )


@app.get("/history", response_model=list[HistoryItem])
async def get_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retorna lista de análises anteriores, ordenadas por data (mais recente primeiro)."""
    stmt = (
        select(Analysis)
        .order_by(desc(Analysis.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    analyses = result.scalars().all()

    return [
        HistoryItem(
            id=a.id,
            url=a.url,
            score=a.score,
            classification=a.classification,
            created_at=a.created_at.isoformat() if a.created_at else "",
        )
        for a in analyses
    ]


@app.get("/history/{analysis_id}", response_model=HistoryDetailResponse)
async def get_history_detail(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retorna detalhes completos de uma análise específica."""
    stmt = select(Analysis).where(Analysis.id == analysis_id)
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")

    stored = analysis.get_result()

    return HistoryDetailResponse(
        id=analysis.id,
        url=analysis.url,
        score=stored.get("score", {}),
        headers=stored.get("headers", {}),
        explanations=stored.get("explanations", {}),
        summary=stored.get("summary", ""),
        created_at=analysis.created_at.isoformat() if analysis.created_at else "",
    )


@app.get("/export/{analysis_id}")
async def export_pdf(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Exporta uma análise em formato PDF."""
    stmt = select(Analysis).where(Analysis.id == analysis_id)
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")

    stored = analysis.get_result()
    pdf_bytes = generate_pdf(stored)

    filename = f"secheaders_{analysis.url.replace('https://', '').replace('http://', '').replace('/', '_')}_{analysis.id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
