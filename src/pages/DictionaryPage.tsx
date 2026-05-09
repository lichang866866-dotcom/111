import { useEffect, useRef, useState } from 'react'
import { Search, Volume2, Loader2, BookMarked, Plus, Library, CheckSquare, Square, GraduationCap, Globe, Stethoscope, Scale, Cpu, Briefcase, ChevronRight } from 'lucide-react'
import { DictionaryEntry } from '../types'

interface DictWord {
  id: number
  dictionary_id: number
  word: string
  meaning: string | null
  phonetic: string | null
  example: string | null
}

interface Dictionary {
  id: number
  name: string
  description: string
  category: string
  wordCount: number
  progress?: number
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
  domestic: { label: '国内考试', icon: GraduationCap },
  overseas: { label: '出国留学', icon: Globe },
  professional: { label: '专业词汇', icon: Briefcase },
}

const DICT_ICONS: Record<string, any> = {
  '高考': GraduationCap,
  '考研': GraduationCap,
  '雅思': Globe,
  '托福': Globe,
  'GRE': Globe,
  '医学': Stethoscope,
  '法律': Scale,
  '计算机': Cpu,
  '商务': Briefcase,
}

export default function DictionaryPage() {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([])
  const [selectedDict, setSelectedDict] = useState<number | null>(null)
  const [dictWords, setDictWords] = useState<DictWord[]>([])
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<DictionaryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [dictLoading, setDictLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadDictionaries()
  }, [])

  async function loadDictionaries() {
    const rows = await window.electronAPI.getDictionaries()
    // Add word count and progress to each dictionary
    const dictsWithCount = await Promise.all(
      rows.map(async (d: any) => {
        const count = await window.electronAPI.getDictionaryWordCount(d.id)
        return { ...d, wordCount: count, progress: 0 }
      })
    )
    setDictionaries(dictsWithCount)
  }

  async function loadDictionaryWords(dictId: number) {
    setDictLoading(true)
    const rows = await window.electronAPI.getDictionaryWords(dictId)
    setDictWords(rows)
    setSelectedWords(new Set())
    setDictLoading(false)
  }

  function toggleWord(id: number) {
    const next = new Set(selectedWords)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedWords(next)
  }

  function toggleAll() {
    if (selectedWords.size === dictWords.length) {
      setSelectedWords(new Set())
    } else {
      setSelectedWords(new Set(dictWords.map((w) => w.id)))
    }
  }

  async function addSelectedToPlan() {
    if (selectedWords.size === 0) return
    setAdding(true)
    const count = await window.electronAPI.addWordsToPlan(Array.from(selectedWords))
    setAdding(false)
    alert(`已成功将 ${count} 个单词加入背单词计划`)
    setSelectedWords(new Set())
  }

  async function search(word: string = query) {
    if (!word.trim()) return
    const w = word.trim().toLowerCase()
    setQuery(w)
    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`)
      if (!res.ok) {
        setError(`未找到单词 "${w}" 的释义`)
        setLoading(false)
        return
      }
      const data = await res.json()
      setResult(data[0])
      if (!history.includes(w)) {
        setHistory((prev) => [w, ...prev].slice(0, 20))
      }
    } catch (e) {
      setError('查询失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  function playAudio(url: string) {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  async function saveToWordbook() {
    if (!result || saved) return
    const phonetic = result.phonetics.find((p) => p.text)?.text || result.phonetic || ''
    const meaning = result.meanings.map((m) => `${m.partOfSpeech}: ${m.definitions[0]?.definition}`).join('; ')
    const example = result.meanings.map((m) => m.definitions[0]?.example).filter(Boolean)[0] || ''
    const id = await window.electronAPI.addWord(result.word, meaning, phonetic, example, 'dictionary')
    if (id !== null) setSaved(true)
  }

  function getDictIcon(name: string) {
    for (const key of Object.keys(DICT_ICONS)) {
      if (name.includes(key)) return DICT_ICONS[key]
    }
    return Library
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case 'domestic': return '#4A90D9'
      case 'overseas': return '#7ED321'
      case 'professional': return '#F5A623'
      default: return 'var(--primary)'
    }
  }

  const filteredDictionaries = dictionaries.filter((d) => {
    const matchCategory = activeCategory === 'all' || d.category === activeCategory
    const matchSearch = !searchKeyword || d.name.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchCategory && matchSearch
  })

  // 词典选择界面
  if (!selectedDict) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>选择词典</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>选择你要学习的词典，开始背单词之旅</p>

        {/* 搜索框 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索词典..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 分类标签 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '全部', icon: Library },
            ...Object.entries(CATEGORY_MAP).map(([key, { label, icon }]) => ({ key, label, icon })),
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                padding: '10px 20px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                background: activeCategory === key ? 'var(--primary)' : '#f1f5f9',
                color: activeCategory === key ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* 词典卡片网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filteredDictionaries.map((dict) => {
            const Icon = getDictIcon(dict.name)
            const categoryColor = getCategoryColor(dict.category)
            return (
              <button
                key={dict.id}
                onClick={() => {
                  setSelectedDict(dict.id)
                  loadDictionaryWords(dict.id)
                }}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 20,
                  border: '2px solid var(--border)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${categoryColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} color={categoryColor} />
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      background: '#f1f5f9',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {dict.wordCount} 词
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{dict.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{dict.description}</div>
                </div>

                {dict.progress !== undefined && dict.progress > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>学习进度</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{dict.progress}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${dict.progress}%`,
                          borderRadius: 3,
                          background: 'var(--primary)',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', color: 'var(--primary)', fontSize: 13, fontWeight: 500 }}>
                  开始学习
                  <ChevronRight size={16} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 词典详情界面
  const currentDict = dictionaries.find((d) => d.id === selectedDict)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* 返回和标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setSelectedDict(null)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#f1f5f9',
            border: 'none',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          ← 返回
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{currentDict?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0 0' }}>
            {currentDict?.description} · {dictWords.length} 词
          </p>
        </div>
      </div>

      {/* 在线查词 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="输入单词在线查询..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            fontSize: 15,
          }}
        />
        <button
          onClick={() => search()}
          disabled={loading}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={18} />}
          查询
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 10, background: '#fee2e2', color: 'var(--danger)', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{result.word}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {result.phonetic && <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{result.phonetic}</span>}
                  {result.phonetics.map((p, i) =>
                    p.audio && (
                      <button key={i} onClick={() => playAudio(p.audio!)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>
                        <Volume2 size={14} />发音
                      </button>
                    )
                  )}
                </div>
              </div>
              <button onClick={saveToWordbook} disabled={saved} style={{ padding: '8px 14px', borderRadius: 8, background: saved ? '#d1fae5' : 'var(--primary-light)', color: saved ? 'var(--success)' : 'var(--primary)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} />
                {saved ? '已加入词汇本' : '加入词汇本'}
              </button>
            </div>
          </div>
          <div style={{ padding: '20px 28px' }}>
            {result.meanings.map((meaning, idx) => (
              <div key={idx} style={{ marginBottom: idx < result.meanings.length - 1 ? 20 : 0 }}>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{meaning.partOfSpeech}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                    <div key={dIdx} style={{ paddingLeft: 12 }}>
                      <div style={{ fontSize: 15, lineHeight: 1.6 }}>{dIdx + 1}. {def.definition}</div>
                      {def.example && <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4, paddingLeft: 16 }}>"{def.example}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 词典单词列表 */}
      {!result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>单词列表 · {dictWords.length} 词</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toggleAll} style={{ padding: '6px 12px', borderRadius: 6, background: '#f3f4f6', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                {selectedWords.size === dictWords.length ? <CheckSquare size={14} /> : <Square size={14} />}
                全选
              </button>
              <button onClick={addSelectedToPlan} disabled={selectedWords.size === 0 || adding} style={{ padding: '6px 14px', borderRadius: 6, background: selectedWords.size > 0 ? 'var(--primary)' : '#e5e7eb', color: selectedWords.size > 0 ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookMarked size={14} />
                {adding ? '添加中...' : `加入计划 (${selectedWords.size})`}
              </button>
            </div>
          </div>

          {dictLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dictWords.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: 'var(--card)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 16px',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => toggleWord(w.id)}
                    style={{ background: 'transparent', padding: 0, marginTop: 2, display: 'flex', alignItems: 'center' }}
                  >
                    {selectedWords.has(w.id) ? (
                      <CheckSquare size={20} color="var(--primary)" />
                    ) : (
                      <Square size={20} color="#cbd5e1" />
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{w.word}</span>
                      <button
                        onClick={() => speak(w.word)}
                        title="朗读单词"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          fontSize: 12,
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={13} />
                        朗读
                      </button>
                    </div>
                    {w.phonetic && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{w.phonetic}</div>
                    )}
                    {w.meaning && (
                      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>{w.meaning}</div>
                    )}
                    {w.example && (
                      <div
                        style={{
                          fontSize: 13,
                          color: '#64748b',
                          fontStyle: 'italic',
                          lineHeight: 1.6,
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ flex: 1 }}>"{w.example}"</span>
                        <button
                          onClick={() => speak(w.example || '')}
                          title="朗读例句"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 2,
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
