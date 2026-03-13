import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Check, ChevronDown, RefreshCw, AlertCircle, Zap, Trash2, Shield, KeyRound, Save } from 'lucide-react'
import {
  fetchLLMStatus,
  fetchModels,
  fetchStoredKeys,
  fetchStoredModels,
  storeAPIKey,
  deleteStoredKey,
  updateStoredModel,
  getCachedStoredKeys,
  hasAnyStoredKey,
  getActiveProvider,
  setActiveProvider as setActiveProviderAPI,
} from '../lib/api'

const PROVIDERS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    placeholder: 'sk-or-...',
  },
]

const DEFAULT_LLM_CACHE_KEY = 'secheaders_default_llm'

export function getDefaultLLMStatus() {
  try {
    const raw = localStorage.getItem(DEFAULT_LLM_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isDefaultLLMAvailable() {
  const status = getDefaultLLMStatus()
  return status?.available === true
}

export function isLLMConfigured() {
  return hasAnyStoredKey()
}

export default function AISettingsModal({ isOpen, onClose }) {
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [storedKeys, setStoredKeys] = useState(getCachedStoredKeys())
  const [defaultLLM, setDefaultLLM] = useState(getDefaultLLMStatus())

  // Input state (only when adding new key)
  const [apiKey, setApiKey] = useState('')
  const [editingProvider, setEditingProvider] = useState(null)

  // Models state
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')

  // Actions state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [justSaved, setJustSaved] = useState(null)

  const modalRef = useRef(null)
  const modelDropdownRef = useRef(null)

  // ──────────────────────────────────────────────
  //  Load data on open
  // ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setApiKey('')
      setEditingProvider(null)
      setModels([])
      setModelsError('')
      setModelOpen(false)
      setJustSaved(null)
      setSaving(false)

      // Refresh stored keys from backend
      fetchStoredKeys()
        .then((keys) => setStoredKeys(keys))
        .catch(() => setStoredKeys(getCachedStoredKeys()))

      // Refresh default LLM status
      if (!defaultLLM) {
        fetchLLMStatus()
          .then((status) => {
            setDefaultLLM(status)
            localStorage.setItem(DEFAULT_LLM_CACHE_KEY, JSON.stringify(status))
          })
          .catch(() => { })
      }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Close model dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ──────────────────────────────────────────────
  //  Load models for a saved provider
  // ──────────────────────────────────────────────

  const loadModelsForSaved = useCallback(async (provId) => {
    setModelsLoading(true)
    setModelsError('')
    try {
      const result = await fetchStoredModels(provId)
      setModels(result)
      const current = storedKeys[provId]?.model
      if (current && result.includes(current)) {
        setSelectedModel(current)
      } else if (result.length > 0) {
        setSelectedModel(result[0])
      }
    } catch (err) {
      setModelsError(err.message || 'Erro ao carregar modelos')
      setModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [storedKeys])

  // When expanding a provider with saved key, load its models
  useEffect(() => {
    if (selectedProvider && storedKeys[selectedProvider] && !editingProvider) {
      setSelectedModel(storedKeys[selectedProvider]?.model || '')
      loadModelsForSaved(selectedProvider)
    }
  }, [selectedProvider])

  // ──────────────────────────────────────────────
  //  Handlers
  // ──────────────────────────────────────────────

  function handleProviderClick(provId) {
    if (selectedProvider === provId && !editingProvider) {
      setSelectedProvider(null)
      setModels([])
      setModelsError('')
      return
    }
    setSelectedProvider(provId)
    setEditingProvider(null)
    setApiKey('')
    setModels([])
    setModelsError('')
    setModelOpen(false)
  }

  function handleStartEditing(provId) {
    setEditingProvider(provId)
    setSelectedProvider(provId)
    setApiKey('')
    setModels([])
    setModelsError('')
  }

  async function handleSaveKey() {
    const provId = editingProvider || selectedProvider
    if (!apiKey.trim() || !provId) return
    setSaving(true)
    setModelsError('')
    try {
      // Primeiro valida buscando modelos
      const modelsList = await fetchModels(provId, apiKey.trim())
      const defaultModel = PROVIDERS.find(p => p.id === provId)?.defaultModel || ''
      const modelToSave = modelsList.includes(defaultModel) ? defaultModel : (modelsList[0] || defaultModel)

      await storeAPIKey(provId, apiKey.trim(), modelToSave)

      // Refresh state
      const keys = await fetchStoredKeys()
      setStoredKeys(keys)
      setEditingProvider(null)
      setApiKey('')
      setJustSaved(provId)
      setModels(modelsList)
      setSelectedModel(modelToSave)

      setTimeout(() => setJustSaved(null), 2000)
    } catch (err) {
      setModelsError(err.message || 'API key inválida ou erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteKey(provId) {
    setDeleting(provId)
    try {
      await deleteStoredKey(provId)
      const keys = await fetchStoredKeys()
      setStoredKeys(keys)
      if (selectedProvider === provId) {
        setSelectedProvider(null)
        setModels([])
      }
    } catch (err) {
      // silently fail
    } finally {
      setDeleting(null)
    }
  }

  async function handleModelChange(model) {
    setSelectedModel(model)
    setModelOpen(false)
    if (selectedProvider && storedKeys[selectedProvider]) {
      try {
        await updateStoredModel(selectedProvider, model)
        setStoredKeys(prev => ({
          ...prev,
          [selectedProvider]: { ...prev[selectedProvider], model }
        }))
      } catch { }
    }
  }

  function handleSetActive(provId) {
    setActiveProviderAPI(provId)
    // Force re-render to update banner
    setStoredKeys({ ...storedKeys })
  }

  function handleUseDefault() {
    localStorage.setItem('secheaders_active_provider', '__default__')
    setStoredKeys({ ...storedKeys })
  }

  const activeProvider = getActiveProvider()

  // ──────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className="relative w-full max-w-lg bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden max-h-[85dvh] flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header gradient */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600/15 border border-primary-500/20">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-surface-100">Configuração de IA</h2>
                  <p className="text-xs text-surface-400">Configure sua API key do OpenRouter</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
              {/* Active provider banner */}
              {activeProvider && storedKeys[activeProvider] ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl ${PROVIDERS.find(p => p.id === activeProvider)?.bg || 'bg-primary-500/10'
                    } border ${PROVIDERS.find(p => p.id === activeProvider)?.border || 'border-primary-500/20'
                    }`}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${PROVIDERS.find(p => p.id === activeProvider)?.color || 'text-primary-400'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${PROVIDERS.find(p => p.id === activeProvider)?.color || 'text-primary-300'
                      }`}>
                      Usando {PROVIDERS.find(p => p.id === activeProvider)?.name || activeProvider}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Modelo: <span className="text-surface-300 font-mono">{storedKeys[activeProvider]?.model || 'não definido'}</span>
                    </p>
                    {defaultLLM?.available && (
                      <p className="text-xs text-surface-500 mt-1">
                        A IA padrão do servidor ({defaultLLM.provider}/{defaultLLM.model}) não será utilizada.
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : defaultLLM?.available ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                >
                  <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-300">IA integrada ativa</p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      O SecHeaders já possui uma IA configurada (<span className="text-surface-300">{defaultLLM.provider}</span> / <span className="text-surface-300 font-mono">{defaultLLM.model}</span>).
                      Você pode analisar sites sem configurar nada!
                    </p>
                    <p className="text-xs text-surface-500 mt-1.5">
                      Se preferir, adicione sua própria API key do OpenRouter abaixo para usar outro modelo.
                    </p>
                  </div>
                </motion.div>
              ) : null}

              {/* Security notice */}
              <div className="flex items-center gap-2 p-2.5 bg-surface-800/40 border border-surface-700/30 rounded-lg">
                <Shield className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                <p className="text-[11px] text-surface-500">
                  API keys são criptografadas no servidor (AES-256). Nunca são expostas após o salvamento.
                </p>
              </div>

              {/* Provider list */}
              <div className="space-y-2">
                {PROVIDERS.map((prov) => {
                  const isSaved = !!storedKeys[prov.id]
                  const isExpanded = selectedProvider === prov.id
                  const isEditing = editingProvider === prov.id
                  const isActive = activeProvider === prov.id
                  const wasJustSaved = justSaved === prov.id

                  return (
                    <motion.div
                      key={prov.id}
                      layout
                      className={`rounded-xl border transition-colors ${isExpanded
                          ? `${prov.border} ${prov.bg}`
                          : 'border-surface-800/50 hover:border-surface-700/60'
                        }`}
                    >
                      {/* Provider row */}
                      <button
                        onClick={() => handleProviderClick(prov.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <span className={`w-2 h-2 rounded-full ${isSaved ? prov.dot : 'bg-surface-600'}`} />
                        <span className={`text-sm font-medium flex-1 ${prov.color}`}>
                          {prov.name}
                        </span>

                        {isSaved && (
                          <span className="flex items-center gap-1.5 text-xs text-surface-400">
                            <KeyRound className="w-3 h-3" />
                            <span className="font-mono">{storedKeys[prov.id].hint}</span>
                          </span>
                        )}

                        {wasJustSaved && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1 text-xs text-green-400"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Salvo
                          </motion.span>
                        )}

                        {isActive && isSaved && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                            Ativo
                          </span>
                        )}

                        <ChevronDown
                          className={`w-4 h-4 text-surface-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, overflow: 'visible', transitionEnd: { overflow: 'visible' } }}
                            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {/* SAVED state: show hint + model selector */}
                              {isSaved && !isEditing && (
                                <>
                                  {/* Model selector */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <label className="text-xs font-medium text-surface-400">Modelo</label>
                                      <button
                                        type="button"
                                        onClick={() => loadModelsForSaved(prov.id)}
                                        disabled={modelsLoading}
                                        className="p-0.5 rounded text-surface-500 hover:text-primary-400 transition-colors disabled:opacity-40"
                                        title="Atualizar modelos"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                                      </button>
                                    </div>

                                    <div ref={modelDropdownRef} className="relative">
                                      <button
                                        type="button"
                                        onClick={() => models.length > 0 && setModelOpen(!modelOpen)}
                                        className={`w-full flex items-center justify-between px-3 py-2 bg-surface-950/50 border border-surface-700/40 rounded-lg text-xs transition-colors ${models.length > 0 ? 'cursor-pointer hover:border-surface-600' : 'cursor-default text-surface-500'
                                          }`}
                                      >
                                        <span className="font-mono truncate">
                                          {modelsLoading ? 'Carregando...' : selectedModel || storedKeys[prov.id]?.model || 'Carregando...'}
                                        </span>
                                        {models.length > 0 && (
                                          <ChevronDown className={`w-3.5 h-3.5 text-surface-500 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
                                        )}
                                        {modelsLoading && <RefreshCw className="w-3.5 h-3.5 text-surface-400 animate-spin" />}
                                      </button>

                                      <AnimatePresence>
                                        {modelOpen && models.length > 0 && (
                                          <motion.div
                                            className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700/60 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                          >
                                            {models.map((m) => (
                                              <button
                                                key={m}
                                                onClick={() => handleModelChange(m)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${selectedModel === m
                                                    ? 'bg-primary-600/15 text-primary-300'
                                                    : 'text-surface-300 hover:bg-surface-700/60'
                                                  }`}
                                              >
                                                <span className="font-mono truncate">{m}</span>
                                                {selectedModel === m && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                                              </button>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {models.length > 0 && (
                                      <p className="mt-1 text-[11px] text-surface-500">
                                        {models.length} modelo{models.length !== 1 ? 's' : ''} disponíve{models.length !== 1 ? 'is' : 'l'}
                                      </p>
                                    )}

                                    {modelsError && (
                                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        <span>{modelsError}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions for saved provider */}
                                  <div className="grid grid-cols-1 sm:flex sm:flex-row items-center gap-2 pt-1">
                                    {!isActive ? (
                                      <button
                                        onClick={() => handleSetActive(prov.id)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary-600/15 text-primary-300 hover:bg-primary-600/25 border border-primary-500/20 transition-colors"
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                        Usar este provider
                                      </button>
                                    ) : defaultLLM?.available ? (
                                      <button
                                        onClick={handleUseDefault}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                        Voltar à IA padrão
                                      </button>
                                    ) : null}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleStartEditing(prov.id)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 bg-surface-800/60 hover:bg-surface-800 border border-surface-700/40 transition-colors"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                        Trocar key
                                      </button>
                                      <button
                                        onClick={() => handleDeleteKey(prov.id)}
                                        disabled={deleting === prov.id}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-red-400 hover:bg-red-500/10 border border-surface-700/40 hover:border-red-500/20 transition-colors disabled:opacity-40"
                                      >
                                        <Trash2 className={`w-3.5 h-3.5 ${deleting === prov.id ? 'animate-spin' : ''}`} />
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* EDITING/NEW state: input field */}
                              {(!isSaved || isEditing) && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                                      {isEditing ? 'Nova API Key' : 'API Key'}
                                    </label>
                                    <input
                                      type="password"
                                      value={apiKey}
                                      onChange={(e) => setApiKey(e.target.value)}
                                      placeholder={prov.placeholder || 'Cole sua API key aqui...'}
                                      className="w-full px-3 py-2.5 bg-surface-950/50 border border-surface-700/40 rounded-lg text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all font-mono"
                                      autoFocus
                                    />
                                    <p className="mt-1 text-[11px] text-surface-500">
                                      A key será criptografada e nunca mais poderá ser visualizada.
                                    </p>
                                  </div>

                                  {modelsError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      <span>{modelsError}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleSaveKey}
                                      disabled={!apiKey.trim() || apiKey.trim().length < 5 || saving}
                                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${apiKey.trim().length >= 5
                                          ? 'bg-primary-600 hover:bg-primary-500 text-white'
                                          : 'bg-surface-800 text-surface-500 cursor-not-allowed'
                                        }`}
                                    >
                                      {saving ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          Validando e salvando...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="w-3.5 h-3.5" />
                                          Salvar key
                                        </>
                                      )}
                                    </button>
                                    {isEditing && (
                                      <button
                                        onClick={() => { setEditingProvider(null); setApiKey(''); setModelsError('') }}
                                        className="px-3 py-2.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 border border-surface-700/40 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
