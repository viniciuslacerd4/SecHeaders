import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Globe, Zap, FileText } from 'lucide-react'
import { analyzeUrl } from '../lib/api'
import Logo from '../components/Logo'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return

    setError('')
    setLoading(true)

    try {
      const result = await analyzeUrl(url.trim())
      navigate('/result', { state: { result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center pt-12 sm:pt-20">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-medium mb-6">
          <Logo className="w-4 h-4" />
          Análise de Security Headers com IA
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
          <span className="text-surface-100">Analise a segurança</span>
          <br />
          <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            dos seus headers HTTP
          </span>
        </h1>

        <p className="text-surface-400 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
          Insira uma URL e receba um diagnóstico completo com score,
          explicações detalhadas e recomendações de correção.
        </p>
      </motion.div>

      {/* Search form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        onSubmit={handleSubmit}
        className="w-full max-w-xl mt-10"
      >
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-primary-400 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity duration-300" />
          <div className="relative flex items-center bg-surface-900 border border-surface-700/60 rounded-xl overflow-hidden transition-colors group-focus-within:border-primary-500/40">
            <Globe className="w-5 h-5 text-surface-500 ml-4 shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Digite uma URL (ex: exemplo.com.br)"
              className="flex-1 bg-transparent px-3 py-4 text-surface-100 placeholder:text-surface-500 focus:outline-none text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 m-1.5 rounded-lg transition-all duration-200 text-sm shrink-0"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analisando…
                </div>
              ) : (
                <>
                  Analisar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5"
          >
            {error}
          </motion.p>
        )}
      </motion.form>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl"
      >
        {[
          {
            icon: Search,
            title: '7 Headers Analisados',
            desc: 'HSTS, CSP, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy e Set-Cookie.',
          },
          {
            icon: Zap,
            title: 'Explicações com IA',
            desc: 'Cada problema é explicado em linguagem acessível com recomendações práticas.',
          },
          {
            icon: FileText,
            title: 'Relatório em PDF',
            desc: 'Exporte o resultado completo como PDF para documentação ou auditoria.',
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="group p-5 rounded-xl bg-surface-900/50 border border-surface-800/60 hover:border-surface-700/80 transition-all duration-300"
          >
            <div className="w-9 h-9 rounded-lg bg-primary-600/10 flex items-center justify-center mb-3 group-hover:bg-primary-600/20 transition-colors">
              <feature.icon className="w-4.5 h-4.5 text-primary-400" />
            </div>
            <h3 className="font-semibold text-surface-200 text-sm mb-1">{feature.title}</h3>
            <p className="text-surface-500 text-xs leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
