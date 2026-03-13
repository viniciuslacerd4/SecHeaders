import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldAlert,
  BookOpen,
  Crosshair,
  Wrench,
  FlaskConical,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react'
import { SEVERITY_CONFIG } from '../lib/utils'

const STATUS_ICONS = {
  info: CheckCircle2,
  low: Info,
  medium: AlertTriangle,
  high: ShieldAlert,
  critical: XCircle,
}

const SECTION_CONFIG = {
  'O que é este header': { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'Risco real': { icon: AlertOctagon, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  'Exemplos de ataque': { icon: Crosshair, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'Como corrigir': { icon: Wrench, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  'Teste de validação': { icon: FlaskConical, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  'Tudo certo': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'Se não estivesse configurado': { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
}

/**
 * CopyButton — botão para copiar conteúdo de um bloco de código.
 */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-700/80 hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-all opacity-0 group-hover:opacity-100"
      title="Copiar código"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

/**
 * MarkdownRenderer — renderiza markdown com syntax highlighting e botão de copiar.
 */
function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      components={{
        h2: () => null, // Section headers are handled externally
        h3: ({ children }) => (
          <h4 className="text-sm font-semibold text-surface-200 mt-3 mb-1.5">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-sm text-surface-300 leading-relaxed mb-2">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="text-sm text-surface-300 space-y-1 mb-2 ml-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm text-surface-300 space-y-1 mb-2 ml-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-surface-300">
            <span className="w-1 h-1 rounded-full bg-surface-500 mt-2 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-surface-200">{children}</strong>
        ),
        code: ({ inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          const codeText = String(children).replace(/\n$/, '')

          if (!inline && (match || codeText.includes('\n'))) {
            return (
              <div className="relative group my-2">
                <CopyButton text={codeText} />
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
      {content}
    </ReactMarkdown>
  )
}

/**
 * parseExplanationSections — divide o texto da explicação em seções baseadas nos headers ##.
 */
function parseExplanationSections(explanation) {
  if (!explanation) return []

  const sections = []
  const regex = /^## (.+)/gm
  let match
  const matches = []

  while ((match = regex.exec(explanation)) !== null) {
    matches.push({ title: match[1].trim(), index: match.index })
  }

  if (matches.length === 0) {
    // No sections found, return as single block
    return [{ title: 'Explicação', content: explanation }]
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].title.length + 3 // ## + title + newline
    const end = i + 1 < matches.length ? matches[i + 1].index : explanation.length
    const content = explanation.substring(start, end).trim()
    if (content) {
      sections.push({ title: matches[i].title, content })
    }
  }

  return sections
}

/**
 * ExplanationSection — seção expansível individual da explicação.
 */
function ExplanationSection({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const config = SECTION_CONFIG[title] || { icon: BookOpen, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' }
  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.border} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${open ? config.bg : 'hover:' + config.bg}`}
      >
        <Icon className={`w-4 h-4 ${config.color} shrink-0`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.color} flex-1`}>
          {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-surface-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-3.5 py-3 ${config.bg} border-t ${config.border}`}>
              <MarkdownRenderer content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * HeaderCard — Card expansível para um security header individual.
 * Renderiza explicações estruturadas com seções colapsáveis, exemplos de código e syntax highlighting.
 */
export default function HeaderCard({ header, explanation, aiLoading = false }) {
  const [open, setOpen] = useState(false)

  const severity = header.severity || 'info'
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  const StatusIcon = STATUS_ICONS[severity] || CheckCircle2
  const hasIssues = header.issues?.length > 0 && severity !== 'info'

  const sections = parseExplanationSections(explanation)

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${open ? 'bg-surface-900/80 border-surface-700/60' : 'bg-surface-900/40 border-surface-800/50 hover:border-surface-700/60'
        }`}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Severity icon */}
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-surface-200 truncate">
              {header.name}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5 truncate">
            {header.present
              ? `Valor: ${header.value?.substring(0, 80) || '—'}${header.value?.length > 80 ? '…' : ''}`
              : 'Header ausente na resposta'}
          </p>
        </div>

        {/* Sections count badge / loading indicator */}
        {sections.length > 0 ? (
          <span className="text-xs text-surface-500 bg-surface-800/60 px-2 py-0.5 rounded-md shrink-0">
            {sections.length} seções
          </span>
        ) : aiLoading ? (
          <span className="flex items-center gap-1.5 text-xs text-surface-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500/40 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500/20 animate-pulse [animation-delay:300ms]" />
          </span>
        ) : null}

        {/* Expand chevron */}
        <ChevronDown
          className={`w-4 h-4 text-surface-500 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-surface-800/40 pt-3">
              {/* Issues list */}
              {hasIssues && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Problemas encontrados
                  </p>
                  {header.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-surface-300">
                      <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${config.dot}`} />
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              {/* Value detail */}
              {header.present && header.value && (
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">
                    Valor atual
                  </p>
                  <code className="block text-xs text-surface-300 bg-surface-950/80 rounded-lg px-3 py-2 overflow-x-auto font-mono">
                    {header.value}
                  </code>
                </div>
              )}

              {/* LLM explanation — structured sections */}
              {sections.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    {hasIssues ? 'Análise detalhada da IA' : 'Feedback de segurança'}
                  </p>
                  {sections.map((section, i) => (
                    <ExplanationSection
                      key={i}
                      title={section.title}
                      content={section.content}
                      defaultOpen={i === 0}
                    />
                  ))}
                </div>
              ) : aiLoading ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider animate-pulse">
                    Análise da IA
                  </p>
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 bg-surface-800/60 rounded-lg border border-surface-700/30" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
