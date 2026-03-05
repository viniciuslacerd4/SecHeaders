# 🛡️ SecHeaders — Roadmap de Desenvolvimento

> Ferramenta web para análise de Security Headers com LLM e dashboard interativo.

---

## 🗂️ Stack do Projeto

| Camada         | Tecnologia                  |
| -------------- | --------------------------- |
| Frontend       | React + Tailwind CSS        |
| Backend        | Python + FastAPI            |
| Banco de Dados | SQLite + SQLAlchemy         |
| LLM            | OpenAI API ou Anthropic API |
| PDF            | ReportLab                   |
| Versionamento  | Git + GitHub                |

---

## 📁 Estrutura de Pastas

```
secheaders/
├── backend/
│   ├── main.py               # Entrypoint FastAPI
│   ├── analyzer.py           # Lógica de análise de headers
│   ├── scorer.py             # Cálculo do score de segurança
│   ├── llm.py                # Integração com LLM
│   ├── pdf_export.py         # Geração de PDF
│   ├── database.py           # Configuração SQLite
│   ├── models.py             # Modelos do banco
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScoreGauge.jsx
│   │   │   ├── HeaderCard.jsx
│   │   │   ├── CompareView.jsx
│   │   │   ├── HistoryTable.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Result.jsx
│   │   │   ├── Compare.jsx
│   │   │   └── History.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## 🚀 Fases de Desenvolvimento

---

### FASE 1 — Setup e Fundação

> Objetivo: projeto rodando do zero, sem funcionalidade ainda.

#### 1.1 Configurar repositório

- [x] Criar repositório no GitHub
- [x] Criar `.gitignore` para Python e Node
- [x] Criar `README.md` inicial com descrição do projeto

#### 1.2 Setup do Backend

- [x] Criar ambiente virtual Python (`python -m venv venv`)
- [x] Instalar dependências iniciais:
  ```
  fastapi
  uvicorn
  httpx
  python-dotenv
  sqlalchemy
  ```
- [x] Criar `main.py` com rota de healthcheck (`GET /health`)
- [x] Testar servidor rodando (`uvicorn main:app --reload`)

#### 1.3 Setup do Frontend

- [x] Criar projeto React com Vite (`npm create vite@latest`)
- [x] Instalar Tailwind CSS
- [x] Instalar React Router (`npm install react-router-dom`)
- [x] Criar estrutura de pastas (`pages/`, `components/`)
- [x] Criar página Home com campo de input de URL (só visual por enquanto)
- [x] Configurar proxy do Vite apontando para o backend (`localhost:8000`)

**✅ Entregável da Fase 1:** Frontend e backend rodando localmente, se comunicando.

---

### FASE 2 — Coleta e Análise de Headers

> Objetivo: dado uma URL, coletar e analisar os headers HTTP.

#### 2.1 Coletor de Headers

- [x] Criar `analyzer.py`
- [x] Implementar função `fetch_headers(url: str) -> dict` usando `httpx`
- [x] Tratar erros: URL inválida, timeout, site fora do ar
- [x] Testar com URLs reais no terminal

#### 2.2 Regras de Análise

Implementar verificação para cada header abaixo:

| Header                      | O que verificar                                       |
| --------------------------- | ----------------------------------------------------- |
| `Strict-Transport-Security` | Presente? Tem `max-age`? Tem `includeSubDomains`?     |
| `Content-Security-Policy`   | Presente? Tem diretivas mínimas? Usa `unsafe-inline`? |
| `X-Frame-Options`           | Presente? Valor é `DENY` ou `SAMEORIGIN`?             |
| `X-Content-Type-Options`    | Presente? Valor é `nosniff`?                          |
| `Referrer-Policy`           | Presente? Valor é restritivo?                         |
| `Permissions-Policy`        | Presente?                                             |
| `Set-Cookie`                | Tem flag `Secure`? Tem `HttpOnly`? Tem `SameSite`?    |

- [x] Para cada header, retornar: `{ present: bool, value: str, issues: list[str], severity: "low" | "medium" | "high" | "critical" }`

#### 2.3 Sistema de Score

- [x] Criar `scorer.py`
- [x] Definir pesos por header (exemplo):
  ```
  HSTS           → 20 pontos
  CSP            → 25 pontos
  X-Frame        → 15 pontos
  X-Content-Type → 10 pontos
  Referrer-Policy→ 10 pontos
  Permissions    → 10 pontos
  Set-Cookie     → 10 pontos
  ```
- [x] Score parcial por configuração (ex: HSTS presente mas sem `includeSubDomains` = 50% dos pontos)
- [x] Retornar score final de 0 a 100 com classificação:
  - 0–40 → 🔴 Crítico
  - 41–70 → 🟡 Regular
  - 71–90 → 🟢 Bom
  - 91–100 → ✅ Excelente

#### 2.4 Rota da API

- [x] Criar `POST /analyze` que recebe `{ url: string }` e retorna análise completa + score
- [x] Testar com Postman ou Thunder Client

**✅ Entregável da Fase 2:** API retornando análise completa de headers com score para qualquer URL.

---

### FASE 3 — Integração com LLM

> Objetivo: gerar explicações em linguagem natural para cada problema encontrado.

#### 3.1 Configurar acesso à API

- [x] Criar conta na OpenAI ou Anthropic
- [x] Gerar API Key
- [x] Salvar em `.env` (`LLM_API_KEY=...`)
- [x] Instalar SDK (`openai` ou `anthropic`)

#### 3.2 Implementar `llm.py`

- [x] Criar função `explain_header(header_name, issues, severity) -> str`
- [x] Criar prompt base:
  ```
  Você é um especialista em segurança web. Explique de forma clara e objetiva,
  em português, o problema encontrado no header {header_name}:
  Problema: {issues}
  Severidade: {severity}
  Explique: o que é esse header, qual o risco real desse problema e como corrigir.
  Máximo de 3 parágrafos curtos.
  ```
- [x] Testar com diferentes headers e avaliar qualidade das respostas
- [x] Ajustar prompt até obter respostas consistentes e úteis

#### 3.3 Integrar ao fluxo de análise

- [x] Chamar `explain_header()` para cada header com problema encontrado
- [x] Incluir explicação no retorno do `POST /analyze`
- [x] Adicionar campo `summary` com resumo geral da análise (também via LLM)

#### 3.4 Otimizações

- [x] Fazer chamadas ao LLM em paralelo (asyncio) para não travar a resposta
- [x] Adicionar cache simples para não chamar o LLM duas vezes para o mesmo header + problema

**✅ Entregável da Fase 3:** API retornando análise + explicações em português geradas por LLM.

---

### FASE 4 — Frontend e Dashboard

> Objetivo: interface visual completa e funcional.

#### 4.1 Página Home

- [x] Input de URL com validação básica
- [x] Botão "Analisar"
- [x] Loading state enquanto aguarda resposta da API
- [x] Redirecionar para página de resultado após análise

#### 4.2 Página de Resultado

- [x] Componente `ScoreGauge` — medidor visual de 0 a 100 (usar recharts ou similar)
- [x] Badge de classificação colorido (Crítico / Regular / Bom / Excelente)
- [x] Lista de `HeaderCard` para cada header analisado:
  - Nome do header
  - Status (✅ OK / ⚠️ Atenção / ❌ Ausente)
  - Severidade com cor
  - Explicação gerada pelo LLM (expansível)
  - Valor atual do header (se presente)
- [x] Resumo geral no topo

#### 4.3 Banco de Dados e Histórico

- [x] Criar `database.py` com SQLite + SQLAlchemy
- [x] Criar tabela `analyses` com campos: `id`, `url`, `score`, `result_json`, `created_at`
- [x] Salvar toda análise automaticamente ao realizar
- [x] Criar `GET /history` retornando lista de análises anteriores
- [x] Criar página History com tabela: URL, Score, Data, botão "Ver novamente"

#### 4.4 Comparação entre URLs

- [x] Criar página Compare com dois inputs de URL
- [x] Chamar `POST /analyze` para ambas em paralelo
- [x] Exibir resultado lado a lado com diff visual (verde/vermelho por header)
- [x] Mostrar qual URL tem score maior

#### 4.5 Exportação PDF

- [x] Instalar ReportLab (`pip install reportlab`)
- [x] Criar `pdf_export.py` que gera PDF com: URL analisada, data, score, tabela de headers, explicações do LLM
- [x] Criar `GET /export/{analysis_id}` que retorna o PDF
- [x] Adicionar botão "Exportar PDF" na página de resultado

**✅ Entregável da Fase 4:** Dashboard completo e funcional com todas as telas.

---

### FASE 5 — Testes, Ajustes e Documentação

> Objetivo: ferramenta estável e TCC escrito.

#### 5.1 Testes

- [ ] Testar com mínimo 20 URLs diferentes (sites grandes, pequenos, governamentais, e-commerce)
- [ ] Documentar os resultados numa planilha (URL, score, principais problemas)
- [ ] Verificar se as explicações do LLM são precisas e úteis
- [ ] Testar casos de borda: URL inválida, site sem HTTPS, timeout

#### 5.2 Ajustes finais

- [x] Corrigir bugs encontrados nos testes
- [x] Melhorar prompts do LLM com base nos resultados
- [ ] Ajustar pesos do score se necessário
- [ ] Revisar responsividade do frontend

#### 5.3 Documentação

- [x] Escrever `README.md` completo com instruções de instalação e uso
- [x] Comentar funções principais do backend
- [ ] Subir código final no GitHub

#### 5.4 Escrita do TCC

- [ ] Introdução e contextualização
- [ ] Revisão bibliográfica (usar referências do documento de proposta)
- [ ] Metodologia e arquitetura
- [ ] Resultados dos testes
- [ ] Conclusão e trabalhos futuros (sugestão: versão como extensão de navegador)

**✅ Entregável da Fase 5:** Ferramenta validada + TCC escrito.

---

## ⚠️ Pontos de Atenção

- **Custo do LLM:** A API da OpenAI/Anthropic é paga por token. Para o TCC, o volume é baixo e o custo será mínimo (menos de R$ 20 no total estimado). Guarde sua API key no `.env` e nunca suba ela pro GitHub.
- **CORS:** Configurar CORS no FastAPI para aceitar requisições do frontend React em desenvolvimento.
- **URLs com autenticação:** A ferramenta analisa apenas headers de respostas públicas. Sites que redirecionam para login podem retornar headers incompletos — isso é uma limitação válida de mencionar no TCC.
- **Rate limiting:** Alguns sites podem bloquear requisições automatizadas. Tratar esse erro graciosamente na UI.

---

## 📌 Ordem recomendada para começar HOJE

1. Criar repositório no GitHub
2. Setup do backend (venv + FastAPI rodando)
3. Implementar `fetch_headers()` e testar no terminal
4. Criar rota `POST /analyze` simples (sem LLM ainda)
5. Conectar o frontend React nessa rota

> Com esses 5 passos você já tem algo funcionando de ponta a ponta, o que é o mais importante pra manter o ritmo. 🚀
