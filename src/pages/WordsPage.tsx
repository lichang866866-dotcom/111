import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Word } from '../types'

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ word: '', meaning: '', phonetic: '', example: '' })

  useEffect(() => {
    loadWords()
  }, [])

  async function loadWords() {
    setLoading(true)
    const rows = await window.electronAPI.getWords()
    setWords(rows)
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.word.trim()) return
    const id = await window.electronAPI.addWord(form.word, form.meaning, form.phonetic, form.example)
    if (id) {
      setForm({ word: '', meaning: '', phonetic: '', example: '' })
      setShowAdd(false)
      loadWords()
    }
  }

  async function handleDelete(id: number) {
    await window.electronAPI.deleteWord(id)
    loadWords()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>词汇本</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>共 {words.length} 个单词</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <Plus size={16} />
          添加单词
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            padding: 20,
            boxShadow: 'var(--shadow)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input
              placeholder="单词 *"
              value={form.word}
              onChange={(e) => setForm({ ...form, word: e.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 14,
              }}
            />
            <input
              placeholder="音标"
              value={form.phonetic}
              onChange={(e) => setForm({ ...form, phonetic: e.target.value })}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 14,
              }}
            />
          </div>
          <input
            placeholder="中文释义"
            value={form.meaning}
            onChange={(e) => setForm({ ...form, meaning: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <input
            placeholder="例句"
            value={form.example}
            onChange={(e) => setForm({ ...form, example: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAdd(false)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#f3f4f6',
                color: 'var(--text)',
                fontSize: 14,
              }}
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'var(--primary)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {words.map((w) => (
          <div
            key={w.id}
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{w.word}</span>
                {w.phonetic && (
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.phonetic}</span>
                )}
              </div>
              {w.meaning && (
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{w.meaning}</div>
              )}
              {w.example && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{w.example}</div>
              )}
            </div>
            <button
              onClick={() => handleDelete(w.id)}
              style={{
                padding: 6,
                borderRadius: 6,
                background: '#fee2e2',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
