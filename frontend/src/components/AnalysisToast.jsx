import { motion, AnimatePresence } from 'framer-motion'
import { Globe, X, CircleNotch } from '@phosphor-icons/react'
import { useAnalysis } from './AnalysisContext'

export default function AnalysisToast() {
    const { loading, url, error, dismissError } = useAnalysis()

    const show = loading || error

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: .22 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md"
                >
                    {loading && (
                        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-surface-900/95 border border-primary-500/30 shadow-xl shadow-primary-900/20 backdrop-blur-xl">
                            {/* Spinner */}
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-primary-600/15 flex items-center justify-center">
                                    <CircleNotch className="animate-spin w-4.5 h-4.5 text-primary-400" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-surface-200">
                                    Analisando…
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Globe className="w-3 h-3 text-surface-500 shrink-0" />
                                    <p className="text-xs text-surface-400 truncate">{url}</p>
                                </div>
                            </div>

                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-surface-900/95 border border-red-500/30 shadow-xl shadow-red-900/20 backdrop-blur-xl">
                            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                                <span className="text-red-400 text-sm font-bold">!</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-red-300">
                                    Erro na análise
                                </p>
                                <p className="text-xs text-surface-400 truncate mt-0.5">
                                    {error}
                                </p>
                            </div>
                            <button
                                onClick={dismissError}
                                aria-label="Fechar aviso"
                                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/60 transition-colors shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
