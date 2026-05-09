import { useState, useRef } from 'react'
import { FileText, Upload, X, Check, Sparkles, Loader2, Highlighter, Save, Search, BookOpen, Columns, Eye, EyeOff } from 'lucide-react'

interface ExtractedWord {
  id: string
  word: string
  context: string
  translation: string
  selected: boolean
  isPhrase: boolean
}

interface LiteratureDoc {
  id: string
  title: string
  content: string
  paragraphs: string[]
  translation: string
  words: ExtractedWord[]
  createdAt: Date
}

const COMMON_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'also', 'up', 'out', 'this', 'that', 'these', 'those', 'which', 'who', 'whom', 'one', 'two', 'their', 'them', 'they', 'our', 'his', 'her', 'its', 'my', 'we', 'you', 'he', 'she', 'it', 'me', 'us'])

export default function LiteratureImportPage() {
  const [docs, setDocs] = useState<LiteratureDoc[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'original' | 'translation'>('original')
  const [selectedText, setSelectedText] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiSelecting, setAiSelecting] = useState(false)
  const [highlightWords, setHighlightWords] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeDoc = docs.find(d => d.id === activeDocId)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    const reader = new FileReader()

    reader.onload = async (_event) => {
      const raw = _event.target?.result as string || ''
      const title = file.name.replace(/\.[^/.]+$/, '')
      const content = raw.substring(0, 8000)
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)

      const translation = await simulateTranslate(content.substring(0, 2000))
      const words = extractKeywords(content)

      const newDoc: LiteratureDoc = {
        id: Date.now().toString(),
        title,
        content,
        paragraphs,
        translation,
        words,
        createdAt: new Date()
      }

      setDocs(prev => [newDoc, ...prev])
      setActiveDocId(newDoc.id)
      setIsProcessing(false)
    }

    reader.readAsText(file)
  }

  async function simulateTranslate(text: string): Promise<string> {
    return `[自动翻译]\n\n${text.substring(0, 800)}...\n\n(配置 AI API 后可使用智能翻译)`
  }

  function extractKeywords(content: string): ExtractedWord[] {
    const words: ExtractedWord[] = []
    const wordRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b[a-z]+-[a-z]+\b|\b[a-z]{6,}\b/g
    const matches = content.match(wordRegex) || []

    const seen = new Set<string>()
    for (const match of matches.slice(0, 40)) {
      const lower = match.toLowerCase()
      if (seen.has(lower) || COMMON_WORDS.has(lower)) continue
      seen.add(lower)

      const contextRegex = new RegExp(`[^.!?]*\\b${escapeRegExp(match)}\\b[^.!?]*[.!?]`, 'i')
      const ctx = content.match(contextRegex)
      words.push({
        id: `w_${words.length}`,
        word: match,
        context: ctx ? ctx[0].trim().substring(0, 150) : match,
        translation: '',
        selected: false,
        isPhrase: match.includes(' ')
      })
    }
    return words
  }

  function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function handleTextSelection() {
    const sel = window.getSelection()
    if (sel && sel.toString().trim()) {
      setSelectedText(sel.toString().trim())
    }
  }

  function toggleWordSelected(wordId: string) {
    if (!activeDocId) return
    setDocs(prev => prev.map(d => {
      if (d.id !== activeDocId) return d
      return { ...d, words: d.words.map(w => w.id === wordId ? { ...w, selected: !w.selected } : w) }
    }))
  }

  async function saveSelectedWords() {
    if (!activeDoc) return
    const selected = activeDoc.words.filter(w => w.selected)
    for (const w of selected) {
      try { await window.electronAPI.addWord(w.word, w.translation || '待翻译', '', w.context, 'literature') }
      catch { /* ignore */ }
    }
    alert(`已保存 ${selected.length} 个词汇到单词本`)
  }

  function addCustomWord(text: string) {
    if (!activeDocId) return
    const newWord: ExtractedWord = {
      id: `custom_${Date.now()}`,
      word: text,
      context: '用户选中',
      translation: '',
      selected: true,
      isPhrase: text.includes(' ')
    }
    setDocs(prev => prev.map(d => d.id !== activeDocId ? d : { ...d, words: [newWord, ...d.words] }))
  }

  async function aiSelectKeywords() {
    if (!aiPrompt.trim() || !activeDoc) return
    setAiSelecting(true)
    // 模拟AI根据用户要求筛选关键词
    await new Promise(r => setTimeout(r, 1000))
    const promptLower = aiPrompt.toLowerCase()
    const selected = activeDoc.words.filter(w =>
      w.word.toLowerCase().includes(promptLower) ||
      w.context.toLowerCase().includes(promptLower)
    ).map(w => w.word)
    const highlight = new Set(selected)
    setHighlightWords(highlight)
    // 自动勾选匹配的词汇
    setDocs(prev => prev.map(d => {
      if (d.id !== activeDocId) return d
      return { ...d, words: d.words.map(w => ({ ...w, selected: highlight.has(w.word) })) }
    }))
    setAiSelecting(false)
  }

  function selectAllWords() {
    if (!activeDoc) return
    setDocs(prev => prev.map(d => {
      if (d.id !== activeDocId) return d
      return { ...d, words: d.words.map(w => ({ ...w, selected: true })) }
    }))
  }

  function deleteDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
    if (activeDocId === id) setActiveDocId(null)
  }

  // ===== 上传页面 =====
  if (docs.length === 0) {
    return (
      <div className="page-enter" style={{ maxWidth: 700, margin: '0 auto', padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <FileText size={56} color="var(--primary)" style={{ marginBottom: 16, animation: 'bounceIn 0.6s ease' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>文献导入</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            上传英文文献 → 自动翻译 → AI 智能提取重点词汇 → 生成词典卡片
          </p>
        </div>

        <div onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 20,
            padding: '80px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: 'var(--card)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}
        >
          <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
          <Upload size={48} color="var(--primary)" style={{ marginBottom: 20 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>点击或拖拽上传文献</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>支持 TXT / DOC / DOCX / PDF</p>
        </div>

        {isProcessing && (
          <div style={{ textAlign: 'center', marginTop: 30, animation: 'fadeIn 0.3s ease' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)' }}>正在解析文献，提取关键词...</p>
          </div>
        )}
      </div>
    )
  }

  // ===== 阅读器界面 =====
  return (
    <div className="page-enter" style={{ maxWidth: 1400, margin: '0 auto', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>文献导入</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{docs.length} 篇文献 · {docs.reduce((s, d) => s + d.words.length, 0)} 个词汇</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={selectAllWords} className="btn-tap"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} />全选词汇
          </button>
          <button onClick={saveSelectedWords} className="btn-tap"
            style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} />保存选中 ({activeDoc?.words.filter(w => w.selected).length || 0})
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-tap"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#d1fae5', color: 'var(--success)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} />导入新文献
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
        </div>
      </div>

      {/* 三栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>
        {/* 左栏：文献列表 */}
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, overflow: 'auto', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />文献列表
          </h3>
          {docs.map((doc, i) => (
            <div key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`stagger-${Math.min(i + 1, 5)}`}
              style={{
                padding: 12, borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                background: activeDocId === doc.id ? 'var(--primary-light)' : 'transparent',
                border: `1px solid ${activeDocId === doc.id ? 'var(--primary)' : 'transparent'}`,
                transition: 'all 0.2s ease',
              }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>{doc.words.length} 词</span>
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 中栏：阅读区 */}
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, overflow: 'auto', boxShadow: 'var(--shadow)', position: 'relative' }}>
          {activeDoc ? (
            <div>
              {/* 阅读工具栏 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{activeDoc.title}</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setViewMode('original')} className="btn-tap"
                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: viewMode === 'original' ? 'var(--primary)' : '#f1f5f9', color: viewMode === 'original' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                    <Eye size={13} style={{ display: 'inline', marginRight: 4 }} />原文
                  </button>
                  <button onClick={() => setViewMode('translation')} className="btn-tap"
                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: viewMode === 'translation' ? 'var(--primary)' : '#f1f5f9', color: viewMode === 'translation' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                    <EyeOff size={13} style={{ display: 'inline', marginRight: 4 }} />翻译
                  </button>
                  <button onClick={() => setViewMode('split')} className="btn-tap"
                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: viewMode === 'split' ? 'var(--primary)' : '#f1f5f9', color: viewMode === 'split' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                    <Columns size={13} style={{ display: 'inline', marginRight: 4 }} />对照
                  </button>
                  <button onClick={() => deleteDoc(activeDoc.id)} className="btn-tap"
                    style={{ padding: '6px 8px', borderRadius: 6, background: '#fee2e2', color: '#ef4444' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 阅读内容 */}
              {viewMode === 'split' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div onMouseUp={handleTextSelection} style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif', color: 'var(--text)' }}>
                    {activeDoc.paragraphs.map((p, i) => (
                      <p key={i} style={{ marginBottom: 16 }}>{p}</p>
                    ))}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                    {activeDoc.translation}
                  </div>
                </div>
              ) : (
                <div onMouseUp={handleTextSelection}
                  style={{ fontSize: 15, lineHeight: 1.9, fontFamily: viewMode === 'original' ? 'Georgia, "Times New Roman", serif' : 'inherit', color: viewMode === 'translation' ? 'var(--text-secondary)' : 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {viewMode === 'original'
                    ? activeDoc.paragraphs.map((p, i) => (
                        <p key={i} style={{ marginBottom: 16, animation: `fadeInUp 0.3s ease ${i * 0.05}s both` }}>
                          {highlightWords.size > 0
                            ? p.split(/(\b\w+(?:[\s-]\w+)*\b)/).map((part, j) => {
                                if (highlightWords.has(part)) {
                                  return <mark key={j} style={{ background: '#fef08a', borderRadius: 3, padding: '0 2px', cursor: 'pointer' }}>{part}</mark>
                                }
                                return part
                              })
                            : p
                          }
                        </p>
                      ))
                    : <div style={{ fontSize: 14 }}>{activeDoc.translation}</div>
                  }
                </div>
              )}

              {/* 选中文本悬浮操作栏 */}
              {selectedText && (
                <div style={{
                  position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--card)', padding: '10px 18px', borderRadius: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100,
                  animation: 'slideUp 0.2s ease',
                }}>
                  <span style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{selectedText}"</span>
                  <button onClick={() => { addCustomWord(selectedText); setSelectedText('') }} className="btn-tap"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: 12 }}>
                    <BookOpen size={13} />加入词库
                  </button>
                  <button onClick={() => setSelectedText('')} style={{ background: 'none' }}><X size={14} /></button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>选择左侧文献开始阅读</p>
            </div>
          )}
        </div>

        {/* 右栏：词汇面板 */}
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, overflow: 'auto', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
          {/* AI 筛选 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} color="var(--primary)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>AI 智能筛选</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aiSelectKeywords()}
                placeholder="如：筛选科技类、筛选动词..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  fontSize: 12, outline: 'none',
                }}
              />
              <button onClick={aiSelectKeywords} disabled={aiSelecting || !aiPrompt.trim()} className="btn-tap"
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: aiPrompt.trim() ? 'var(--primary)' : '#e5e7eb',
                  color: aiPrompt.trim() ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}>
                {aiSelecting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
                筛选
              </button>
            </div>
          </div>

          {/* 词汇列表 */}
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <Highlighter size={13} style={{ display: 'inline', marginRight: 4 }} />
            重点词汇 ({activeDoc?.words.filter(w => w.selected).length}/{activeDoc?.words.length || 0})
          </h3>

          {activeDoc && activeDoc.words.length > 0 ? (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeDoc.words.map((word, i) => (
                <div key={word.id}
                  className={`stagger-${Math.min((i % 5) + 1, 5)}`}
                  style={{
                    padding: 10, borderRadius: 8,
                    background: word.selected ? 'var(--primary-light)' : '#f9fafb',
                    border: `1px solid ${word.selected ? 'var(--primary)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleWordSelected(word.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{word.word}</span>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `2px solid ${word.selected ? 'var(--primary)' : '#d1d5db'}`,
                      background: word.selected ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}>
                      {word.selected && <Check size={10} color="#fff" />}
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{word.context}</p>
                  {word.translation && <p style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>{word.translation}</p>}
                  {word.isPhrase && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed', marginTop: 4, display: 'inline-block' }}>短语</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
              <Sparkles size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 12 }}>导入文献后自动提取词汇</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
