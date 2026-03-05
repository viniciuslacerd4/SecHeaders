"""
main.py — Entrypoint da API FastAPI do SecHeaders.

Rotas:
  GET  /health              → Healthcheck
  GET  /llm-status          → Status do LLM padrão
  POST /analyze             → Análise completa de security headers
  GET  /history             → Lista de análises anteriores
  GET  /history/{id}        → Detalhes de uma análise específica
  GET  /export/{id}         → Exportar análise em PDF
  POST /api-keys/store      → Salvar API key criptografada
  GET  /api-keys/{device}   → Listar keys salvas (apenas hints)
  DELETE /api-keys/{d}/{p}  → Remover key de um provider
  POST /api-keys/models     → Listar modelos usando key armazenada
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
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from analyzer import analyze_url, AnalysisResult
from crypto import encrypt_api_key, decrypt_api_key, get_key_hint
from database import init_db, get_db
from llm import explain_all_headers, generate_summary, has_default_llm, get_default_llm_info
from models import Analysis, StoredAPIKey
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
# Ex: https://sec-headers-abc123-user.vercel.app
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
    # Se não configurou secret, permite tudo (retrocompatível)
    if not _API_SECRET:
        return await call_next(request)

    # Rotas públicas não precisam de secret
    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    # Preflight CORS (OPTIONS) não carrega headers customizados
    if request.method == "OPTIONS":
        return await call_next(request)

    # Valida o header
    provided = request.headers.get("x-api-secret", "").strip()
    if provided != _API_SECRET:
        from starlette.responses import JSONResponse
        return JSONResponse(
            status_code=403,
            content={"detail": "Acesso negado. API secret inválido ou ausente."},
        )

    return await call_next(request)


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


class StoreAPIKeyRequest(BaseModel):
    """Corpo da requisição para salvar uma API key."""
    device_id: str
    provider: str
    api_key: str
    model: str = ""

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) < 16:
            raise ValueError("device_id inválido.")
        return v

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) < 5:
            raise ValueError("API key inválida.")
        return v


class UpdateModelRequest(BaseModel):
    """Corpo da requisição para atualizar o modelo de um provider."""
    device_id: str
    provider: str
    model: str


class StoredModelsRequest(BaseModel):
    """Corpo da requisição para listar modelos usando key armazenada."""
    device_id: str
    provider: str


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


@app.get("/llm-status")
async def llm_status():
    """Retorna se existe um LLM padrão configurado no servidor."""
    return get_default_llm_info()


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

        elif provider == "openrouter":
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
            )
            response = await client.models.list()
            models = sorted(
                [m.id for m in response.data if ":free" in m.id or "step" in m.id.lower()],
                key=lambda x: x,
            )
            # Se a lista ficar vazia, retorna todos
            if not models:
                models = sorted([m.id for m in response.data], key=lambda x: x)
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


# ──────────────────────────────────────────────
#  API Keys — armazenamento seguro
# ──────────────────────────────────────────────


@app.post("/api-keys/store")
async def store_api_key(request: StoreAPIKeyRequest, db: AsyncSession = Depends(get_db)):
    """
    Salva uma API key criptografada no servidor.
    A key é criptografada com Fernet (AES-128-CBC + HMAC).
    Nunca é retornada ao frontend após ser salva.
    """
    # Verifica se já existe uma key para este device+provider
    stmt = select(StoredAPIKey).where(
        StoredAPIKey.device_id == request.device_id,
        StoredAPIKey.provider == request.provider.lower(),
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    encrypted = encrypt_api_key(request.api_key)
    hint = get_key_hint(request.api_key)

    if existing:
        existing.encrypted_key = encrypted
        existing.key_hint = hint
        existing.model = request.model
        existing.updated_at = datetime.now(timezone.utc)
    else:
        new_key = StoredAPIKey(
            device_id=request.device_id,
            provider=request.provider.lower(),
            encrypted_key=encrypted,
            key_hint=hint,
            model=request.model,
        )
        db.add(new_key)

    await db.commit()

    return {
        "status": "saved",
        "provider": request.provider.lower(),
        "hint": hint,
        "model": request.model,
    }


@app.get("/api-keys/{device_id}")
async def list_stored_keys(device_id: str, db: AsyncSession = Depends(get_db)):
    """
    Lista API keys salvas para um dispositivo.
    Retorna apenas provider, hint e modelo — NUNCA a key real.
    """
    stmt = select(StoredAPIKey).where(StoredAPIKey.device_id == device_id)
    result = await db.execute(stmt)
    keys = result.scalars().all()

    return {
        "keys": [
            {
                "provider": k.provider,
                "hint": k.key_hint,
                "model": k.model or "",
                "updated_at": k.updated_at.isoformat() if k.updated_at else "",
            }
            for k in keys
        ]
    }


@app.delete("/api-keys/{device_id}/{provider}")
async def delete_stored_key(device_id: str, provider: str, db: AsyncSession = Depends(get_db)):
    """Remove uma API key armazenada."""
    stmt = delete(StoredAPIKey).where(
        StoredAPIKey.device_id == device_id,
        StoredAPIKey.provider == provider.lower(),
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "deleted", "provider": provider.lower()}


@app.put("/api-keys/model")
async def update_stored_model(request: UpdateModelRequest, db: AsyncSession = Depends(get_db)):
    """Atualiza o modelo selecionado para um provider já salvo."""
    stmt = select(StoredAPIKey).where(
        StoredAPIKey.device_id == request.device_id,
        StoredAPIKey.provider == request.provider.lower(),
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if not existing:
        raise HTTPException(status_code=404, detail="API key não encontrada para este provider.")

    existing.model = request.model
    existing.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "updated", "provider": request.provider.lower(), "model": request.model}


@app.post("/api-keys/models")
async def list_stored_models(request: StoredModelsRequest, db: AsyncSession = Depends(get_db)):
    """
    Lista modelos disponíveis usando uma API key armazenada.
    Descriptografa a key internamente — nunca a expõe.
    """
    stmt = select(StoredAPIKey).where(
        StoredAPIKey.device_id == request.device_id,
        StoredAPIKey.provider == request.provider.lower(),
    )
    result = await db.execute(stmt)
    stored = result.scalar_one_or_none()

    if not stored:
        raise HTTPException(status_code=404, detail="Nenhuma API key salva para este provider.")

    try:
        api_key = decrypt_api_key(stored.encrypted_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao descriptografar a key. Salve novamente.")

    # Reutiliza a lógica de listar modelos
    return await list_models(ListModelsRequest(provider=request.provider, api_key=api_key))


# ──────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────


async def _resolve_llm_config(raw: Request, db: AsyncSession) -> dict | None:
    """
    Resolve a configuração de LLM para uma requisição.
    Prioridade:
      1. API key enviada diretamente nos headers (legado/compatibilidade)
      2. device_id + provider nos headers → busca key criptografada no banco
      3. None → usa o LLM padrão do servidor
    """
    # 1. Key direta nos headers (legado)
    llm_api_key = raw.headers.get("x-llm-api-key", "").strip()
    if llm_api_key:
        return {
            "provider": raw.headers.get("x-llm-provider", "").strip(),
            "api_key": llm_api_key,
            "model": raw.headers.get("x-llm-model", "").strip(),
        }

    # 2. device_id → busca key armazenada
    device_id = raw.headers.get("x-device-id", "").strip()
    llm_provider = raw.headers.get("x-llm-provider", "").strip()
    if device_id and llm_provider:
        stmt = select(StoredAPIKey).where(
            StoredAPIKey.device_id == device_id,
            StoredAPIKey.provider == llm_provider,
        )
        result = await db.execute(stmt)
        stored = result.scalar_one_or_none()
        if stored:
            try:
                api_key = decrypt_api_key(stored.encrypted_key)
                return {
                    "provider": stored.provider,
                    "api_key": api_key,
                    "model": raw.headers.get("x-llm-model", "").strip() or stored.model or "",
                }
            except Exception:
                pass  # fallback para LLM padrão

    # 3. Sem config → usa padrão do servidor
    return None


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

    # Resolver configuração de LLM (key criptografada ou padrão)
    llm_config = await _resolve_llm_config(raw, db)

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


@app.delete("/history")
async def clear_history(db: AsyncSession = Depends(get_db)):
    """Remove todas as análises do histórico."""
    stmt = delete(Analysis)
    result = await db.execute(stmt)
    await db.commit()
    return {"status": "cleared", "deleted": result.rowcount}


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
