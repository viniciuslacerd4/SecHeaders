<div align="center">
  <img src="frontend/public/SecHeaders.png" alt="SecHeaders" width="96" />

  # SecHeaders

  **Ferramenta web para análise automatizada de segurança em cabeçalhos HTTP com explicações geradas por IA, trilha de aprendizado interativa e dashboard completo.**

  ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
  ![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react&logoColor=black)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-green?style=flat)
</div>

---

## 📌 Sobre o Projeto

O **SecHeaders** é uma ferramenta de análise de segurança web desenvolvida como Trabalho de Conclusão de Curso (TCC) no curso de Sistemas de Informação da UNIFAP.

A ferramenta analisa os cabeçalhos HTTP de segurança de qualquer URL pública e utiliza um **Large Language Model (LLM)** via [OpenRouter](https://openrouter.ai) para gerar explicações em linguagem natural sobre as vulnerabilidades encontradas — tornando o resultado acessível tanto para desenvolvedores iniciantes quanto para analistas de segurança experientes.

### O problema que resolve

Ferramentas existentes como o `securityheaders.com` identificam problemas mas não explicam seu impacto real. O SecHeaders preenche essa lacuna: além de identificar, ele **ensina** o que está errado, como corrigir e oferece uma trilha de aprendizado completa sobre Security Headers.

---

## ✨ Funcionalidades

- 🔍 **Análise de 7 security headers** — verifica presença, ausência e qualidade de configuração dos principais cabeçalhos de segurança
- 🤖 **Explicações com IA** — usa LLM (OpenRouter) para gerar descrições claras sobre cada vulnerabilidade com exemplos de ataque e correções
- 📊 **Score de segurança** — pontuação de 0 a 100 com classificação visual (Crítico / Regular / Bom / Excelente)
- 📋 **Histórico de análises** — armazenado localmente no `localStorage` do navegador
- ⚖️ **Comparação de URLs** — analisa duas URLs lado a lado com diff visual
- 📄 **Exportação em PDF** — gera relatório completo com ReportLab (A4)
- ⚡ **Cache inteligente** — cache em memória para evitar chamadas duplicadas ao LLM
- 📚 **Trilha de aprendizado** — roadmap estilo Duolingo com 12 lições, quizzes adaptativos (75% de aprovação), XP e progresso persistido no `localStorage`
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
│   ├── Dockerfile
│   ├── main.py                 # Entrypoint FastAPI + rotas
│   ├── analyzer.py             # Lógica de análise de headers
│   ├── scorer.py               # Cálculo do score (pesos + severidade)
│   ├── llm.py                  # Integração OpenRouter + cache
│   ├── pdf_export.py           # Geração de PDF com ReportLab
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Router principal
│       ├── components/
│       │   ├── AnalysisContext.jsx  # Context de estado da análise
│       │   ├── AnalysisToast.jsx    # Toast de progresso de análise
│       │   ├── ExportButton.jsx     # Botão de exportar PDF
│       │   ├── HeaderCard.jsx       # Card de header analisado
│       │   ├── Layout.jsx           # Layout com navbar e footer
│       │   ├── Logo.jsx             # Logo do projeto
│       │   └── ScoreGauge.jsx       # Gauge visual do score
│       ├── data/
│       │   └── learningData.js      # Dados da trilha (12 lições, 84 questões)
│       ├── lib/
│       │   ├── api.js          # Client da API REST
│       │   ├── hackSound.js    # Efeitos sonoros
│       │   └── utils.js        # Helpers (formatDate, severityConfig, etc.)
│       └── pages/
│           ├── Home.jsx        # Análise de URL
│           ├── Result.jsx      # Resultado da análise com relatório IA
│           ├── History.jsx     # Histórico de análises (localStorage)
│           ├── Compare.jsx     # Comparação lado a lado
│           └── Learn.jsx       # Trilha de aprendizado interativa
└── README.md
```

---

## ⚙️ Como Rodar

### Opção 1 — Docker (recomendado)

Pré-requisitos: [Docker](https://www.docker.com/) e Docker Compose instalados.

```bash
git clone https://github.com/viniciuslacerd4/SecHeaders.git
cd SecHeaders
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

```bash
docker compose down   # parar
```

---

### Opção 2 — Manual (sem Docker)

**Pré-requisitos:** Python 3.11+ e Node.js 18+

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

Crie um arquivo `.env` (opcional — possui padrão gratuito):

```env
LLM_API_KEY=sua-chave-openrouter
LLM_MODEL=stepfun/step-3.5-flash:free
```

```bash
uvicorn main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 Endpoints da API

| Método | Rota          | Descrição                                             |
| ------ | ------------- | ----------------------------------------------------- |
| `GET`  | `/health`     | Healthcheck da API                                    |
| `GET`  | `/llm-status` | Status do LLM configurado no servidor                 |
| `POST` | `/analyze`    | Analisa os headers de uma URL e gera explicações de IA|
| `POST` | `/report`     | Gera relatório executivo de IA para uma análise       |
| `GET`  | `/export`     | Exporta análise em PDF                                |

### Exemplo

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://exemplo.com"}'
```

```json
{
  "url": "https://exemplo.com",
  "score": 45,
  "classification": "Regular",
  "headers": [
    {
      "name": "Content-Security-Policy",
      "present": false,
      "severity": "critical",
      "explanation": "A ausência do CSP deixa o site vulnerável a ataques XSS..."
    }
  ]
}
```

---

## 🧠 Como a IA é utilizada

O SecHeaders utiliza exclusivamente o **OpenRouter** como provider de LLM, por meio do OpenAI SDK apontado para a API do OpenRouter. O modelo padrão é gratuito (`stepfun/step-3.5-flash:free`) e não requer nenhuma configuração.

Para cada header com problema, a IA gera uma análise estruturada com 5 seções: **O que é**, **Risco real**, **Exemplos de ataque**, **Como corrigir** e **Teste de validação**. Além disso, gera um **Relatório Executivo** completo.

---

## 📚 Trilha de Aprendizado

A página **Aprender** oferece um roadmap interativo com:

- **4 módulos** progressivos (Fundamentos → Transporte → Cross-Origin → Cache)
- **12 lições** cobrindo todos os Security Headers analisados
- **84 questões** no total — 7 por lição, 5 sorteadas aleatoriamente a cada tentativa
- **Sistema de aprovação** — mínimo 75% de acertos para concluir a lição
- **XP e progresso** persistidos no `localStorage`
- Desbloqueio sequencial: módulo seguinte só abre após completar o anterior

---

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia  | Versão  | Uso                        |
| ----------- | ------- | -------------------------- |
| FastAPI     | 0.115.6 | Framework web              |
| Uvicorn     | 0.34.0  | Servidor ASGI              |
| OpenAI SDK  | 1.58.1  | Client OpenRouter          |
| ReportLab   | 4.2.5   | Geração de PDF             |
| Pydantic    | 2.10.4  | Validação de dados         |

### Frontend

| Tecnologia               | Versão | Uso                        |
| ------------------------ | ------ | -------------------------- |
| React                    | 19.0   | UI framework               |
| Vite                     | 6.0    | Build tool + HMR           |
| Tailwind CSS             | 4.0    | Estilização                |
| Framer Motion            | 11.15  | Animações                  |
| Phosphor Icons           | 2.1.10 | Biblioteca de ícones       |
| React Router DOM         | 7.1    | Roteamento SPA             |
| React Markdown           | 10.1   | Renderização de Markdown   |
| React Syntax Highlighter | 16.1   | Highlight de código        |
| Recharts                 | 2.15   | Gráficos                   |

---

## 🗺️ Roadmap

- [x] Setup do projeto (Docker Compose + estrutura)
- [x] Coleta e análise de headers HTTP
- [x] Sistema de score com pesos e severidades
- [x] Integração LLM via OpenRouter (modelo gratuito padrão)
- [x] Dashboard React com Tailwind CSS
- [x] Histórico de análises via localStorage
- [x] Comparação lado a lado de URLs
- [x] Exportação em PDF
- [x] Cache de chamadas LLM
- [x] Trilha de aprendizado interativa (12 lições, quizzes, XP)
- [ ] Testes automatizados e validação

---

## ⚠️ Limitações Conhecidas

- A ferramenta analisa apenas URLs públicas e acessíveis sem autenticação
- Sites que redirecionam para login podem retornar headers incompletos
- Alguns servidores podem bloquear requisições automatizadas
- O cache de LLM é em memória (reiniciar o servidor limpa o cache)
- O histórico de análises é local ao navegador (não sincroniza entre dispositivos)

---

## 🎓 Contexto Acadêmico

**Aluno:** Vinícius Lacerda Borges
**Curso:** Sistemas de Informação
**Instituição:** Centro Universitário Paraíso (UniFAP) — Juazeiro do Norte, CE
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
