import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { Mistake } from '../types'

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    loadMistakes()
  }, [])

  async function loadMistakes() {
    setLoading(true)
    const rows = await window.electronAPI.getMistakes()
    setMistakes(rows)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <AlertCircle size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 18, color: 'var(--text-secondary)' }}>暂无错题</div>
        <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>去做题，错题会自动记录在这里</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>错题本</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>共 {mistakes.length} 道错题，点击展开查看 AI 分析</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mistakes.map((m) => (
          <div
            key={m.id}
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              style={{
                width: '100%',
                padding: '18px 20px',
                textAlign: 'left',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: m.category === '词汇' ? 'var(--primary-light)' : '#d1fae5',
                  color: m.category === '词汇' ? 'var(--primary)' : 'var(--success)',
                  flexShrink: 0,
                }}
              >
                {m.category}
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.question}
              </span>
              {m.ai_analysis && m.ai_analysis !== '未配置 AI API' && (
                <Sparkles size={16} color="var(--primary)" />
              )}
            </button>

            {expandedId === m.id && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: '#fee2e2' }}>
                    <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 4 }}>你的答案</div>
                    <div style={{ fontSize: 15 }}>{m.user_answer}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: '#d1fae5' }}>
                    <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>正确答案</div>
                    <div style={{ fontSize: 15 }}>{m.correct_answer}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f9fafb' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>题目解析</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{m.explanation}</div>
                </div>

                {m.ai_analysis && m.ai_analysis !== '未配置 AI API' && (
                  <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Sparkles size={16} color="var(--primary)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>AI 分析</span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'var(--primary)',
                          color: '#fff',
                        }}
                      >
                        {m.error_type || '分析'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: '#1e3a5f', whiteSpace: 'pre-wrap' }}>
                      {m.ai_analysis}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
