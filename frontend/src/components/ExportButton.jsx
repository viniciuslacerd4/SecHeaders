import { useState } from 'react'
import { FileArrowDown, CircleNotch } from '@phosphor-icons/react'
import { exportPdf, downloadBlob } from '../lib/api'

/**
 * ExportButton — Botão para exportar análise em PDF.
 * Agora recebe os dados completos da análise ao invés de apenas o ID.
 */
export default function ExportButton({ analysisData, aiLoading = false }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (!analysisData) return
    setLoading(true)
    try {
      const blob = await exportPdf(analysisData)
      const cleanUrl = analysisData.url?.replace(/^https?:\/\//, '').replace(/\//g, '_') || 'analysis'
      downloadBlob(blob, `secheaders_${cleanUrl}.pdf`)
    } catch {
      alert('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || aiLoading || !analysisData
  const showSpinner = loading || aiLoading

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      title={aiLoading ? 'Aguardando relatório da IA…' : undefined}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 border border-surface-700/60 text-surface-300 hover:text-surface-100 hover:border-surface-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all duration-200"
    >
      {showSpinner ? (
        <CircleNotch className="w-4 h-4 animate-spin" />
      ) : (
        <FileArrowDown className="w-4 h-4" />
      )}
      Exportar PDF
    </button>
  )
}
