/**
 * Utilitários de formatação e helpers do frontend.
 */

export const SEVERITY_CONFIG = {
  critical: { label: 'Crítico', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  high:     { label: 'Alto',    color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { label: 'Médio',   color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { label: 'Baixo',   color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  info:     { label: 'OK',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
}

export const CLASSIFICATION_CONFIG = {
  'Crítico':   { color: 'text-red-500', bg: 'bg-red-500/15', ring: 'ring-red-500/30', stroke: '#ef4444' },
  'Regular':   { color: 'text-yellow-500', bg: 'bg-yellow-500/15', ring: 'ring-yellow-500/30', stroke: '#eab308' },
  'Bom':       { color: 'text-green-500', bg: 'bg-green-500/15', ring: 'ring-green-500/30', stroke: '#22c55e' },
  'Excelente': { color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', stroke: '#10b981' },
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function cleanUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
