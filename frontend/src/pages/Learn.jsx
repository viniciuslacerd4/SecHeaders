import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Copy, MagnifyingGlass, X } from '@phosphor-icons/react'
import { SECTIONS } from '../data/learningData'

const TOPICS = SECTIONS.flatMap(section => section.lessons.map(lesson => ({ ...lesson, section: section.title, sectionId: section.id })))
const FILTERS = ['Todos', 'Fundamentos', 'Transporte', 'Isolamento', 'Dados']
const SUMMARIES = {
  'x-content-type-options': 'Como o navegador interpreta seus arquivos.',
  'x-frame-options': 'Controle a exibição de páginas em iframes.',
  csp: 'Defina as fontes de conteúdo permitidas.',
  'x-xss-protection': 'Entenda os limites de uma proteção legada.',
  hsts: 'Garanta conexões HTTPS nas próximas visitas.',
  'referrer-policy': 'Controle o que a navegação revela.',
  'permissions-policy': 'Restrinja os recursos disponíveis no navegador.',
  coop: 'Separe o contexto de navegação entre origens.',
  coep: 'Defina quais recursos externos podem ser usados.',
  corp: 'Controle quem pode carregar seus recursos.',
  'cache-control': 'Determine o que pode ser armazenado em cache.',
  'clear-site-data': 'Remova dados locais ao encerrar uma sessão.',
}
const TABS = [{ id: 'concept', label: 'Conceito' }, { id: 'config', label: 'Configuração' }, { id: 'practice', label: 'Praticar' }]

function Practice({ lesson }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const question = lesson.quiz[questionIndex]

  function nextQuestion() {
    setQuestionIndex(index => (index + 1) % lesson.quiz.length)
    setSelected(null)
  }

  return (
    <section aria-label="Prática livre">
      <div className="section-row mb-5"><span className="section-label">Cenário {String(questionIndex + 1).padStart(2, '0')}</span><button type="button" onClick={nextQuestion}>Outro cenário <ArrowRight size={15} /></button></div>
      <motion.div key={questionIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
        <h3 className="text-lg leading-relaxed text-surface-100 mb-6">{question.question}</h3>
        <div className="grid gap-2.5">
          {question.options.map((option, index) => <button key={index} type="button" disabled={selected !== null} onClick={() => setSelected(index)} className={`learn-option ${selected !== null && index === question.correctIndex ? 'is-correct' : ''} ${selected === index && index !== question.correctIndex ? 'is-incorrect' : ''}`}>
            <span className="learn-option-letter">{String.fromCharCode(65 + index)}</span><span className="flex-1">{option}</span>
            {selected !== null && index === question.correctIndex && <Check size={17} className="shrink-0 mt-0.5" aria-label="Resposta correta" />}
          </button>)}
        </div>
        <AnimatePresence>
          {selected !== null && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .25 }} className="overflow-hidden" role="status">
            <div className="practice-feedback">
              <p className="font-medium text-sm text-surface-100 mb-2">{selected === question.correctIndex ? 'Resposta correta.' : 'Entenda a resposta.'}</p>
              <p className="text-sm leading-7 text-surface-400">{question.explanation}</p>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-surface-300 hover:text-surface-100 mt-4">Rever este cenário</button>
            </div>
          </motion.div>}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

function TopicArticle({ lesson }) {
  const [tab, setTab] = useState('concept')
  const [copyState, setCopyState] = useState('idle')
  const { content } = lesson

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(content.example)
      setCopyState('copied')
    } catch { setCopyState('error') }
  }

  function handleTabKey(event, index) {
    const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null
    if (next === null) return
    event.preventDefault()
    setTab(TABS[next].id)
    document.getElementById(`topic-tab-${TABS[next].id}`)?.focus()
  }

  return (
    <article className="topic-article">
      <header className="topic-heading">
        <span className="section-label">{lesson.section}</span>
        <h1>{lesson.name}</h1>
        <p>{SUMMARIES[lesson.id]}</p>
      </header>
      <div role="tablist" aria-label="Conteúdo do tópico" className="topic-tabs">
        {TABS.map((item, index) => <button type="button" key={item.id} id={`topic-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`topic-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => handleTabKey(event, index)}>
          {item.label}{tab === item.id && <motion.span layoutId="topic-tab-indicator" className="tab-indicator" transition={{ type: 'spring', stiffness: 450, damping: 38 }} />}
        </button>)}
      </div>
      <div className="topic-panels">
        <section id="topic-panel-concept" role="tabpanel" aria-labelledby="topic-tab-concept" hidden={tab !== 'concept'} tabIndex={0} className="topic-panel">
          <h2 className="learn-section-title">Como funciona</h2>
          <p className="topic-prose">{content.description}</p>
          <div className="topic-context"><span>Risco relacionado</span><p>{content.attack}</p></div>
          <h2 className="learn-section-title">Na prática</h2>
          <p className="topic-prose">{content.why}</p>
          <button className="text-action mt-8" type="button" onClick={() => { setTab('config'); document.getElementById('topic-tab-config')?.focus() }}>Ver configuração <ArrowRight size={16} /></button>
        </section>
        <section id="topic-panel-config" role="tabpanel" aria-labelledby="topic-tab-config" hidden={tab !== 'config'} tabIndex={0} className="topic-panel">
          <div className="section-row mb-4"><h2>Exemplo HTTP</h2><button type="button" onClick={copyExample}>{copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}{copyState === 'copied' ? 'Copiado' : 'Copiar'}</button></div>
          <pre className="learn-code"><code>{content.example}</code></pre>
          {copyState === 'error' && <p role="status" className="text-xs text-amber-300 mt-3">Selecione o exemplo para copiar manualmente.</p>}
          <h2 className="learn-section-title mt-8">Valores disponíveis</h2>
          <div className="config-values">
            {content.values.map((item, index) => <div key={index}>
              <div className="flex flex-wrap items-center gap-3"><code>{item.value}</code>{item.recommended && <span className="recommended-label"><Check size={12} /> Recomendado</span>}</div>
              <p>{item.description}</p>
            </div>)}
          </div>
          <p className="implementation-note">{content.tip}</p>
        </section>
        <div id="topic-panel-practice" role="tabpanel" aria-labelledby="topic-tab-practice" hidden={tab !== 'practice'} tabIndex={0} className="topic-panel"><Practice lesson={lesson} /></div>
      </div>
    </article>
  )
}

export default function Learn() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [section, setSection] = useState(0)
  const active = TOPICS.find(topic => topic.id === params.get('topic'))
  const filtered = useMemo(() => TOPICS.filter(topic => (!section || topic.sectionId === section) && `${topic.name} ${topic.abbr} ${topic.content.attack} ${topic.content.description}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))), [query, section])

  function selectTopic(id) {
    setParams({ topic: id })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (active) return (
    <div className="pb-12">
      <button type="button" onClick={() => setParams({})} className="text-action mb-8"><ArrowLeft size={16} /> Todos os tópicos</button>
      <div className="topic-layout">
        <aside className="topic-directory hidden lg:block" aria-label="Escolher tópico">
          {SECTIONS.map(group => <div key={group.id}><p>{FILTERS[group.id]}</p>{group.lessons.map(topic => <button type="button" key={topic.id} onClick={() => selectTopic(topic.id)} aria-current={active.id === topic.id ? 'page' : undefined} title={topic.name}>{topic.name}</button>)}</div>)}
        </aside>
        <motion.div className="min-w-0" key={active.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}><TopicArticle lesson={active} /></motion.div>
      </div>
    </div>
  )

  return (
    <div className="pb-12">
      <header className="library-heading"><div><span className="section-label">Biblioteca / {TOPICS.length} tópicos</span><h1>Aprofundamento</h1><p>Entenda. Configure. Experimente.</p></div>
        <label className="library-search"><MagnifyingGlass size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar um header" aria-label="Buscar um header" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
      </header>
      <div className="library-filters" aria-label="Filtrar por tema">{FILTERS.map((label, index) => <button type="button" key={label} aria-pressed={section === index} onClick={() => setSection(index)}>{label}</button>)}</div>
      {filtered.length ? <div className="topic-catalog">{filtered.map(topic => <button type="button" key={topic.id} className="topic-card" onClick={() => selectTopic(topic.id)}>
        <div className="topic-card-top"><span className="topic-abbr">{topic.abbr}</span><ArrowRight size={18} /></div>
        <h2>{topic.name}</h2><p>{SUMMARIES[topic.id]}</p><span className="topic-category">{FILTERS[topic.sectionId]}</span>
      </button>)}</div> : <div className="empty-search"><p>Nenhum tópico encontrado.</p><button type="button" className="text-action" onClick={() => { setQuery(''); setSection(0) }}>Limpar filtros <ArrowRight size={15} /></button></div>}
    </div>
  )
}
