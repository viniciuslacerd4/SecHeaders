"""
crypto.py — Criptografia de API keys usando Fernet (AES-128-CBC + HMAC-SHA256).

As API keys dos usuários são armazenadas criptografadas no banco de dados.
A chave de criptografia (ENCRYPTION_KEY) é gerada automaticamente na primeira
execução e armazenada no diretório de dados.

Garante que:
  - API keys nunca são armazenadas em texto plano
  - Sem a ENCRYPTION_KEY do servidor, os dados são irrecuperáveis
  - O token nunca é retornado ao frontend após ser salvo
"""

from __future__ import annotations

import os
from pathlib import Path

from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
#  Gerenciamento da chave de criptografia
# ──────────────────────────────────────────────

_DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
_KEY_FILE = _DATA_DIR / ".encryption_key"


def _get_or_create_encryption_key() -> bytes:
    """
    Obtém a chave de criptografia:
    1. Da variável de ambiente ENCRYPTION_KEY (se definida)
    2. Do arquivo .encryption_key no diretório de dados
    3. Gera uma nova chave automaticamente (primeira execução)
    """
    # 1. Variável de ambiente tem prioridade
    env_key = os.getenv("ENCRYPTION_KEY", "").strip()
    if env_key:
        return env_key.encode()

    # 2. Tenta ler do arquivo
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()

    # 3. Gera uma nova chave e salva
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    # Restringe permissões (apenas owner pode ler)
    _KEY_FILE.chmod(0o600)
    return key


_ENCRYPTION_KEY = _get_or_create_encryption_key()
_fernet = Fernet(_ENCRYPTION_KEY)


# ──────────────────────────────────────────────
#  Funções públicas
# ──────────────────────────────────────────────


def encrypt_api_key(api_key: str) -> str:
    """Criptografa uma API key. Retorna string base64 (Fernet token)."""
    return _fernet.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Descriptografa uma API key armazenada."""
    return _fernet.decrypt(encrypted.encode()).decode()


def get_key_hint(api_key: str) -> str:
    """Retorna hint seguro: últimos 4 caracteres da API key."""
    if len(api_key) <= 4:
        return "•" * len(api_key)
    return "•••" + api_key[-4:]
