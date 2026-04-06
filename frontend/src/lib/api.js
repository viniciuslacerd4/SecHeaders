/**
 * api.js — Helper para chamadas à API do backend SecHeaders.
 *
 * Versão simplificada sem banco de dados:
 * - Histórico é salvo no localStorage
 * - API keys não são mais armazenadas no servidor
 *
 * Em desenvolvimento: usa proxy do Vite (/api → localhost:8000)
 * Em produção (Vercel): aponta direto para o backend no Render via VITE_API_URL
 */

const BASE = import.meta.env.VITE_API_URL || '/api'
const API_SECRET = import.meta.env.VITE_API_SECRET || ''

// ──────────────────────────────────────────────
//  HTTP helpers
// ──────────────────────────────────────────────

function secretHeader() {
  return API_SECRET ? { 'X-API-Secret': API_SECRET } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...secretHeader(), ...options.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body.detail
      ? typeof body.detail === 'string'
        ? body.detail
        : body.detail[0]?.msg || 'Erro desconhecido'
      : `Erro ${res.status}`
    throw new Error(message)
  }

  return res
}

// ──────────────────────────────────────────────
//  Análise
// ──────────────────────────────────────────────

export async function analyzeUrl(url) {
  const res = await request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
  const data = await res.json()

  // Gera um ID local para a análise
  const localId = crypto.randomUUID()
  const analysis = {
    ...data,
    id: localId,
    created_at: new Date().toISOString(),
    explanations: {},
    summary: '',
  }

  // Salva no histórico local
  saveToHistory(analysis)

  return analysis
}

export async function fetchAiReport(analysisData) {
  // Recebe os dados da análise ao invés de um ID
  const res = await request('/report', {
    method: 'POST',
    body: JSON.stringify({
      url: analysisData.url,
      headers: analysisData.headers,
      score: analysisData.score,
    }),
  })
  const report = await res.json()

  // Atualiza a análise no histórico local
  updateHistoryItem(analysisData.id, {
    explanations: report.explanations,
    summary: report.summary,
  })

  return report
}

// ──────────────────────────────────────────────
//  Histórico (localStorage)
// ──────────────────────────────────────────────

const HISTORY_KEY = 'secheaders_history'
const MAX_HISTORY = 100

function getHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistoryToStorage(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function saveToHistory(analysis) {
  const history = getHistoryFromStorage()
  // Remove análise existente com mesmo ID (se houver)
  const filtered = history.filter((h) => h.id !== analysis.id)
  // Adiciona nova análise no início
  filtered.unshift(analysis)
  // Limita o tamanho do histórico
  const trimmed = filtered.slice(0, MAX_HISTORY)
  saveHistoryToStorage(trimmed)
}

function updateHistoryItem(id, updates) {
  const history = getHistoryFromStorage()
  const index = history.findIndex((h) => h.id === id)
  if (index !== -1) {
    history[index] = { ...history[index], ...updates }
    saveHistoryToStorage(history)
  }
}

export function getHistory(limit = 50) {
  const history = getHistoryFromStorage()
  return history.slice(0, limit).map((h) => ({
    id: h.id,
    url: h.url,
    score: h.score?.total_score || 0,
    classification: h.score?.classification || 'Regular',
    created_at: h.created_at,
  }))
}

export function getAnalysisDetail(id) {
  const history = getHistoryFromStorage()
  const analysis = history.find((h) => h.id === id)
  if (!analysis) return null
  return {
    id: analysis.id,
    url: analysis.url,
    headers: analysis.headers,
    score: analysis.score,
    explanations: analysis.explanations || {},
    summary: analysis.summary || '',
    created_at: analysis.created_at,
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ──────────────────────────────────────────────
//  PDF
// ──────────────────────────────────────────────

export async function exportPdf(analysisData) {
  const res = await fetch(`${BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...secretHeader() },
    body: JSON.stringify({
      url: analysisData.url,
      headers: analysisData.headers,
      score: analysisData.score,
      explanations: analysisData.explanations || {},
      summary: analysisData.summary || '',
    }),
  })
  if (!res.ok) throw new Error('Erro ao exportar PDF')
  return res.blob()
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ──────────────────────────────────────────────
//  LLM Status
// ──────────────────────────────────────────────

export async function fetchLLMStatus() {
  const res = await request('/llm-status')
  return res.json()
}
