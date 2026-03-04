import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, History, GitCompareArrows, Sparkles, Quote } from 'lucide-react'
import AISettingsModal, { isLLMConfigured, isDefaultLLMAvailable } from './AISettingsModal'
import { fetchLLMStatus } from '../lib/api'
import Logo from './Logo'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/compare', icon: GitCompareArrows, label: 'Comparar' },
]

export default function Layout() {
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const configured = isLLMConfigured()
  const [hasDefaultLLM, setHasDefaultLLM] = useState(isDefaultLLMAvailable())

  // Fetch default LLM status on mount
  useEffect(() => {
    fetchLLMStatus()
      .then((status) => {
        localStorage.setItem('secheaders_default_llm', JSON.stringify(status))
        setHasDefaultLLM(status?.available === true)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-grid flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-600/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <Logo className="w-8 h-8 transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="text-primary-400">Sec</span>
                <span className="text-surface-100">Headers</span>
              </span>
            </NavLink>

            {/* Nav links + AI button */}
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600/15 text-primary-300 shadow-sm'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}

              {/* Divider */}
              <div className="w-px h-6 bg-surface-700/60 mx-1.5" />

              {/* AI Settings Button */}
              <button
                onClick={() => setAiModalOpen(true)}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-primary-300 hover:bg-primary-600/10 transition-all duration-200 group"
                title="Configurar IA"
              >
                <div className="relative">
                  <Sparkles className="w-4 h-4 transition-transform group-hover:scale-110" />
                </div>
                <span className="hidden sm:inline">IA</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800/60 bg-surface-950/60 backdrop-blur-sm mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Left – Logo & project name */}
            <div className="flex items-start gap-3">
              <Logo className="w-10 h-10 shrink-0 drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]" />
              <div>
                <p className="text-sm font-bold tracking-tight">
                  <span className="text-primary-400">Sec</span>
                  <span className="text-surface-100">Headers</span>
                </p>
                <p className="text-[11px] text-surface-500 leading-snug mt-0.5">
                  Ferramenta de Análise de<br />Security Headers com IA
                </p>
              </div>
            </div>

            {/* Center – Author & academic info */}
            <div className="text-center md:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 mb-2">
                Trabalho de Conclusão de Curso
              </p>
              <p className="text-sm text-surface-200 font-medium">Vinícius Lacerda Borges</p>
              <p className="text-[11px] text-surface-500 mt-0.5">
                Sistemas de Informação / UNIFAP
              </p>
            </div>

            {/* Right – Quote */}
            <div className="text-center md:text-right max-w-[280px] md:ml-auto">
              <Quote className="w-4 h-4 text-primary-500/30 mb-2 ml-auto hidden md:block" />
              <p className="text-[13px] text-surface-300/90 italic leading-[1.6] font-light">
                "There are only two types of companies:
                <br className="hidden sm:block" />
                those that have been hacked
                <br className="hidden sm:block" />
                and those that{' '}
                <span className="text-primary-400/80 font-normal">will be.</span>"
              </p>
              <p className="text-[10px] text-surface-500 mt-2 font-medium tracking-wide uppercase">
                — Robert Mueller
              </p>
            </div>
          </div>

          {/* Bottom line */}
          <div className="mt-6 pt-4 border-t border-surface-800/40 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-surface-600">
              © {new Date().getFullYear()} SecHeaders — Projeto acadêmico sem fins lucrativos.
            </p>
            <p className="text-[10px] text-surface-600">
              Análises baseadas nas recomendações OWASP e boas práticas de segurança web.
            </p>
          </div>
        </div>
      </footer>

      {/* AI Settings Modal */}
      <AISettingsModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  )
}
