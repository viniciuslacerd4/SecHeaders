# 🛡️ SecHeaders

> Ferramenta web para análise automatizada de segurança em cabeçalhos HTTP com explicações geradas por IA, armazenamento seguro de chaves e dashboard interativo.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## 📌 Sobre o Projeto

O **SecHeaders** é uma ferramenta de análise de segurança web desenvolvida como Trabalho de Conclusão de Curso (TCC) no curso de Sistemas de Informação da UNIFAP.

A ferramenta analisa os cabeçalhos HTTP de segurança de qualquer URL pública e utiliza um **Large Language Model (LLM)** para gerar explicações em linguagem natural sobre as vulnerabilidades encontradas — tornando o resultado acessível tanto para desenvolvedores iniciantes quanto para analistas de segurança experientes.

### O problema que resolve

Ferramentas existentes como o `securityheaders.com` identificam problemas mas não explicam seu impacto real. O SecHeaders preenche essa lacuna: além de identificar, ele **ensina** o que está errado e como corrigir.

---

## ✨ Funcionalidades

- 🔍 **Análise de 7 security headers** — verifica presença, ausência e qualidade de configuração dos principais cabeçalhos de segurança
- 🤖 **Explicações com IA** — usa LLM para gerar descrições claras sobre cada vulnerabilidade com exemplos de ataque e correções
- 📊 **Score de segurança** — pontuação de 0 a 100 com classificação visual (Crítico / Regular / Bom / Excelente)
- 🔐 **Armazenamento seguro de API Keys** — chaves criptografadas no servidor com Fernet (AES-128-CBC + HMAC-SHA256), nunca expostas ao frontend
- 🌐 **4 providers de IA** — OpenAI (GPT), Anthropic (Claude), Google (Gemini) e OpenRouter (padrão gratuito)
- 📋 **Histórico de análises** — armazena análises com opção de limpar todo o histórico
- ⚖️ **Comparação de URLs** — analisa duas URLs lado a lado com diff visual
- 📄 **Exportação em PDF** — gera relatório completo com ReportLab (A4)
- ⚡ **Cache inteligente** — cache em memória (SHA-256) para evitar chamadas duplicadas ao LLM
- 🐳 **Docker Compose** — setup completo com hot reload para backend e frontend

---

## 🔎 Headers Analisados

| Header                      | Proteção contra                             |
| --------------------------- | ------------------------------------------- |
| `Strict-Transport-Security` | Downgrade attacks, interceptação de tráfego |
| `Content-Security-Policy`   | XSS, injeção de conteúdo malicioso          |
| `X-Frame-Options`           | Clickjacking                                |
| `X-Content-Type-Options`    | MIME sniffing                               |
| `Referrer-Policy`           | Vazamento de informações via referrer       |
| `Permissions-Policy`        | Acesso indevido a APIs do navegador         |
| `Set-Cookie`                | Roubo de sessão, ataques CSRF               |

---

## 🗂️ Estrutura do Projeto

```
SecHeaders/
├── docker-compose.yml          # Orquestração dos containers
├── backend/
│   ├── Dockerfile              # Imagem Python do backend
│   ├── main.py                 # Entrypoint FastAPI + rotas
│   ├── analyzer.py             # Lógica de análise de headers
│   ├── scorer.py               # Cálculo do score (pesos + severidade)
│   ├── llm.py                  # Integração multi-provider LLM + prompts + cache
│   ├── crypto.py               # Criptografia Fernet para API keys
│   ├── pdf_export.py           # Geração de PDF com ReportLab
│   ├── database.py             # SQLAlchemy async + SQLite
│   ├── models.py               # ORM models (Analysis, StoredAPIKey)
│   ├── requirements.txt
│   └── data/                   # SQLite DB + chave de criptografia
├── frontend/
│   ├── Dockerfile              # Imagem Node do frontend
│   ├── vite.config.js          # Configuração Vite + proxy API
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx             # Router principal
│   │   ├── main.jsx            # Entrypoint React
│   │   ├── index.css           # Estilos Tailwind
│   │   ├── components/
│   │   │   ├── AISettingsModal.jsx  # Modal de configuração de IA
│   │   │   ├── ExportButton.jsx     # Botão de exportar PDF
│   │   │   ├── HeaderCard.jsx       # Card de header analisado
│   │   │   ├── Layout.jsx           # Layout com navbar e footer
│   │   │   ├── Logo.jsx             # Logo SVG
│   │   │   └── ScoreGauge.jsx       # Gauge visual do score
│   │   ├── lib/
│   │   │   ├── api.js          # Client API + gerenciamento de device/keys
│   │   │   └── utils.js        # Helpers (formatDate, severityConfig, etc.)
│   │   └── pages/
│   │       ├── Home.jsx        # Página inicial com input de URL
│   │       ├── Result.jsx      # Resultado da análise
│   │       ├── History.jsx     # Histórico de análises
│   │       └── Compare.jsx     # Comparação lado a lado
│   └── public/
└── README.md
```

---

## ⚙️ Como Rodar

### Opção 1 — Docker (recomendado)

Pré-requisitos: [Docker](https://www.docker.com/) e Docker Compose instalados.

```bash
git clone https://github.com/seu-usuario/secheaders.git
cd secheaders
docker compose up -d --build
```

Pronto. Acesse:

| Serviço  | URL                        |
| -------- | -------------------------- |
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

> **Nota:** O SecHeaders já vem com um LLM padrão configurado (OpenRouter com modelo gratuito).
> Você pode usar a IA imediatamente sem precisar configurar nenhuma API Key.
> Para usar outro provider (OpenAI, Anthropic, Gemini), configure pelo ícone ✨ na navbar.

Para parar:

```bash
docker compose down
```

---

### Opção 2 — Manual (sem Docker)

#### Pré-requisitos

- Python 3.11+
- Node.js 18+

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

Crie um arquivo `.env` (opcional, já possui padrão gratuito):

```env
LLM_PROVIDER=openrouter
LLM_API_KEY=sua-chave-openrouter
LLM_MODEL=stepfun/step-3.5-flash:free
```

```bash
uvicorn main:app --reload
```

Backend disponível em `http://localhost:8000`.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em `http://localhost:5173`.

---

## 🔌 Endpoints da API

### Análise & Histórico

| Método   | Rota            | Descrição                        |
| -------- | --------------- | -------------------------------- |
| `GET`    | `/health`       | Healthcheck da API               |
| `GET`    | `/llm-status`   | Status do LLM padrão do servidor |
| `POST`   | `/analyze`      | Analisa os headers de uma URL    |
| `POST`   | `/models`       | Lista modelos de um provider     |
| `GET`    | `/history`      | Lista histórico de análises      |
| `GET`    | `/history/{id}` | Retorna uma análise específica   |
| `DELETE` | `/history`      | Limpa todo o histórico           |
| `GET`    | `/export/{id}`  | Exporta análise em PDF           |

### Gerenciamento de API Keys

| Método   | Rota                               | Descrição                                  |
| -------- | ---------------------------------- | ------------------------------------------ |
| `POST`   | `/api-keys/store`                  | Armazena API key criptografada             |
| `GET`    | `/api-keys/{device_id}`            | Lista keys do dispositivo (apenas hints)   |
| `DELETE` | `/api-keys/{device_id}/{provider}` | Remove key de um provider                  |
| `PUT`    | `/api-keys/model`                  | Atualiza modelo selecionado de um provider |
| `POST`   | `/api-keys/models`                 | Lista modelos usando key armazenada        |

### Exemplo de requisição

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exemplo.com"}'
```

### Exemplo de resposta

```json
{
  "url": "https://exemplo.com",
  "score": 45,
  "classification": "Regular",
  "summary": "O site possui configurações básicas de segurança, mas está vulnerável a ataques de XSS e Clickjacking devido à ausência de CSP e X-Frame-Options.",
  "headers": [
    {
      "name": "Content-Security-Policy",
      "present": false,
      "severity": "critical",
      "issues": ["Header ausente"],
      "explanation": "A ausência do Content-Security-Policy deixa o site vulnerável a ataques de Cross-Site Scripting (XSS)..."
    }
  ]
}
```

---

## 🧠 Como a IA é utilizada

O SecHeaders suporta **4 providers de LLM**:

| Provider       | Modelos                                | Observação                        |
| -------------- | -------------------------------------- | --------------------------------- |
| **OpenRouter** | `stepfun/step-3.5-flash:free` e outros | **Padrão do servidor** (gratuito) |
| **OpenAI**     | GPT-4o, GPT-4, GPT-3.5-turbo, etc.     | Requer API Key                    |
| **Anthropic**  | Claude Sonnet, Haiku, Opus             | Requer API Key                    |
| **Google**     | Gemini 2.0, 1.5, etc.                  | Requer API Key                    |

### Configuração pela interface

1. Clique no ícone **✨ IA** na navbar
2. Selecione o provider desejado
3. Cole sua API Key — ela será **criptografada no servidor** e nunca mais retornada
4. Escolha o modelo
5. Salve — um banner indica qual provider está ativo

> **Sem configuração:** a IA padrão do servidor (OpenRouter gratuito) é usada automaticamente.
> **Com configuração:** o provider selecionado tem prioridade sobre o padrão.

### Segurança das API Keys

- As chaves são criptografadas com **Fernet** (AES-128-CBC + HMAC-SHA256) antes de serem armazenadas
- A chave de criptografia é gerada automaticamente na primeira execução (`data/.encryption_key`, chmod 600)
- O frontend nunca recebe a chave real — apenas um hint (`•••` + últimos 4 caracteres)
- As chaves são isoladas por **device_id** (UUID gerado por dispositivo/navegador)

### Resolução de LLM (prioridade)

1. API Key direta no header (legacy)
2. Device ID + provider → descriptografa chave armazenada no banco
3. Fallback → LLM padrão do servidor (variáveis de ambiente)

### O que a IA gera

Para cada header com problema, a IA gera uma análise estruturada com **5 seções**:

1. **O que é este header** — explicação didática
2. **Risco real** — impacto concreto da vulnerabilidade
3. **Exemplos de ataque** — comandos reproduzíveis em ambiente controlado
4. **Como corrigir** — configurações para Nginx, Apache, Node.js, etc.
5. **Teste de validação** — comandos para verificar a correção

Além disso, gera um **Relatório Executivo** com visão geral, vulnerabilidades críticas, superfície de ataque e plano de correção priorizado.

---

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia    | Versão  | Uso                            |
| ------------- | ------- | ------------------------------ |
| FastAPI       | 0.115.6 | Framework web                  |
| Uvicorn       | 0.34.0  | Servidor ASGI                  |
| SQLAlchemy    | 2.0.36  | ORM assíncrono                 |
| aiosqlite     | 0.20.0  | Driver SQLite async            |
| httpx         | 0.28.1  | Client HTTP para fetch headers |
| OpenAI SDK    | 1.58.1  | Client OpenAI + OpenRouter     |
| Anthropic SDK | 0.42.0  | Client Anthropic               |
| google-genai  | 1.12.1  | Client Google Gemini           |
| ReportLab     | 4.2.5   | Geração de PDF                 |
| cryptography  | 44.0.3  | Criptografia Fernet            |
| Pydantic      | 2.10.4  | Validação de dados             |

### Frontend

| Tecnologia               | Versão | Uso                      |
| ------------------------ | ------ | ------------------------ |
| React                    | 19.0   | UI framework             |
| Vite                     | 6.0    | Build tool + HMR         |
| Tailwind CSS             | 4.0    | Estilização              |
| Framer Motion            | 11.15  | Animações                |
| Lucide React             | 0.468  | Ícones                   |
| React Router DOM         | 7.1    | Roteamento SPA           |
| React Markdown           | 10.1   | Renderização de Markdown |
| React Syntax Highlighter | 16.1   | Highlight de código      |
| Recharts                 | 2.15   | Gráficos                 |

---

## 📸 Screenshots

> _Em breve_

---

## 🗺️ Roadmap

- [x] Setup do projeto (Docker Compose + estrutura)
- [x] Coleta e análise de headers HTTP
- [x] Sistema de score com pesos e severidades
- [x] Integração multi-provider LLM (OpenAI, Anthropic, Gemini, OpenRouter)
- [x] LLM padrão gratuito via OpenRouter
- [x] Dashboard React com Tailwind CSS
- [x] Histórico de análises com opção de limpar
- [x] Comparação lado a lado de URLs
- [x] Exportação em PDF
- [x] Armazenamento seguro de API Keys (Fernet)
- [x] Modal de configuração de IA com gerenciamento de providers
- [x] Cache de chamadas LLM
- [ ] Testes automatizados e validação

---

## ⚠️ Limitações Conhecidas

- A ferramenta analisa apenas URLs públicas e acessíveis sem autenticação
- Sites que redirecionam para login podem retornar headers incompletos
- Alguns servidores podem bloquear requisições automatizadas
- O cache de LLM é em memória (reiniciar o servidor limpa o cache)

---

## 🎓 Contexto Acadêmico

Este projeto foi desenvolvido como TCC I do curso de **Sistemas de Informação**.

**Aluno:** Vinícius Lacerda Borges
**Instituição:** UNIFAP — Universidade Federal do Amapá
**Período:** 2026.1

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Referências

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Docs — HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [OpenRouter API](https://openrouter.ai/docs)
