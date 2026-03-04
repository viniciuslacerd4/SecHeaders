import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Sparkles, Check, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react'
import { fetchModels } from '../lib/api'

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    color: 'text-green-400',
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    color: 'text-orange-400',
    defaultModel: 'claude-sonnet-4-20250514',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    color: 'text-blue-400',
    defaultModel: 'gemini-2.5-flash',
    placeholder: 'AI...',
  },
]

const STORAGE_KEY = 'secheaders_llm_config'

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.apiKey) return parsed
    return null
  } catch {
    return null
  }
}

export function isLLMConfigured() {
  return getLLMConfig() !== null
}

export default function AISettingsModal({ isOpen, onClose }) {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)

  // Dynamic models state
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const modalRef = useRef(null)
  const dropdownRef = useRef(null)
  const modelDropdownRef = useRef(null)
  const debounceRef = useRef(null)

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)

  // Fetch models from the API
  const loadModels = useCallback(
    async (prov, key) => {
      if (!key || key.length < 5) {
        setModels([])
        setModelsLoaded(false)
        setModelsError('')
        return
      }
      setModelsLoading(true)
      setModelsError('')
      try {
        const result = await fetchModels(prov, key)
        setModels(result)
        setModelsLoaded(true)
        // If current model isn't in the list, select the first one
        if (result.length > 0 && !result.includes(model)) {
          setModel(result[0])
        }
      } catch (err) {
        setModelsError(err.message || 'Erro ao carregar modelos')
        setModels([])
        setModelsLoaded(false)
      } finally {
        setModelsLoading(false)
      }
    },
    [model],
  )

  // Load saved config on open
  useEffect(() => {
    if (isOpen) {
      const config = getLLMConfig()
      if (config) {
        setProvider(config.provider || 'openai')
        setApiKey(config.apiKey || '')
        setModel(config.model || '')
      } else {
        setProvider('openai')
        setApiKey('')
        setModel('')
      }
      setSaved(false)
      setShowKey(false)
      setModels([])
      setModelsLoaded(false)
      setModelsError('')
      setModelOpen(false)
    }
  }, [isOpen])

  // Auto-fetch models when API key is set on open (saved config)
  useEffect(() => {
    if (isOpen && apiKey && apiKey.length >= 5) {
      loadModels(provider, apiKey)
    }
  }, [isOpen]) // intentionally only on open

  // Debounced fetch when apiKey changes
  useEffect(() => {
    if (!isOpen) return
    clearTimeout(debounceRef.current)
    if (apiKey && apiKey.length >= 10) {
      debounceRef.current = setTimeout(() => {
        loadModels(provider, apiKey)
      }, 800)
    } else {
      setModels([])
      setModelsLoaded(false)
      setModelsError('')
    }
    return () => clearTimeout(debounceRef.current)
  }, [apiKey, provider])

  // Set default model when provider changes (if models not loaded)
  useEffect(() => {
    const p = PROVIDERS.find((pr) => pr.id === provider)
    if (p && !model && !modelsLoaded) {
      setModel(p.defaultModel)
    }
  }, [provider])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProviderOpen(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close modal on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  function handleSave() {
    const config = { provider, apiKey: apiKey.trim(), model: model.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 600)
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY)
    setApiKey('')
    setModel('')
    setProvider('openai')
    setModels([])
    setModelsLoaded(false)
    setModelsError('')
    setSaved(false)
  }

  function handleProviderChange(id) {
    setProvider(id)
    const p = PROVIDERS.find((pr) => pr.id === id)
    if (p) setModel(p.defaultModel)
    setProviderOpen(false)
    setModels([])
    setModelsLoaded(false)
    setModelsError('')
  }

  function maskKey(key) {
    if (!key) return ''
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 24)) + key.slice(-4)
  }

  // Displayed models: dynamic list if loaded, else empty (user must connect first)
  const displayModels = modelsLoaded && models.length > 0 ? models : []

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
            className="relative w-full max-w-md bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header gradient */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600/15 border border-primary-500/20">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-surface-100">Configuração de IA</h2>
                  <p className="text-xs text-surface-400">Escolha o provider e insira sua API Key</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6 space-y-5">
              {/* Provider select */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Provider
                </label>
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setProviderOpen(!providerOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-800/80 border border-surface-700/60 rounded-xl text-sm text-surface-100 hover:border-surface-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  >
                    <span className={selectedProvider?.color}>{selectedProvider?.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-surface-400 transition-transform ${providerOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {providerOpen && (
                      <motion.div
                        className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700/60 rounded-xl overflow-hidden shadow-xl z-10"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleProviderChange(p.id)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              provider === p.id
                                ? 'bg-primary-600/15 text-primary-300'
                                : 'text-surface-300 hover:bg-surface-700/60 hover:text-surface-100'
                            }`}
                          >
                            <span className={p.color}>{p.name}</span>
                            {provider === p.id && <Check className="w-4 h-4 text-primary-400" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={showKey ? apiKey : apiKey ? maskKey(apiKey) : ''}
                    onChange={(e) => {
                      setShowKey(true)
                      setApiKey(e.target.value)
                    }}
                    onFocus={() => setShowKey(true)}
                    placeholder={selectedProvider?.placeholder || 'Cole sua API key aqui...'}
                    className="w-full px-4 py-3 pr-12 bg-surface-800/80 border border-surface-700/60 rounded-xl text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-400 hover:text-surface-200 transition-colors"
                    title={showKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showKey ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
                {modelsError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2 text-xs text-red-400"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{modelsError}</span>
                  </motion.div>
                )}
              </div>

              {/* Model - Dynamic dropdown */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-surface-300">Modelo</label>
                  {apiKey.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => loadModels(provider, apiKey)}
                      disabled={modelsLoading}
                      className="p-0.5 rounded text-surface-400 hover:text-primary-400 transition-colors disabled:opacity-40"
                      title="Atualizar lista de modelos"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${modelsLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                  )}
                </div>

                <div ref={modelDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (displayModels.length > 0) setModelOpen(!modelOpen)
                    }}
                    disabled={displayModels.length === 0}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-surface-800/80 border border-surface-700/60 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                      displayModels.length === 0
                        ? 'text-surface-500 cursor-default'
                        : 'text-surface-100 hover:border-surface-600 cursor-pointer'
                    }`}
                  >
                    <span className={modelsLoading ? 'text-surface-500' : ''}>
                      {modelsLoading
                        ? 'Carregando modelos...'
                        : displayModels.length > 0
                          ? model || 'Selecione um modelo'
                          : apiKey.length >= 5
                            ? 'Conectando...'
                            : 'Insira a API key para ver os modelos'}
                    </span>
                    {displayModels.length > 0 && (
                      <ChevronDown
                        className={`w-4 h-4 text-surface-400 transition-transform ${modelOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                    {modelsLoading && (
                      <RefreshCw className="w-4 h-4 text-surface-400 animate-spin" />
                    )}
                  </button>

                  <AnimatePresence>
                    {modelOpen && displayModels.length > 0 && (
                      <motion.div
                        className="absolute bottom-full left-0 right-0 mb-1 bg-surface-800 border border-surface-700/60 rounded-xl overflow-hidden shadow-xl z-10 max-h-64 overflow-y-auto"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {displayModels.map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setModel(m)
                              setModelOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              model === m
                                ? 'bg-primary-600/15 text-primary-300'
                                : 'text-surface-300 hover:bg-surface-700/60 hover:text-surface-100'
                            }`}
                          >
                            <span className="font-mono text-xs">{m}</span>
                            {model === m && <Check className="w-4 h-4 text-primary-400" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {modelsLoaded && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-xs text-surface-500"
                  >
                    {models.length} modelo{models.length !== 1 ? 's' : ''} disponíve{models.length !== 1 ? 'is' : 'l'}
                  </motion.p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || saved}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    saved
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : apiKey.trim()
                        ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30'
                        : 'bg-surface-800 text-surface-500 cursor-not-allowed'
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Salvo!
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-surface-400 hover:text-red-400 hover:bg-red-500/10 border border-surface-700/60 hover:border-red-500/30 transition-all"
                >
                  Limpar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
