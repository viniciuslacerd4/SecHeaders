import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { exportPdf, downloadBlob } from '../lib/api'

/**
 * ExportButton — Botão para exportar análise em PDF.
 */
export default function ExportButton({ analysisId, url }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (!analysisId) return
    setLoading(true)
    try {
      const blob = await exportPdf(analysisId)
      const cleanUrl = url?.replace(/^https?:\/\//, '').replace(/\//g, '_') || 'analysis'
      downloadBlob(blob, `secheaders_${cleanUrl}.pdf`)
    } catch {
      alert('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || !analysisId}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700/60 text-surface-300 hover:text-surface-100 hover:border-surface-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all duration-200"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      Exportar PDF
    </button>
  )
}
