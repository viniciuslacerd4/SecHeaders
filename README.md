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
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── pages/            # Páginas da aplicação
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- Conta na [OpenAI](https://platform.openai.com) ou [Anthropic](https://console.anthropic.com) para obter uma API Key

---

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/secheaders.git
cd secheaders
```

### 2. Configure o Backend

```bash
cd backend

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instale as dependências
pip install -r requirements.txt

# Crie o arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com sua API Key:

```env
LLM_API_KEY=sua_chave_aqui
LLM_PROVIDER=openai  # ou anthropic
```

Inicie o servidor:

```bash
uvicorn main:app --reload
```

O backend estará disponível em `http://localhost:8000`.
Documentação automática da API em `http://localhost:8000/docs`.

---

### 3. Configure o Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

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

O SecHeaders utiliza LLM (GPT ou Claude) via API para gerar explicações contextualizadas sobre cada problema encontrado. Para cada header com misconfiguration, o modelo recebe:

- Nome do header
- Problema identificado
- Nível de severidade

E retorna em português:

1. O que é esse header
2. Qual o risco real do problema encontrado
3. Como corrigir

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
**Período:** 2026.1 (TCC I)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Referências

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Docs — HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
