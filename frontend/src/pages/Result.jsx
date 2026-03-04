import { useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Clock, BarChart3, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ScoreGauge from '../components/ScoreGauge'
import HeaderCard from '../components/HeaderCard'
import ExportButton from '../components/ExportButton'
import { getAnalysisDetail } from '../lib/api'
import { cleanUrl, formatDate, SEVERITY_CONFIG } from '../lib/utils'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

export default function Result() {
  const location = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!data && !!id)
  const [error, setError] = useState('')

  // Se veio via histórico (ID na URL), busca do backend
  useEffect(() => {
    if (!data && id) {
      setLoading(true)
      getAnalysisDetail(id)
        .then((result) => setData({ ...result, analysis_id: Number(id) }))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [id, data])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <svg className="animate-spin w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-surface-400 text-sm">Carregando análise…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-red-400">{error || 'Nenhum dado de análise encontrado.'}</p>
        <Link
          to="/"
          className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </Link>
      </div>
    )
  }

  const { url, headers, score, explanations, summary, analysis_id, created_at } = data
  const sortedHeaders = Object.entries(headers).sort(
    ([, a], [, b]) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )

  // Count by severity
  const severityCounts = Object.values(headers).reduce((acc, h) => {
    acc[h.severity] = (acc[h.severity] || 0) + 1
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Back + actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-surface-400 hover:text-surface-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Nova análise
        </button>

        <ExportButton analysisId={analysis_id} url={url} />
      </div>

      {/* Summary section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score card */}
        <div className="lg:col-span-1 flex flex-col items-center bg-surface-900/50 border border-surface-800/60 rounded-2xl p-6">
          <ScoreGauge score={score?.total_score || 0} classification={score?.classification || 'Regular'} />

          <div className="mt-5 w-full space-y-2">
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate font-medium text-surface-300">{cleanUrl(url)}</span>
            </div>
            {created_at && (
              <div className="flex items-center gap-2 text-sm text-surface-500">
                <Clock className="w-4 h-4 shrink-0" />
                {formatDate(created_at)}
              </div>
            )}
          </div>

          {/* Severity overview */}
          <div className="mt-4 pt-4 border-t border-surface-800/40 w-full flex flex-wrap gap-2">
            {SEVERITY_ORDER.filter((s) => severityCounts[s]).map((sev) => {
              const conf = SEVERITY_CONFIG[sev]
              return (
                <span key={sev} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${conf.bg} ${conf.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                  {severityCounts[sev]} {conf.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Summary + header breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* LLM Summary */}
          {summary && (
            <div className="bg-surface-900/50 border border-surface-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary-400" />
                <h2 className="font-semibold text-surface-200 text-sm">Relatório Executivo de Segurança</h2>
              </div>
              <div className="text-sm text-surface-400 leading-relaxed prose prose-invert prose-sm max-w-none
                prose-headings:text-surface-200 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-p:text-surface-400 prose-p:mb-2
                prose-strong:text-surface-200
                prose-li:text-surface-400
                prose-ul:my-1 prose-ol:my-1
                prose-code:text-primary-300 prose-code:bg-surface-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              ">
                <ReactMarkdown
                  components={{
                    code: ({ inline, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '')
                      const codeText = String(children).replace(/\n$/, '')
                      if (!inline && (match || codeText.includes('\n'))) {
                        return (
                          <div className="relative group my-2">
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(codeText)
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-700/80 hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-all opacity-0 group-hover:opacity-100 z-10"
                              title="Copiar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
                            </button>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match ? match[1] : 'bash'}
                              PreTag="div"
                              customStyle={{
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                padding: '1rem',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                margin: 0,
                              }}
                              {...props}
                            >
                              {codeText}
                            </SyntaxHighlighter>
                          </div>
                        )
                      }
                      return (
                        <code className="text-xs bg-surface-800/80 text-primary-300 px-1.5 py-0.5 rounded font-mono" {...props}>
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Score breakdown bars */}
          {score?.header_scores && (
            <div className="bg-surface-900/50 border border-surface-800/60 rounded-2xl p-5">
              <h2 className="font-semibold text-surface-200 text-sm mb-4">Pontuação por Header</h2>
              <div className="space-y-3">
                {score.header_scores.map((hs) => {
                  const pct = hs.max_points > 0 ? (hs.earned_points / hs.max_points) * 100 : 0
                  const sevConfig = SEVERITY_CONFIG[hs.severity] || SEVERITY_CONFIG.info
                  return (
                    <div key={hs.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-300 font-medium">{hs.name}</span>
                        <span className={`tabular-nums ${sevConfig.color}`}>
                          {hs.earned_points}/{hs.max_points}
                        </span>
                      </div>
                      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`h-full rounded-full ${sevConfig.dot}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header cards */}
      <div>
        <h2 className="font-semibold text-surface-200 mb-4">
          Detalhes por Header
        </h2>
        <div className="space-y-3">
          {sortedHeaders.map(([key, header]) => (
            <HeaderCard
              key={key}
              header={header}
              explanation={explanations?.[key]}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
