# 🛡️ SecHeaders

> Ferramenta web para análise automatizada de segurança em cabeçalhos HTTP com explicações geradas por IA e dashboard interativo.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## 📌 Sobre o Projeto

O **SecHeaders** é uma ferramenta de análise de segurança web desenvolvida como Trabalho de Conclusão de Curso (TCC) no curso de Sistemas de Informação.

A ferramenta analisa os cabeçalhos HTTP de segurança de qualquer URL pública e utiliza um **Large Language Model (LLM)** para gerar explicações em linguagem natural sobre as vulnerabilidades encontradas — tornando o resultado acessível tanto para desenvolvedores iniciantes quanto para analistas de segurança experientes.

### O problema que resolve

Ferramentas existentes como o `securityheaders.com` identificam problemas mas não explicam seu impacto real. O SecHeaders preenche essa lacuna: além de identificar, ele **ensina** o que está errado e como corrigir.

---

## ✨ Funcionalidades

- 🔍 **Análise de headers HTTP** — verifica presença, ausência e qualidade de configuração dos principais security headers
- 🤖 **Explicações com IA** — usa LLM para gerar descrições claras sobre cada vulnerabilidade encontrada
- 📊 **Score de segurança** — pontuação de 0 a 100 com classificação visual (Crítico / Regular / Bom / Excelente)
- 📋 **Histórico de análises** — armazena análises anteriores para consulta
- ⚖️ **Comparação de URLs** — analisa duas URLs lado a lado com diff visual
- 📄 **Exportação em PDF** — gera relatório completo da análise

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
secheaders/
├── docker-compose.yml          # Orquestração dos containers
├── backend/
│   ├── Dockerfile              # Imagem Python do backend
│   ├── main.py                 # Entrypoint FastAPI
│   ├── analyzer.py             # Lógica de análise de headers
│   ├── scorer.py               # Cálculo do score de segurança
│   ├── llm.py                  # Integração com LLM (OpenAI/Anthropic/Gemini)
│   ├── pdf_export.py           # Geração de PDF com ReportLab
│   ├── database.py             # Configuração SQLite + SQLAlchemy
│   ├── models.py               # Modelos do banco
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile              # Imagem Node do frontend
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── lib/                # Utilitários e API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
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

> **Nota:** Não é necessário configurar nenhum arquivo `.env` para começar.
> A chave de API da IA é configurada diretamente pela interface (veja a seção _Como a IA é utilizada_).

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

| Método | Rota            | Descrição                      |
| ------ | --------------- | ------------------------------ |
| `GET`  | `/health`       | Healthcheck da API             |
| `POST` | `/analyze`      | Analisa os headers de uma URL  |
| `GET`  | `/history`      | Lista histórico de análises    |
| `GET`  | `/history/{id}` | Retorna uma análise específica |
| `GET`  | `/export/{id}`  | Exporta análise em PDF         |

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

O SecHeaders suporta **3 providers de LLM**: OpenAI (GPT), Anthropic (Claude) e Google (Gemini).

A configuração é feita **pela própria interface**, sem necessidade de editar arquivos:

1. Clique no ícone de engrenagem (⚙️) no canto superior direito
2. Selecione o provider (OpenAI, Anthropic ou Gemini)
3. Cole sua API Key
4. Escolha o modelo desejado
5. Salve — a configuração fica armazenada no navegador (localStorage)

Para cada header com problema, a IA gera uma análise estruturada com **5 seções**:

1. **O que é este header** — explicação didática
2. **Risco real** — impacto concreto da vulnerabilidade
3. **Exemplos de ataque** — comandos reproduzíveis em ambiente controlado
4. **Como corrigir** — configurações para Nginx, Apache, etc.
5. **Teste de validação** — comandos para o Blue Team verificar a correção

Além disso, gera um **Relatório Executivo** com visão geral, vulnerabilidades críticas, superfície de ataque e plano de correção priorizado.

> Se nenhuma API Key for configurada, a análise de headers e o score funcionam normalmente — apenas as explicações de IA não são geradas.

---

## 📸 Screenshots

> _Em breve_

---

## 🗺️ Roadmap

- [x] Setup do projeto
- [x] Coleta e análise de headers
- [x] Sistema de score
- [x] Integração com LLM (OpenAI, Anthropic e Google Gemini)
- [x] Dashboard React
- [x] Histórico de análises
- [x] Comparação de URLs
- [x] Exportação PDF
- [ ] Testes e validação

---

## ⚠️ Limitações Conhecidas

- A ferramenta analisa apenas URLs públicas e acessíveis sem autenticação
- Sites que redirecionam para login podem retornar headers incompletos
- Alguns servidores podem bloquear requisições automatizadas

---

## 🎓 Contexto Acadêmico

Este projeto foi desenvolvido como TCC I do curso de **Sistemas de Informação**.

**Aluno:** Vinicius Lacerda Borges  
**Orientador:** Jhonatta Pietro de Oliveira  
**Instituição:** Centro Universitário Paraíso — UniFAP  
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
