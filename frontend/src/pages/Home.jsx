import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpenText, ChartBar, CircleNotch, Globe, Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAnalysis } from '../components/AnalysisContext'
import { getHistory } from '../lib/api'
import { cleanUrl, formatDate } from '../lib/utils'
import SecurityEmblem from '../components/SecurityEmblem'

const CONTROLS = ['HSTS', 'CSP', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Set-Cookie']

export default function Home() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [recent] = useState(() => getHistory(3))
  const { loading, startAnalysis } = useAnalysis()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!url.trim() || loading) return
    setError('')
    try { await startAnalysis(url.trim()) } catch (err) { setError(err.message) }
  }

  return (
    <div className="analysis-workspace">
      <div className="analysis-hero">
      <header className="analysis-heading">
        <h1>Analisar<br /><span>um domínio.</span></h1>
        <p>Identifique os headers que precisam de correção.</p>
      </header>
      <SecurityEmblem />
      </div>

      <motion.form onSubmit={handleSubmit} className="analysis-command" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .08, ease: [.22, 1, .36, 1] }}>
        <label htmlFor="target-url" className="command-label">Domínio ou URL</label>
        <div className="command-field">
          <Globe size={22} weight="light" className="command-globe" />
          <input id="target-url" value={url} onChange={event => { setUrl(event.target.value); if (error) setError('') }} placeholder="seusite.com.br" disabled={loading} autoComplete="url" inputMode="url" autoCapitalize="none" spellCheck={false} aria-describedby={error ? 'analysis-error' : undefined} />
          <button type="submit" disabled={loading || !url.trim()} className="button-primary">
            {loading ? <><CircleNotch size={18} className="animate-spin" /><span>Analisando</span></> : <><span>Analisar</span><ArrowRight size={18} /></>}
          </button>
        </div>
        {error && <p id="analysis-error" role="alert" className="text-sm text-red-300 mt-4">{error}</p>}
        <div className="command-footer">
          <details className="coverage-details">
            <summary>7 controles HTTP <Plus size={12} /></summary>
            <div className="coverage-list">{CONTROLS.map(control => <span key={control}>{control}</span>)}</div>
          </details>
          <span>Diagnóstico e relatório PDF</span>
        </div>
      </motion.form>

      {recent.length > 0 && <section className="recent-analyses">
        <div className="section-row"><h2>Recentes</h2><Link to="/history">Ver histórico <ArrowUpRight size={14} /></Link></div>
        {recent.map(item => <Link className="recent-analysis" to={`/result/${item.id}`} key={item.id}>
          <Globe size={17} className="text-surface-500 shrink-0" />
          <span className="truncate flex-1">{cleanUrl(item.url)}</span>
          <span className="hidden sm:block text-xs text-surface-500">{formatDate(item.created_at)}</span>
          <span className="recent-score">{item.score}<span>/100</span></span><ArrowUpRight size={15} />
        </Link>)}
      </section>}

      <div className="workspace-shortcuts">
        <Link to="/compare" className="workspace-shortcut">
          <span className="shortcut-icon"><ChartBar size={22} weight="light" /></span>
          <div><h2>Comparar domínios</h2><p>Dois diagnósticos, lado a lado.</p></div>
          <ArrowUpRight size={18} className="shortcut-arrow" />
        </Link>
        <Link to="/learn" className="workspace-shortcut">
          <span className="shortcut-icon"><BookOpenText size={22} weight="light" /></span>
          <div><h2>Aprofundamento</h2><p>Referência, exemplos e prática.</p></div>
          <ArrowUpRight size={18} className="shortcut-arrow" />
        </Link>
      </div>
    </div>
  )
}
