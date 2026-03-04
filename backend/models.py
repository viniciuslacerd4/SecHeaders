"""
models.py — Modelos do banco de dados (SQLAlchemy ORM)
"""

import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from database import Base


class Analysis(Base):
    """Modelo para armazenar análises realizadas."""

    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(2048), nullable=False, index=True)
    score = Column(Float, nullable=False)
    classification = Column(String(20), nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def set_result(self, data: dict):
        """Serializa o resultado da análise para JSON."""
        self.result_json = json.dumps(data, ensure_ascii=False)

    def get_result(self) -> dict:
        """Desserializa o resultado da análise."""
        return json.loads(self.result_json)

    def __repr__(self):
        return f"<Analysis(id={self.id}, url='{self.url}', score={self.score})>"
