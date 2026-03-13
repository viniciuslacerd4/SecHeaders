import { useState, useEffect, useRef } from 'react'
import { CLASSIFICATION_CONFIG } from '../lib/utils'

/**
 * ScoreGauge — Medidor visual circular de 0 a 100.
 * Aceita delay/duration para sincronizar com outras animações na página.
 */
export default function ScoreGauge({ score = 0, classification = 'Regular', size = 180, delay = 0, duration = 1 }) {
  const config = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG['Regular']

  const radius = 45
  const circumference = 2 * Math.PI * radius

  const [animated, setAnimated] = useState(0)
  const [done, setDone] = useState(false)
  const rafRef = useRef(null)

  useEffect(() => {
    setAnimated(0)
    setDone(false)
    const startMs = delay * 1000
    const durationMs = duration * 1000
    let timeout

    timeout = setTimeout(() => {
      const startTime = performance.now()
      const tick = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        // ease-in-out cubic — visibly keeps moving until the very end
        const eased = progress < 0.5
          ? 4 * Math.pow(progress, 3)
          : 1 - Math.pow(-2 * progress + 2, 3) / 2
        setAnimated(eased * score)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setAnimated(score)
          setDone(true)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }, startMs)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [score, delay, duration])

  const dashoffset = circumference - (Math.min(animated, 100) / 100) * circumference
  const displayScore = Math.round(animated)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
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

      {/* Classification badge — aparece só quando a animação termina */}
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${config.bg} ${config.color} ${config.ring} transition-opacity duration-500`}
        style={{ opacity: done ? 1 : 0 }}
      >
        {classification}
      </span>
    </div>
  )
}
