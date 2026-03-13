import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, History, GitCompareArrows, Quote, Github } from 'lucide-react'
import AnalysisToast from './AnalysisToast'
import { useAnalysis } from './AnalysisContext'
import Logo from './Logo'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Início', hideOnMobile: true },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/compare', icon: GitCompareArrows, label: 'Comparar' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { setNavigate } = useAnalysis()

  // Passa o navigate para o contexto global
  useEffect(() => {
    setNavigate(navigate)
  }, [navigate, setNavigate])

  return (
    <div className="min-h-screen bg-grid flex flex-col overflow-x-hidden">
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
                <Logo className="w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                <span className="text-primary-400">Sec</span>
                <span className="text-surface-100">Headers</span>
              </span>
            </NavLink>

            {/* Nav links + AI button */}
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label, hideOnMobile }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `${hideOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-primary-600/15 text-primary-300 shadow-sm'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}

            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col min-h-[calc(100dvh-64px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800/60 bg-surface-950/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
            <div className="text-left md:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 mb-2">
                Trabalho de Conclusão de Curso
              </p>
              <p className="text-sm text-surface-200 font-medium">Vinícius Lacerda Borges</p>
              <p className="text-[11px] text-surface-500 mt-0.5">
                Sistemas de Informação / UNIFAP
              </p>
              <a
                href="https://github.com/viniciuslacerd4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-surface-400 hover:text-primary-400 transition-colors duration-200"
              >
                <Github className="w-3.5 h-3.5" />
                github.com/viniciuslacerd4
              </a>
            </div>

            {/* Right – Quote */}
            <div className="text-left md:text-right max-w-full md:max-w-[280px] md:ml-auto">
              <Quote className="w-4 h-4 text-primary-500/30 mb-2 hidden md:block md:ml-auto" />
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
            <p className="text-[10px] text-surface-600 text-center sm:text-left">
              © {new Date().getFullYear()} SecHeaders — Projeto acadêmico sem fins lucrativos.
            </p>
            <p className="text-[10px] text-surface-600 text-center sm:text-right">
              Análises baseadas nas recomendações OWASP e boas práticas de segurança web.
            </p>
          </div>
        </div>
      </footer>

      {/* Analysis Toast (global, persists across pages) */}
      <AnalysisToast />
    </div>
  )
}
