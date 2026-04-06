import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, CheckCircle, Lightning, Trophy, X, BookOpen, Star, CaretRight, XCircle, Fire,
  ClipboardText, Image, ShieldCheck, Prohibit, LockKey, LinkSimple, Sliders,
  FrameCorners, Shield, Package, FloppyDisk, Broom, Lightbulb, Warning,
} from '@phosphor-icons/react'

const LESSON_ICON_MAP = {
  ClipboardText, Image, ShieldCheck, Prohibit, LockKey, LinkSimple, Sliders,
  FrameCorners, Shield, Package, FloppyDisk, Broom,
}

function LessonIcon({ name, size = 24, weight = 'regular', style }) {
  const Icon = LESSON_ICON_MAP[name]
  return Icon ? <Icon size={size} weight={weight} style={style} /> : null
}
import { SECTIONS } from '../data/learningData'

// ─── Path geometry ─────────────────────────────────────────────────────────────

const PATH_WIDTH = 400
const NODE_SPACING = 140
const PADDING_Y = 60
const OFFSETS = [0, 72, 100, 72, 0, -72, -100, -72]

function getPoints(count) {
  const cx = PATH_WIDTH / 2
  return Array.from({ length: count }, (_, i) => ({
    x: cx + OFFSETS[i % OFFSETS.length],
    y: PADDING_Y + i * NODE_SPACING,
  }))
}

function buildBezierPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1], n = points[i]
    const midy = (p.y + n.y) / 2
    d += ` C ${p.x} ${midy} ${n.x} ${midy} ${n.x} ${n.y}`
  }
  return d
}

// ─── Quiz helpers ─────────────────────────────────────────────────────────────

function selectQuestions(pool, n = 5) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(n, pool.length))
  return shuffled.map(q => {
    const tagged = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correctIndex }))
    const shuffledOpts = tagged.sort(() => Math.random() - 0.5)
    return {
      ...q,
      options: shuffledOpts.map(o => o.opt),
      correctIndex: shuffledOpts.findIndex(o => o.isCorrect),
    }
  })
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ totalXP, completedCount, totalCount }) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const stats = [
    { label: 'XP Total', value: totalXP, icon: Lightning, color: '#f59e0b', colorLight: '#fcd34d' },
    { label: 'Lições', value: `${completedCount}/${totalCount}`, icon: BookOpen, color: '#6366f1', colorLight: '#818cf8' },
    { label: 'Progresso', value: `${pct}%`, icon: Fire, color: '#10b981', colorLight: '#34d399' },
  ]

  return (
    <div className="mb-8 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color, colorLight }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border p-4"
            style={{ backgroundColor: color + '0d', borderColor: color + '30' }}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: color + '25' }} />
            <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: color + '20' }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: color + 'aa' }}>{label}</p>
            <motion.p key={String(value)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xl font-black leading-none" style={{ color: colorLight }}>
              {value}
            </motion.p>
          </motion.div>
        ))}
      </div>

      {/* Global progress bar */}
      <div className="h-2 bg-surface-800/70 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8, #6366f1)', backgroundSize: '200%' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  )
}

// ─── SectionBanner ────────────────────────────────────────────────────────────

function SectionBanner({ section, isLocked, completedCount }) {
  const total = section.lessons.length
  const pct = (completedCount / total) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-sm lg:max-w-none mx-auto my-6 rounded-3xl overflow-hidden"
      style={{
        background: isLocked
          ? 'rgba(15,23,42,0.5)'
          : `linear-gradient(135deg, ${section.color}1a 0%, ${section.color}08 100%)`,
        border: `1px solid ${isLocked ? '#1e293b' : section.color + '38'}`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {!isLocked && (
        <>
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: section.color + '22' }} />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: section.color + '10' }} />
        </>
      )}

      <div className="relative p-5">
        <div className="flex items-start gap-3.5">
          {/* Number badge */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black"
            style={{ backgroundColor: isLocked ? '#1e293b' : section.color + '28', color: isLocked ? '#334155' : section.colorLight }}
          >
            {section.id}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-0.5" style={{ color: isLocked ? '#334155' : section.colorLight }}>
              Módulo {section.id}
            </p>
            <h2 className={`text-sm font-bold leading-snug ${isLocked ? 'text-surface-600' : 'text-surface-100'}`}>{section.title}</h2>
            <p className={`text-[11px] mt-0.5 leading-snug ${isLocked ? 'text-surface-700' : 'text-surface-500'}`}>{section.subtitle}</p>
          </div>

          {isLocked ? (
            <div className="w-10 h-10 rounded-2xl bg-surface-800/60 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-surface-600" />
            </div>
          ) : (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-black leading-none" style={{ color: section.colorLight }}>
                {completedCount}
                <span className="text-surface-600 text-sm font-normal">/{total}</span>
              </p>
              <p className="text-[9px] text-surface-600 uppercase tracking-wide mt-0.5">lições</p>
            </div>
          )}
        </div>

        {!isLocked && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(15,23,42,0.6)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${section.color}, ${section.colorLight})` }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        )}

        {isLocked && (
          <p className="text-[11px] text-surface-600 mt-3 italic">Complete o módulo anterior para desbloquear</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── LessonNode ───────────────────────────────────────────────────────────────

function LessonNode({ lesson, isCompleted, isLocked, isFirst, section, onClick, labelSide = 'right' }) {
  const isActive = !isCompleted && !isLocked

  const labelClass = labelSide === 'right'
    ? 'absolute left-full top-1/2 -translate-y-1/2 ml-3 text-left'
    : 'absolute right-full top-1/2 -translate-y-1/2 mr-3 text-right'

  return (
    <div className="flex flex-col items-center">
      {isFirst && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[9px] font-black px-3 py-1 rounded-full tracking-[0.15em] uppercase mb-2"
          style={{
            backgroundColor: isLocked ? 'rgba(30,41,59,0.8)' : section.color + 'dd',
            color: isLocked ? '#475569' : '#fff',
          }}
        >
          Início
        </motion.div>
      )}

      <div className="relative flex items-center justify-center">
        {/* Minimalist active ring */}
        {isActive && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 86, height: 86, border: `1px solid ${section.color}` }}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <motion.button
          whileHover={!isLocked ? { scale: 1.1, y: -2 } : {}}
          whileTap={!isLocked ? { scale: 0.93 } : {}}
          onClick={onClick}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center border-[4px] transition-shadow duration-300"
          style={
            isLocked ? {
              backgroundColor: '#0f172a',
              borderColor: '#1e293b',
              cursor: 'default',
            } : isCompleted ? {
              background: `linear-gradient(145deg, ${section.color}, ${section.colorLight})`,
              borderColor: 'rgba(255,255,255,0.18)',
              boxShadow: `0 0 32px ${section.color}55, 0 8px 24px rgba(0,0,0,0.5)`,
            } : {
              backgroundColor: '#0f172a',
              borderColor: section.color + 'cc',
              boxShadow: `0 0 18px ${section.color}35, 0 4px 16px rgba(0,0,0,0.4)`,
            }
          }
        >
          {isLocked ? (
            <Lock className="w-6 h-6" style={{ color: '#1e293b' }} />
          ) : isCompleted ? (
            <CheckCircle className="w-8 h-8 text-white drop-shadow" />
          ) : (
            <LessonIcon name={lesson.icon} size={28} weight="regular" style={{ color: section.color }} />
          )}
        </motion.button>

        {/* Label always beside the node, never below the path */}
        {!isLocked && (
          <div className={`${labelClass} whitespace-nowrap pointer-events-none`}>
            <p className="text-[11px] font-semibold text-surface-400 leading-tight">{lesson.abbr}</p>
            <p className="text-[9px] font-bold mt-0.5" style={{ color: section.color + 'cc' }}>{lesson.xp} XP</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SectionPath ──────────────────────────────────────────────────────────────

function SectionPath({ section, completedSet, isLocked, onNodeClick }) {
  const { lessons } = section
  const height = lessons.length * NODE_SPACING + PADDING_Y * 2
  const points = getPoints(lessons.length)
  const pathD = buildBezierPath(points)

  return (
    <div className="relative mx-auto" style={{ width: PATH_WIDTH, height }}>
      <svg className="absolute inset-0 pointer-events-none" width={PATH_WIDTH} height={height}>
        {/* Shadow path */}
        <path d={pathD} stroke={isLocked ? '#0f172a' : section.color + '18'} strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* Dashed path */}
        <path d={pathD} stroke={isLocked ? '#1e293b' : section.color + '55'} strokeWidth="4" strokeDasharray="9 9" fill="none" strokeLinecap="round" />
      </svg>

      {lessons.map((lesson, i) => {
        const { x, y } = points[i]
        const isCompleted = completedSet.has(lesson.id)
        const offset = OFFSETS[i % OFFSETS.length]
        const labelSide = offset >= 0 ? 'right' : 'left'
        return (
          <div key={lesson.id} className="absolute flex justify-center" style={{ left: x - 44, top: y - 44, width: 88 }}>
            <LessonNode
              lesson={lesson}
              isCompleted={isCompleted}
              isLocked={isLocked}
              isFirst={i === 0}
              section={section}
              labelSide={labelSide}
              onClick={() => !isLocked && onNodeClick(lesson, section)}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }) {
  const map = {
    Fácil: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
    Médio: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#facc15' },
    Difícil: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
  }
  const s = map[difficulty] ?? { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8' }
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}>
      {difficulty}
    </span>
  )
}

function SectionLabel({ children, color }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: color + 'aa' }}>{children}</p>
    </div>
  )
}

// ─── ContentPhase ─────────────────────────────────────────────────────────────

function ContentPhase({ lesson, section, isCompleted, onStartQuiz, onClose }) {
  const { content } = lesson

  return (
    <>
      {/* Hero header */}
      <div className="relative overflow-hidden shrink-0" style={{ background: `linear-gradient(160deg, ${section.color}28 0%, ${section.color}0a 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: section.color + '20' }} />
        </div>
        <div className="relative px-5 pt-5 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-800/80 hover:bg-surface-700 flex items-center justify-center transition-colors backdrop-blur-sm">
            <X className="w-4 h-4 text-surface-400" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl flex items-center justify-center shrink-0" style={{ backgroundColor: section.color + '28', boxShadow: `0 0 24px ${section.color}35` }}>
              <LessonIcon name={lesson.icon} size={30} weight="regular" style={{ color: section.colorLight }} />
            </div>
            <div className="pr-10">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: section.colorLight + 'aa' }}>HTTP Header</p>
              <h2 className="text-base font-bold text-surface-100 leading-snug">{lesson.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <DifficultyBadge difficulty={lesson.difficulty} />
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}>
                  <Lightning className="w-3 h-3" />{lesson.xp} XP
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-px mx-5" style={{ background: `linear-gradient(90deg, transparent, ${section.color}30, transparent)` }} />
      </div>

      {/* Content */}
      <div className="px-5 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
        {/* Attack */}
        <div className="relative overflow-hidden rounded-2xl px-4 py-3.5" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }} />
          <div className="flex items-center gap-1.5 mb-1">
            <Warning size={12} weight="fill" className="text-red-500/70" />
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-500/70">Ataque que previne</p>
          </div>
          <p className="text-sm font-bold text-red-300">{content.attack}</p>
        </div>

        <div>
          <SectionLabel color={section.color}>O que é?</SectionLabel>
          <p className="text-sm text-surface-300 leading-relaxed">{content.description}</p>
        </div>

        <div>
          <SectionLabel color={section.color}>Por que importa?</SectionLabel>
          <p className="text-sm text-surface-300 leading-relaxed">{content.why}</p>
        </div>

        <div>
          <SectionLabel color={section.color}>Valores</SectionLabel>
          <div className="space-y-2">
            {content.values.map((v, i) => (
              <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-2xl border"
                style={{
                  backgroundColor: v.recommended ? section.color + '0e' : 'rgba(15,23,42,0.5)',
                  borderColor: v.recommended ? section.color + '35' : 'rgba(30,41,59,0.8)',
                }}>
                {v.recommended
                  ? <Star className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: section.colorLight }} />
                  : <div className="w-3.5 h-3.5 shrink-0" />
                }
                <div>
                  <code className="text-xs font-mono font-bold" style={{ color: v.recommended ? section.colorLight : '#94a3b8' }}>{v.value}</code>
                  <p className="text-[11px] text-surface-500 mt-0.5 leading-snug">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel color={section.color}>Exemplo</SectionLabel>
          <div className="rounded-2xl overflow-hidden border border-surface-800/60">
            <div className="px-4 py-1.5 flex items-center gap-2" style={{ backgroundColor: 'rgba(15,23,42,0.8)' }}>
              <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/50" /></div>
              <span className="text-[9px] text-surface-600 font-mono uppercase tracking-widest ml-1">HTTP Header</span>
            </div>
            <div className="px-4 py-3 bg-surface-950/90">
              <code className="text-xs font-mono leading-relaxed break-all" style={{ color: section.colorLight }}>{content.example}</code>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-4 py-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <Lightbulb size={18} weight="fill" className="shrink-0 text-yellow-400/80" />
          <p className="text-[12px] text-yellow-200/85 leading-relaxed">{content.tip}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(30,41,59,0.8)' }}>
        {isCompleted ? (
          <div className="flex gap-3">
            <div className="flex flex-1 items-center justify-center gap-2 py-2.5 rounded-2xl" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-400">Concluída</span>
            </div>
            <button onClick={onStartQuiz} className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-bold text-sm border transition-all hover:opacity-90"
              style={{ borderColor: section.color + '50', color: section.colorLight, backgroundColor: section.color + '18' }}>
              Repetir Quiz
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartQuiz}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${section.color}, ${section.colorLight})`, boxShadow: `0 8px 24px ${section.color}40` }}
          >
            Iniciar Quiz
            <CaretRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </>
  )
}

// ─── QuizPhase ────────────────────────────────────────────────────────────────

function QuizPhase({ lesson, section, questions, onFinish, onClose }) {
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])

  const currentQ = questions[qIndex]
  const isAnswered = selected !== null
  const isCorrect = isAnswered && selected === currentQ.correctIndex

  const handleSelect = useCallback((idx) => {
    if (isAnswered) return
    setSelected(idx)
    setAnswers(prev => [...prev, { correct: idx === currentQ.correctIndex }])
  }, [isAnswered, currentQ])

  const handleContinue = useCallback(() => {
    const next = [...answers]
    if (qIndex + 1 >= questions.length) {
      onFinish(next)
    } else {
      setQIndex(q => q + 1)
      setSelected(null)
    }
  }, [answers, qIndex, questions.length, onFinish])

  // Keyboard shortcuts: 1-4 to select, Enter/Space to continue
  useEffect(() => {
    const handler = (e) => {
      if (isAnswered) {
        if (e.key === 'Enter' || e.key === ' ') handleContinue()
      } else {
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < currentQ.options.length) handleSelect(idx)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAnswered, handleSelect, handleContinue, currentQ])

  const getOptionStyle = (idx) => {
    if (!isAnswered) return {
      backgroundColor: 'rgba(15,23,42,0.6)',
      borderColor: '#1e293b',
    }
    if (idx === currentQ.correctIndex) return {
      backgroundColor: 'rgba(34,197,94,0.1)',
      borderColor: 'rgba(34,197,94,0.45)',
    }
    if (idx === selected) return {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderColor: 'rgba(239,68,68,0.45)',
    }
    return { backgroundColor: 'rgba(15,23,42,0.3)', borderColor: '#0f172a', opacity: 0.4 }
  }

  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-800/80 hover:bg-surface-700 flex items-center justify-center transition-colors shrink-0">
            <X className="w-4 h-4 text-surface-400" />
          </button>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-surface-800/60">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${section.color}, ${section.colorLight})` }}
              animate={{ width: `${((qIndex) / questions.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: section.colorLight }}>{qIndex + 1}<span className="text-surface-600 font-normal">/{questions.length}</span></span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: section.color + '20' }}>
            <LessonIcon name={lesson.icon} size={16} weight="regular" style={{ color: section.color }} />
          </div>
          <p className="text-xs font-medium text-surface-400">{lesson.name}</p>
        </div>
      </div>

      {/* Question */}
      <div className="px-5 flex-1 overflow-y-auto pb-4">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: section.color + 'aa' }}>Questão {qIndex + 1}</span>
          </div>
          <p className="text-[15px] font-semibold text-surface-100 mb-6 leading-snug">{currentQ.question}</p>

          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => (
              <motion.button
                key={`${qIndex}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.055, duration: 0.22 }}
                whileHover={!isAnswered ? { x: 3 } : {}}
                whileTap={!isAnswered ? { scale: 0.99 } : {}}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 text-left transition-all duration-200"
                style={getOptionStyle(idx)}
              >
                {/* Letter badge */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all"
                  style={
                    !isAnswered ? { backgroundColor: '#1e293b', color: '#475569' }
                    : idx === currentQ.correctIndex ? { backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80' }
                    : idx === selected ? { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }
                    : { backgroundColor: '#0f172a', color: '#334155' }
                  }
                >
                  {LABELS[idx]}
                </div>

                <span className="text-sm text-surface-200 leading-snug font-medium flex-1">{opt}</span>

                {isAnswered && idx === currentQ.correctIndex && <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />}
                {isAnswered && idx === selected && idx !== currentQ.correctIndex && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                {!isAnswered && <span className="text-[9px] text-surface-700 shrink-0 font-mono">{idx + 1}</span>}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="shrink-0 px-5 py-4"
            style={{
              borderTop: `1px solid ${isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              background: isCorrect
                ? 'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.1) 100%)'
                : 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.1) 100%)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black mb-1" style={{ color: isCorrect ? '#4ade80' : '#f87171' }}>
                  {isCorrect ? '✓ Correto!' : '✗ Incorreto'}
                </p>
                <p className="text-xs text-surface-400 leading-snug">{currentQ.explanation}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}
                className="shrink-0 px-5 py-2.5 rounded-2xl font-bold text-sm text-white transition-all"
                style={{
                  background: isCorrect
                    ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                    : 'linear-gradient(135deg, #dc2626, #ef4444)',
                  boxShadow: isCorrect ? '0 4px 16px rgba(34,197,94,0.35)' : '0 4px 16px rgba(239,68,68,0.35)',
                }}
              >
                {qIndex + 1 >= questions.length ? 'Ver resultado' : 'Continuar'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── ResultPhase ──────────────────────────────────────────────────────────────

function ResultPhase({ lesson, section, answers, isAlreadyCompleted, onComplete, onRetry, onClose }) {
  const correctCount = answers.filter(a => a.correct).length
  const total = answers.length
  const passed = correctCount / total >= 0.75

  const config = passed
    ? correctCount === total
      ? { ResultIcon: Trophy, iconColor: '#f59e0b', title: 'Perfeito!', subtitle: 'Acertou tudo!', color: '#f59e0b' }
      : { ResultIcon: Star, iconColor: '#6366f1', title: 'Aprovado!', subtitle: `${correctCount}/${total} corretas`, color: '#6366f1' }
    : { ResultIcon: BookOpen, iconColor: '#ef4444', title: 'Quase lá!', subtitle: `${correctCount}/${total} corretas — precisa de 75%`, color: '#ef4444' }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 flex justify-end shrink-0">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-800/80 hover:bg-surface-700 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-surface-400" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center pb-2">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 180 }}
        >
          <config.ResultIcon size={72} weight="fill" style={{ color: config.iconColor, filter: `drop-shadow(0 0 20px ${config.iconColor}60)` }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h2 className="text-2xl font-black text-surface-100 mb-1">{config.title}</h2>
          <p className="text-sm" style={{ color: config.color }}>{config.subtitle}</p>
        </motion.div>

        {/* Answer indicators */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex gap-2.5 flex-wrap justify-center">
          {answers.map((a, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.36 + i * 0.08, type: 'spring', stiffness: 300 }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center border-2"
              style={
                a.correct
                  ? { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)' }
                  : { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)' }
              }
            >
              {a.correct
                ? <CheckCircle className="w-5 h-5 text-green-400" />
                : <XCircle className="w-5 h-5 text-red-400" />
              }
            </motion.div>
          ))}
        </motion.div>

        {/* XP badge — only shown on pass */}
        {passed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.52 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }}
          >
            <Lightning className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-black text-base">+{lesson.xp} XP</span>
            <span className="text-yellow-600 text-xs">{isAlreadyCompleted ? '(já ganho)' : ''}</span>
          </motion.div>
        )}

        {/* Fail hint */}
        {!passed && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-xs text-surface-500 leading-snug max-w-[240px]">
            Estude o conteúdo novamente e tente uma nova seleção de perguntas.
          </motion.p>
        )}
      </div>

      <div className="px-5 pb-6 shrink-0 pt-2 space-y-2.5">
        {passed ? (
          isAlreadyCompleted ? (
            <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-bold text-sm bg-surface-800 hover:bg-surface-700 text-surface-100 transition-colors">
              Fechar
            </button>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${section.color}, ${section.colorLight})`,
                boxShadow: `0 8px 28px ${section.color}45`,
              }}
            >
              <CheckCircle className="w-4 h-4" />
              Concluir Lição
            </motion.button>
          )
        ) : (
          <>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 8px 28px rgba(239,68,68,0.35)' }}
            >
              Tentar Novamente
            </motion.button>
            <button onClick={onClose} className="w-full py-2.5 rounded-2xl font-medium text-sm text-surface-500 hover:text-surface-300 transition-colors">
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── LessonModal ──────────────────────────────────────────────────────────────

function LessonModal({ lesson, section, isCompleted, onClose, onComplete }) {
  const [phase, setPhase] = useState('content')
  const [quizAnswers, setQuizAnswers] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])

  const startQuiz = useCallback(() => {
    setSelectedQuestions(selectQuestions(lesson.quiz, 5))
    setQuizAnswers([])
    setPhase('quiz')
  }, [lesson.quiz])

  const retryQuiz = useCallback(() => {
    setSelectedQuestions(selectQuestions(lesson.quiz, 5))
    setQuizAnswers([])
    setPhase('quiz')
  }, [lesson.quiz])

  const phaseVariants = {
    content: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    quiz:    { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -28 } },
    result:  { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0 } },
  }
  const v = phaseVariants[phase]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(2,6,23,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-lg flex flex-col rounded-t-[28px] sm:rounded-[24px] overflow-hidden"
        style={{ maxHeight: '90vh', backgroundColor: '#0d1526', border: '1px solid rgba(30,41,59,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div key={phase} {...v} transition={{ duration: 0.2 }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {phase === 'content' && (
              <ContentPhase lesson={lesson} section={section} isCompleted={isCompleted}
                onStartQuiz={startQuiz} onClose={onClose} />
            )}
            {phase === 'quiz' && (
              <QuizPhase lesson={lesson} section={section} questions={selectedQuestions}
                onFinish={(ans) => { setQuizAnswers(ans); setPhase('result') }} onClose={onClose} />
            )}
            {phase === 'result' && (
              <ResultPhase lesson={lesson} section={section} answers={quizAnswers}
                isAlreadyCompleted={isCompleted} onComplete={onComplete} onRetry={retryQuiz} onClose={onClose} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ─── XP Toast ─────────────────────────────────────────────────────────────────

function XPToast({ xp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{ type: 'spring', damping: 16 }}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl pointer-events-none font-black text-sm"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #fcd34d)', color: '#78350f', boxShadow: '0 8px 32px rgba(245,158,11,0.5)' }}
    >
      <Lightning className="w-4 h-4" />+{xp} XP
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Learn() {
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const saved = localStorage.getItem('secheaders_learn_progress')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [showXP, setShowXP] = useState(null)

  const allLessons = SECTIONS.flatMap(s => s.lessons)
  const totalXP = allLessons.filter(l => completedLessons.has(l.id)).reduce((acc, l) => acc + l.xp, 0)

  const isSectionUnlocked = useCallback(
    idx => idx === 0 || SECTIONS[idx - 1].lessons.every(l => completedLessons.has(l.id)),
    [completedLessons],
  )

  const handleClose = () => { setSelectedLesson(null); setSelectedSection(null) }

  const handleComplete = () => {
    if (!selectedLesson || completedLessons.has(selectedLesson.id)) return
    const newSet = new Set(completedLessons)
    newSet.add(selectedLesson.id)
    setCompletedLessons(newSet)
    localStorage.setItem('secheaders_learn_progress', JSON.stringify([...newSet]))
    setShowXP(selectedLesson.xp)
    setTimeout(() => setShowXP(null), 2000)
    handleClose()
  }

  const allDone = completedLessons.size === allLessons.length

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-5 h-5 text-primary-400" />
          <h1 className="text-xl font-bold text-surface-100">Trilha de Aprendizado</h1>
        </div>
      </div>

      <StatsBar totalXP={totalXP} completedCount={completedLessons.size} totalCount={allLessons.length} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 pb-12">
        {SECTIONS.map((section, idx) => {
          const unlocked = isSectionUnlocked(idx)
          const completedInSection = section.lessons.filter(l => completedLessons.has(l.id)).length
          return (
            <div key={section.id} className="flex flex-col items-center">
              <SectionBanner section={section} isLocked={!unlocked} completedCount={completedInSection} />
              <SectionPath
                section={section}
                completedSet={completedLessons}
                isLocked={!unlocked}
                onNodeClick={(lesson, sec) => { setSelectedLesson(lesson); setSelectedSection(sec) }}
              />
            </div>
          )
        })}

        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14 }}
              className="col-span-full mt-12 flex flex-col items-center gap-3 p-8 text-center max-w-xs mx-auto rounded-3xl"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Trophy className="w-14 h-14 text-yellow-400" style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.5))' }} />
              <h2 className="text-xl font-black text-yellow-300">Trilha Concluída!</h2>
              <p className="text-sm text-surface-500">Você dominou todos os Security Headers</p>
              <p className="text-3xl font-black text-yellow-400">{totalXP} XP</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedLesson && selectedSection && (
          <LessonModal
            lesson={selectedLesson}
            section={selectedSection}
            isCompleted={completedLessons.has(selectedLesson.id)}
            onClose={handleClose}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{showXP && <XPToast xp={showXP} />}</AnimatePresence>
    </div>
  )
}
