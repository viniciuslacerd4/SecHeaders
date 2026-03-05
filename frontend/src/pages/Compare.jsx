import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GitCompareArrows,
  Globe,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Minus,
} from 'lucide-react'
import { analyzeUrl } from '../lib/api'
import ScoreGauge from '../components/ScoreGauge'
import { SEVERITY_CONFIG, cleanUrl } from '../lib/utils'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

export default function Compare() {
  const [url1, setUrl1] = useState('')
  const [url2, setUrl2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null) // { a, b }

  async function handleCompare(e) {
    e.preventDefault()
    if (!url1.trim() || !url2.trim()) return
    setError('')
    setLoading(true)
    setResults(null)

    try {
      const [a, b] = await Promise.all([analyzeUrl(url1.trim()), analyzeUrl(url2.trim())])
      setResults({ a, b })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 flex-1"
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <GitCompareArrows className="w-5 h-5 text-primary-400" />
        <h1 className="text-xl font-bold text-surface-100">Comparar URLs</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleCompare} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: url1, set: setUrl1, label: 'URL 1' },
            { value: url2, set: setUrl2, label: 'URL 2' },
          ].map((input) => (
            <div
              key={input.label}
              className="flex items-center bg-surface-900 border border-surface-700/60 rounded-xl overflow-hidden focus-within:border-primary-500/40 transition-colors"
            >
              <Globe className="w-4 h-4 text-surface-500 ml-4 shrink-0" />
              <input
                type="text"
                value={input.value}
                onChange={(e) => input.set(e.target.value)}
                placeholder={`${input.label} (ex: example.com)`}
                className="flex-1 bg-transparent px-3 py-3.5 text-surface-100 placeholder:text-surface-500 focus:outline-none text-sm"
                disabled={loading}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={loading || !url1.trim() || !url2.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 sm:py-2.5 rounded-lg transition-all duration-200 text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Comparando…
              </>
            ) : (
              <>
                Comparar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {error && (
            <span className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
              {error}
            </span>
          )}
        </div>
      </form>

      {/* Results */}
      {results && <CompareResults a={results.a} b={results.b} />}
    </motion.div>
  )
}

function CompareResults({ a, b }) {
  const scoreA = a.score?.total_score || 0
  const scoreB = b.score?.total_score || 0
  const winner = scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : 'tie'

  const allHeaders = [
    ...new Set([...Object.keys(a.headers || {}), ...Object.keys(b.headers || {})]),
  ].sort(
    (x, y) =>
      SEVERITY_ORDER.indexOf(a.headers[x]?.severity || 'info') -
      SEVERITY_ORDER.indexOf(a.headers[y]?.severity || 'info')
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Score comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { data: a, score: scoreA, side: 'a' },
          { data: b, score: scoreB, side: 'b' },
        ].map(({ data, score, side }) => (
          <div
            key={side}
            className={`relative bg-surface-900/50 border rounded-2xl p-6 flex flex-col items-center ${winner === side
              ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
              : 'border-surface-800/60'
              }`}
          >
            {winner === side && (
              <span className="absolute top-3 right-3 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Melhor
              </span>
            )}
            <p className="text-sm font-medium text-surface-400 mb-3 truncate max-w-full">
              {cleanUrl(data.url)}
            </p>
            <ScoreGauge
              score={score}
              classification={data.score?.classification || 'Regular'}
              size={140}
            />
          </div>
        ))}
      </div>

      {/* Header-by-header comparison table */}
      <div className="bg-surface-900/50 border border-surface-800/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800/60">
                <th className="text-left text-surface-400 font-semibold text-xs uppercase tracking-wider px-3 py-3 sm:px-4">
                  Header
                </th>
                <th className="text-center text-surface-400 font-semibold text-xs uppercase tracking-wider px-2 py-3 sm:px-4 max-w-[120px] truncate">
                  {cleanUrl(a.url)}
                </th>
                <th className="text-center text-surface-400 font-semibold text-xs uppercase tracking-wider px-2 py-3 sm:px-4 max-w-[120px] truncate">
                  {cleanUrl(b.url)}
                </th>
              </tr>
            </thead>
            <tbody>
              {allHeaders.map((key) => {
                const ha = a.headers?.[key]
                const hb = b.headers?.[key]
                return (
                  <tr key={key} className="border-b border-surface-800/30 last:border-0">
                    <td className="px-3 sm:px-4 py-2.5 font-medium text-surface-300 text-xs sm:text-sm whitespace-nowrap">
                      {ha?.name || hb?.name || key}
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 text-center">
                      <CompareCell header={ha} />
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 text-center">
                      <CompareCell header={hb} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

function CompareCell({ header }) {
  if (!header) {
    return <span className="text-surface-600"><Minus className="w-4 h-4 mx-auto" /></span>
  }

  const config = SEVERITY_CONFIG[header.severity] || SEVERITY_CONFIG.info

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
