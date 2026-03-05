"""
models.py — Modelos do banco de dados (SQLAlchemy ORM)
"""

import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, UniqueConstraint
from database import Base


class Analysis(Base):
    """Modelo para armazenar análises realizadas."""

    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=True, index=True)
    url = Column(String(2048), nullable=False, index=True)
    score = Column(Float, nullable=False)
    classification = Column(String(20), nullable=False)
    result_json = Column(Text, nullable=False)
    from sqlalchemy.sql import func
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

    def set_result(self, data: dict):
        """Serializa o resultado da análise para JSON."""
        self.result_json = json.dumps(data, ensure_ascii=False)

    def get_result(self) -> dict:
        """Desserializa o resultado da análise."""
        return json.loads(self.result_json)

    def __repr__(self):
        return f"<Analysis(id={self.id}, url='{self.url}', score={self.score})>"


class StoredAPIKey(Base):
    """
    Armazena API keys de LLM criptografadas no servidor.

    - device_id identifica o dispositivo (UUID gerado no frontend)
    - A API key é criptografada com Fernet (AES-128-CBC + HMAC)
    - Apenas o hint (últimos 4 caracteres) é retornado ao frontend
    - O token nunca é exposto após ser salvo
    """

    __tablename__ = "stored_api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    provider = Column(String(32), nullable=False)
    encrypted_key = Column(Text, nullable=False)
    key_hint = Column(String(8), nullable=False)  # últimos 4 chars
    model = Column(String(128), nullable=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("device_id", "provider", name="uq_device_provider"),
    )

    def __repr__(self):
        return f"<StoredAPIKey(device={self.device_id[:8]}..., provider={self.provider})>"
