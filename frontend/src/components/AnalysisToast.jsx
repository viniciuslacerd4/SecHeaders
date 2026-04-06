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
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md"
                >
                    {loading && (
                        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-surface-900/95 border border-primary-500/30 shadow-xl shadow-primary-900/20 backdrop-blur-xl">
                            {/* Spinner */}
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-primary-600/15 flex items-center justify-center">
                                    <CircleNotch className="animate-spin w-4.5 h-4.5 text-primary-400" />
                                </div>
                                {/* Pulse ring */}
                                <div className="absolute inset-0 rounded-xl bg-primary-500/20 animate-ping" style={{ animationDuration: '2s' }} />
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

                            {/* Progress bar */}
                            <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-surface-800 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '350%' }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 2,
                                        ease: [0.4, 0, 0.2, 1],
                                    }}
                                    style={{ width: '40%' }}
                                />
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
