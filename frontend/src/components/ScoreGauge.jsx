import { useMemo } from 'react'
import { CLASSIFICATION_CONFIG } from '../lib/utils'

/**
 * ScoreGauge — Medidor visual circular de 0 a 100.
 * Usa SVG com stroke-dashoffset animado.
 */
export default function ScoreGauge({ score = 0, classification = 'Regular', size = 180 }) {
  const config = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG['Regular']

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const dashoffset = circumference - (progress / 100) * circumference

  const displayScore = useMemo(() => Math.round(score * 10) / 10, [score])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90"
        >
          {/* Background track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-surface-800"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={config.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            className="gauge-animated transition-all duration-1000"
            style={{ '--gauge-offset': dashoffset }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-extrabold tabular-nums ${config.color}`}>
            {displayScore}
          </span>
          <span className="text-surface-500 text-xs font-medium mt-0.5">de 100</span>
        </div>
      </div>

      {/* Classification badge */}
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${config.bg} ${config.color} ${config.ring}`}>
        {classification}
      </span>
    </div>
  )
}
