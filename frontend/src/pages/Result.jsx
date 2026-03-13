import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Globe, Clock, BarChart3, Sparkles, AlertCircle, Eye, ShieldAlert, Crosshair, Wrench, ClipboardList, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ScoreGauge from '../components/ScoreGauge'
import HeaderCard from '../components/HeaderCard'
import ExportButton from '../components/ExportButton'
import { getAnalysisDetail, fetchAiReport } from '../lib/api'
import { cleanUrl, formatDate, SEVERITY_CONFIG } from '../lib/utils'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

const REPORT_SECTION_CONFIG = {
  'Visão geral':                    { icon: Eye,           color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  'Vulnerabilidades críticas':      { icon: ShieldAlert,   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  'Superfície de ataque':           { icon: Crosshair,     color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  'Plano de correção prioritizado': { icon: Wrench,        color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
  'Checklist de validação Blue Team': { icon: ClipboardList, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

function parseReportSections(text) {
  if (!text) return []
  const sections = []
  const regex = /^## (.+)/gm
  let match
  const matches = []
  while ((match = regex.exec(text)) !== null) {
    matches.push({ title: match[1].trim(), index: match.index })
  }
  if (matches.length === 0) return [{ title: 'Relatório', content: text }]
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].title.length + 4 // "## " + title + "\n"
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length
    const content = text.substring(start, end).trim()
    if (content) sections.push({ title: matches[i].title, content })
  }
  return sections
}

function ReportMarkdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h3: ({ children }) => <h4 className="text-sm font-semibold text-surface-200 mt-3 mb-1.5">{children}</h4>,
        p: ({ children }) => <p className="text-sm text-surface-300 leading-relaxed mb-2">{children}</p>,
        ul: ({ children }) => <ul className="text-sm text-surface-300 space-y-1 mb-2 ml-1">{children}</ul>,
        ol: ({ children }) => <ol className="text-sm text-surface-300 space-y-1 mb-2 ml-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-surface-300">
            <span className="w-1 h-1 rounded-full bg-surface-500 mt-2 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        strong: ({ children }) => <strong className="font-semibold text-surface-200">{children}</strong>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-surface-700/40">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-surface-800/60 border-b border-surface-700/60">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-surface-800/60">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-surface-800/30 transition-colors">{children}</tr>,
        th: ({ children }) => <th className="text-left px-3 py-2 text-surface-300 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2.5 text-surface-400 align-top leading-relaxed">{children}</td>,
        code: ({ inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          const codeText = String(children).replace(/\n$/, '')
          if (!inline && (match || codeText.includes('\n'))) {
            return (
              <div className="relative group my-2">
                <button
                  onClick={async () => { await navigator.clipboard.writeText(codeText) }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-700/80 hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Copiar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
                </button>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match ? match[1] : 'bash'}
                  PreTag="div"
                  customStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', margin: 0 }}
                  {...props}
                >
                  {codeText}
                </SyntaxHighlighter>
              </div>
            )
          }
          return <code className="text-xs bg-surface-800/80 text-primary-300 px-1.5 py-0.5 rounded font-mono" {...props}>{children}</code>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function ReportSection({ title, content }) {
  const cfg = REPORT_SECTION_CONFIG[title] || { icon: BookOpen, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' }
  const Icon = cfg.icon
  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-4 py-3 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{title}</span>
      </div>
      <div className="px-4 py-3 space-y-1">
        <ReportMarkdown content={content} />
      </div>
    </div>
  )
}

const BAR_DURATION = 0.7   // seconds per bar
const BAR_BASE_DELAY = 0.4 // seconds before first bar starts

function AnimatedScoreBar({ earned, max, severity, name, index }) {
  const pct = max > 0 ? (earned / max) * 100 : 0
  const delay = BAR_BASE_DELAY + index * (BAR_DURATION + 0.05)
  const sevConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info

  const [count, setCount] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const startMs = delay * 1000
    const durationMs = BAR_DURATION * 1000
    let timeout

    timeout = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.round(eased * earned))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }, startMs)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [earned, delay])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-surface-400 font-medium truncate">{name}</span>
        <span className={`tabular-nums shrink-0 ml-2 ${sevConfig.color}`}>
          {count}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: BAR_DURATION, delay, ease: [0, 0, 0.2, 1] }}
          className={`h-full rounded-full ${sevConfig.dot}`}
        />
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[100, 80, 95, 60, 75].map((w, i) => (
        <div key={i} className={`h-3 bg-surface-800 rounded-full`} style={{ width: `${w}%` }} />
      ))}
      <div className="pt-2 space-y-2">
        {[90, 70, 85].map((w, i) => (
          <div key={i} className={`h-3 bg-surface-800 rounded-full`} style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="pt-2 space-y-2">
        {[95, 65, 80, 55].map((w, i) => (
          <div key={i} className={`h-3 bg-surface-800 rounded-full`} style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function Result() {
  const location = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!data && !!id)
  const [error, setError] = useState('')

  // AI report state — separate from the base analysis
  const initialHasAi = !!(data?.summary && data?.explanations && Object.keys(data.explanations).length > 0)
  const [aiReport, setAiReport] = useState(
    initialHasAi
      ? { explanations: data.explanations, summary: data.summary, loading: false, error: '' }
      : { explanations: {}, summary: '', loading: false, error: '' }
  )

  // Load from history if accessed by ID
  useEffect(() => {
    if (!data && id) {
      setLoading(true)
      getAnalysisDetail(id)
        .then((result) => {
          setData({ ...result, analysis_id: Number(id) })
          const hasAi = !!(result.summary && result.explanations && Object.keys(result.explanations).length > 0)
          if (hasAi) {
            setAiReport({ explanations: result.explanations, summary: result.summary, loading: false, error: '' })
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [id])

  // Fetch AI report in background after base data is available
  useEffect(() => {
    const analysisId = data?.analysis_id
    const alreadyHasAi = !!(data?.summary && data?.explanations && Object.keys(data.explanations || {}).length > 0)
    if (!analysisId || alreadyHasAi || aiReport.loading || aiReport.summary) return

    setAiReport((prev) => ({ ...prev, loading: true, error: '' }))
    fetchAiReport(analysisId)
      .then((report) => setAiReport({ explanations: report.explanations, summary: report.summary, loading: false, error: '' }))
      .catch((err) => setAiReport({ explanations: {}, summary: '', loading: false, error: err.message || 'Erro ao gerar relatório.' }))
  }, [data?.analysis_id])

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

  const { url, headers, score, analysis_id, created_at } = data
  const explanations = aiReport.explanations
  const sortedHeaders = Object.entries(headers).sort(
    ([, a], [, b]) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )

  const severityCounts = Object.values(headers).reduce((acc, h) => {
    acc[h.severity] = (acc[h.severity] || 0) + 1
    return acc
  }, {})

  const totalScore = score?.total_score || 0
  const classification = score?.classification || 'Regular'

  // Gauge syncs with bars: starts when first bar starts, ends when last bar ends
  const barCount = score?.header_scores?.length || 1
  const gaugeDuration = (barCount - 1) * (BAR_DURATION + 0.05) + BAR_DURATION
  const gaugeDelay = BAR_BASE_DELAY

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
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

      {/* ── Hero: Score + Info ── */}
      <div className="bg-surface-900/50 border border-surface-800/60 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <ScoreGauge score={totalScore} classification={classification} size={140} delay={gaugeDelay} duration={gaugeDuration} />
          </div>

          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-surface-300">
                <Globe className="w-4 h-4 shrink-0 text-surface-500" />
                <span className="truncate font-semibold">{cleanUrl(url)}</span>
              </div>
              {created_at && (
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {formatDate(created_at)}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
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

            {score?.header_scores && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-surface-800/40">
                {score.header_scores.map((hs, i) => (
                  <AnimatedScoreBar
                    key={hs.name}
                    earned={hs.earned_points}
                    max={hs.max_points}
                    severity={hs.severity}
                    name={hs.name}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Header Detail Cards ── */}
      <div>
        <h2 className="font-semibold text-surface-200 mb-4">Detalhes por Header</h2>
        <div className="space-y-3">
          {sortedHeaders.map(([key, header]) => (
            <HeaderCard
              key={key}
              header={header}
              explanation={explanations?.[key]}
              aiLoading={aiReport.loading}
            />
          ))}
        </div>
      </div>

      {/* ── Executive Report (AI) ── */}
      <div className="bg-surface-900/50 border border-surface-800/60 rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-surface-800/60">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-600/15 border border-primary-500/20">
            <BarChart3 className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <h2 className="font-semibold text-surface-200 text-sm">Relatório Executivo de Segurança</h2>
          {aiReport.loading && (
            <span className="flex items-center gap-1.5 ml-auto text-xs text-surface-500">
              <Sparkles className="w-3.5 h-3.5 text-primary-400 animate-pulse" />
              Gerando com IA…
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {aiReport.loading ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ReportSkeleton />
              </motion.div>
            ) : aiReport.error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {aiReport.error}
              </motion.div>
            ) : aiReport.summary ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                {parseReportSections(aiReport.summary).map((section, i) => (
                  <ReportSection key={i} title={section.title} content={section.content} />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
