import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, History, GitCompareArrows, Sparkles } from 'lucide-react'
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
    <div className="min-h-screen bg-grid">
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
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* AI Settings Modal */}
      <AISettingsModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </div>
  )
}
