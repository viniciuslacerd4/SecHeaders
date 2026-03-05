import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { History as HistoryIcon, ExternalLink, Globe, Trash2, AlertTriangle } from 'lucide-react'
import { getHistory, clearHistory } from '../lib/api'
import { formatDate, cleanUrl, CLASSIFICATION_CONFIG, SEVERITY_CONFIG } from '../lib/utils'

export default function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    getHistory(100)
      .then(setAnalyses)
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  async function handleClearHistory() {
    setClearing(true)
    try {
      await clearHistory()
      setAnalyses([])
    } catch { }
    setClearing(false)
    setConfirmClear(false)
  }

  if (loading) {
    return (
      <div className="space-y-6 flex-1">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-primary-400" />
          <h1 className="text-xl font-bold text-surface-100">Histórico de Análises</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1"
    >
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-primary-400" />
          <h1 className="text-xl font-bold text-surface-100">Histórico de Análises</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-500">
            {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'}
          </span>
          {analyses.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-red-400 hover:bg-red-500/10 border border-surface-700/40 hover:border-red-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">Apagar tudo?</span>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="px-2 py-0.5 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {clearing ? 'Apagando...' : 'Sim'}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-0.5 rounded text-xs font-medium text-surface-400 hover:text-surface-200 transition-colors"
              >
                Não
              </button>
            </div>
          )}
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-800/80 flex items-center justify-center mb-4">
            <HistoryIcon className="w-7 h-7 text-surface-600" />
          </div>
          <p className="text-surface-400 text-sm mb-1">Nenhuma análise realizada ainda.</p>
          <Link
            to="/"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium mt-2"
          >
            Analisar uma URL →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {analyses.map((item, index) => {
            const cls = CLASSIFICATION_CONFIG[item.classification] || CLASSIFICATION_CONFIG['Regular']
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Link
                  to={`/result/${item.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface-900/40 border border-surface-800/50 hover:border-surface-700/60 hover:bg-surface-900/70 transition-all duration-200 group"
                >
                  {/* Score circle mini */}
                  <div className={`w-12 h-12 rounded-xl ${cls.bg} ring-1 ${cls.ring} flex items-center justify-center shrink-0`}>
                    <span className={`text-lg font-bold tabular-nums ${cls.color}`}>
                      {Math.round(item.score)}
                    </span>
                  </div>

                  {/* URL + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                      <span className="text-sm font-semibold text-surface-200 truncate group-hover:text-primary-300 transition-colors">
                        {cleanUrl(item.url)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                      <span className={`font-medium ${cls.color}`}>{item.classification}</span>
                      <span>·</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ExternalLink className="w-4 h-4 text-surface-600 group-hover:text-surface-400 transition-colors shrink-0" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
