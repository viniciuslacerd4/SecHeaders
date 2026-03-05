"""
database.py — Configuração do banco de dados (SQLAlchemy async)

Suporta SQLite (desenvolvimento local / Docker) e PostgreSQL (produção / Render).

Variáveis de ambiente:
  DATABASE_URL  — URL de conexão (SQLite ou PostgreSQL)

Exemplos:
  SQLite:      sqlite+aiosqlite:///./data/secheaders.db
  PostgreSQL:  postgresql+asyncpg://user:pass@host:5432/dbname

Nota: O Render fornece DATABASE_URL no formato "postgres://...",
      que é automaticamente convertido para "postgresql+asyncpg://...".
"""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()


def _build_database_url() -> str:
    """Monta a URL do banco, tratando os formatos do Render e SQLite."""
    url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./secheaders.db")

    # Render usa "postgres://" que o SQLAlchemy não aceita diretamente.
    # Converte para o formato async correto.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return url


DATABASE_URL = _build_database_url()

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # pool_size não é suportado pelo aiosqlite
    **({} if _is_sqlite else {"pool_size": 5, "max_overflow": 10}),
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Cria todas as tabelas no banco de dados."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency injection para obter sessão do banco."""
    async with async_session() as session:
        yield session
