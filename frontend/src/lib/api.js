/**
 * api.js — Helper para chamadas à API do backend SecHeaders.
 *
 * Gerencia device_id, API keys armazenadas no servidor,
 * e comunicação com o backend.
 *
 * Em desenvolvimento: usa proxy do Vite (/api → localhost:8000)
 * Em produção (Vercel): aponta direto para o backend no Render via VITE_API_URL
 */

const BASE = import.meta.env.VITE_API_URL || '/api'
const API_SECRET = import.meta.env.VITE_API_SECRET || ''

// ──────────────────────────────────────────────
//  Device ID — identificador único do dispositivo
// ──────────────────────────────────────────────

const DEVICE_ID_KEY = 'secheaders_device_id'

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getDeviceId() {
  return getOrCreateDeviceId()
}

// ──────────────────────────────────────────────
//  Stored keys state (cache local dos providers salvos)
// ──────────────────────────────────────────────

const STORED_KEYS_CACHE = 'secheaders_stored_keys'

export function getCachedStoredKeys() {
  try {
    const raw = localStorage.getItem(STORED_KEYS_CACHE)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setCachedStoredKeys(keys) {
  localStorage.setItem(STORED_KEYS_CACHE, JSON.stringify(keys))
}

export function getActiveProvider() {
  const active = localStorage.getItem('secheaders_active_provider')
  if (active === '__default__') return null  // Explicitly using server default
  if (active) {
    const keys = getCachedStoredKeys()
    if (keys[active]) return active
  }
  return null  // No explicit choice → use server default
}

export function setActiveProvider(provider) {
  localStorage.setItem('secheaders_active_provider', provider)
}

export function getActiveModel() {
  const provider = getActiveProvider()
  if (!provider) return null
  const keys = getCachedStoredKeys()
  return keys[provider]?.model || null
}

export function hasAnyStoredKey() {
  return Object.keys(getCachedStoredKeys()).length > 0
}

// ──────────────────────────────────────────────
//  HTTP helpers
// ──────────────────────────────────────────────

function llmHeaders() {
  const deviceId = getDeviceId()
  const provider = getActiveProvider()
  const model = getActiveModel()

  const h = {}
  h['X-Device-ID'] = deviceId
  if (provider) h['X-LLM-Provider'] = provider
  if (model) h['X-LLM-Model'] = model
  return h
}

function secretHeader() {
  return API_SECRET ? { 'X-API-Secret': API_SECRET } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...secretHeader(), ...llmHeaders(), ...options.headers },
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
  return res.json()
}

export async function fetchAiReport(analysisId) {
  const res = await request(`/analysis/${analysisId}/report`, { method: 'POST' })
  return res.json()
}

// ──────────────────────────────────────────────
//  Histórico
// ──────────────────────────────────────────────

export async function getHistory(limit = 50, offset = 0) {
  const res = await request(`/history?limit=${limit}&offset=${offset}`)
  return res.json()
}

export async function getAnalysisDetail(id) {
  const res = await request(`/history/${id}`)
  return res.json()
}

export async function clearHistory() {
  const res = await request('/history', { method: 'DELETE' })
  return res.json()
}

// ──────────────────────────────────────────────
//  PDF
// ──────────────────────────────────────────────

export async function exportPdf(id) {
  const res = await fetch(`${BASE}/export/${id}`, {
    headers: { ...secretHeader(), 'X-Device-ID': getDeviceId() },
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

// ──────────────────────────────────────────────
//  Models (com API key direta — usado durante setup)
// ──────────────────────────────────────────────

export async function fetchModels(provider, apiKey) {
  const res = await request('/models', {
    method: 'POST',
    body: JSON.stringify({ provider, api_key: apiKey }),
  })
  const data = await res.json()
  return data.models || []
}

// ──────────────────────────────────────────────
//  API Key storage (seguro no servidor)
// ──────────────────────────────────────────────

export async function storeAPIKey(provider, apiKey, model = '') {
  const deviceId = getDeviceId()
  const res = await request('/api-keys/store', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      provider,
      api_key: apiKey,
      model,
    }),
  })
  const data = await res.json()

  // Atualiza cache local
  const cached = getCachedStoredKeys()
  cached[provider] = { hint: data.hint, model: data.model || model, updated_at: new Date().toISOString() }
  setCachedStoredKeys(cached)
  setActiveProvider(provider)

  return data
}

export async function fetchStoredKeys() {
  const deviceId = getDeviceId()
  const res = await request(`/api-keys/${deviceId}`)
  const data = await res.json()

  // Atualiza cache local
  const cached = {}
  for (const k of data.keys || []) {
    cached[k.provider] = { hint: k.hint, model: k.model, updated_at: k.updated_at }
  }
  setCachedStoredKeys(cached)

  return cached
}

export async function deleteStoredKey(provider) {
  const deviceId = getDeviceId()
  await request(`/api-keys/${deviceId}/${provider}`, { method: 'DELETE' })

  // Atualiza cache local
  const cached = getCachedStoredKeys()
  delete cached[provider]
  setCachedStoredKeys(cached)

  // Se era o provider ativo, limpa
  if (getActiveProvider() === provider) {
    const remaining = Object.keys(cached)
    if (remaining.length > 0) {
      setActiveProvider(remaining[0])
    } else {
      localStorage.removeItem('secheaders_active_provider')
    }
  }
}

export async function updateStoredModel(provider, model) {
  const deviceId = getDeviceId()
  await request('/api-keys/model', {
    method: 'PUT',
    body: JSON.stringify({ device_id: deviceId, provider, model }),
  })

  // Atualiza cache local
  const cached = getCachedStoredKeys()
  if (cached[provider]) {
    cached[provider].model = model
    setCachedStoredKeys(cached)
  }
}

export async function fetchStoredModels(provider) {
  const deviceId = getDeviceId()
  const res = await request('/api-keys/models', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, provider }),
  })
  const data = await res.json()
  return data.models || []
}
