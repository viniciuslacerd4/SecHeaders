import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, BookOpenText, ChartBar, ClockCounterClockwise, GithubLogo, MagnifyingGlass, Pause, Play } from '@phosphor-icons/react'
import AnalysisToast from './AnalysisToast'
import { useAnalysis } from './AnalysisContext'
import Logo from './Logo'
import AmbientBackground from './AmbientBackground'

const NAV_ITEMS = [
  { to: '/', icon: MagnifyingGlass, label: 'Analisar' },
  { to: '/history', icon: ClockCounterClockwise, label: 'Histórico' },
  { to: '/compare', icon: ChartBar, label: 'Comparar' },
  { to: '/learn', icon: BookOpenText, label: 'Aprofundamento' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [motionPaused, setMotionPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const moving = !motionPaused && !reducedMotion
  const { setNavigate } = useAnalysis()

  useEffect(() => { setNavigate(navigate) }, [navigate, setNavigate])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])

  return (
    <MotionConfig reducedMotion={motionPaused ? 'always' : 'user'}>
    <div className={`app-shell min-h-screen flex flex-col ${moving ? '' : 'motion-paused'}`}>
      <AmbientBackground />
      <a href="#main-content" className="skip-link">Ir para o conteúdo</a>
      <nav className="sticky top-0 z-50 border-b border-surface-700/50 bg-surface-950/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6 py-3 sm:py-0 sm:h-[72px]">
            <NavLink to="/" className="brand-link flex items-center gap-3 shrink-0 w-fit" aria-label="SecHeaders, início">
              <Logo className="w-10 h-10" />
              <span className="text-[17px] font-semibold tracking-tight text-surface-50">SecHeaders<span className="text-primary-300">.</span></span>
            </NavLink>
            <div className="flex items-center gap-1 -mx-2 sm:mx-0 overflow-x-auto" aria-label="Navegação principal">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'} className="app-nav-link">
                  {({ isActive }) => <>
                    {isActive && <motion.span className="nav-indicator" layoutId="main-navigation" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                    <Icon size={17} /><span>{label}</span>
                  </>}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1">
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32, ease: [.22, 1, .36, 1] }}><Outlet /></motion.div>
      </main>

      <footer className="border-t border-surface-700/50 bg-surface-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between gap-3">
          <p className="text-[11px] text-surface-500">© {new Date().getFullYear()} SecHeaders · Vinícius Lacerda Borges · UniFAP</p>
          <div className="flex items-center gap-5">
          <button type="button" onClick={() => setMotionPaused(paused => !paused)} disabled={!!reducedMotion} aria-pressed={moving} aria-label={moving ? 'Pausar movimento do fundo' : 'Ativar movimento do fundo'} className="motion-toggle" title={reducedMotion ? 'Movimento reduzido nas preferências do sistema' : undefined}>
            {moving ? <Pause size={13} /> : <Play size={13} />} {reducedMotion ? 'Movimento reduzido' : moving ? 'Pausar movimento' : 'Ativar movimento'}
          </button>
          <a href="https://github.com/viniciuslacerd4" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-surface-400 hover:text-primary-300 h-fit">
            <GithubLogo size={17} /> GitHub <ArrowUpRight size={14} />
          </a>
          </div>
        </div>
      </footer>
      <AnalysisToast />
    </div>
    </MotionConfig>
  )
}
