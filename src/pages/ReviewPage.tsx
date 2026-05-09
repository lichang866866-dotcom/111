import { useEffect, useState } from 'react'
import { Brain, Eye, Loader2, Check, X, Sparkles, TrendingDown, TrendingUp, AlertCircle, BarChart3, Layers, Pencil, Volume2, Play, HelpCircle } from 'lucide-react'
import { ReviewWord } from '../types'
import { analyzeMemory, analyzeEbbinghausGap } from '../services/ai'

const EBBINGHAUS_DAYS = [1, 2, 4, 7, 15, 30]
const STANDARD_RETENTION = [56, 36, 25, 21, 18, 15]

type ReviewMode = 'flashcard' | 'spelling'

// 模拟助记法数据（后续可以存数据库）
const MNEMONICS: Record<string, { roots?: string; memory?: string; notes?: string }> = {
  abandon: { roots: 'a- (不) + bandon (拥有) → 不拥有 → 放弃', memory: '联想：a band on 一个乐队解散了，大家都放弃了' },
  abbreviate: { roots: 'ab- (加强) + brevi (短) + -ate (动词) → 使变短 → 缩写', memory: '联想：brief 的变体，记住 brief (简短)' },
  abnormal: { roots: 'ab- (偏离) + normal (正常) → 偏离正常 → 反常的', memory: '' },
  benefit: { roots: 'bene- (好) + fit (做) → 做好事 → 利益，好处', memory: '' },
  biology: { roots: 'bio- (生命) + -logy (学科) → 生物学', memory: '' },
  century: { roots: 'cent- (一百) + -ury → 一百年 → 世纪', memory: '' },
  contradiction: { roots: 'contra- (反对) + dict (说) + -ion → 反着说 → 矛盾', memory: '' },
  export: { roots: 'ex- (向外) + port (搬运) → 向外搬运 → 出口', memory: '' },
  import: { roots: 'im- (向内) + port (搬运) → 向内搬运 → 进口', memory: '' },
  predict: { roots: 'pre- (提前) + dict (说) → 提前说 → 预测', memory: '' },
  submarine: { roots: 'sub- (下面) + marine (海洋的) → 海洋下面的 → 潜水艇', memory: '' },
  transport: { roots: 'trans- (跨越) + port (搬运) → 跨距离搬运 → 运输', memory: '' },
  unhappy: { roots: 'un- (否定) + happy (开心) → 不开心', memory: '' },
}

export default function ReviewPage() {
  const [words, setWords] = useState<ReviewWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    summary: string
    weakWords: string[]
    suggestions: string[]
  } | null>(null)
  const [gapLoading, setGapLoading] = useState(false)
  const [gapResult, setGapResult] = useState<{
    gapAnalysis: string
    recommendations: string[]
  } | null>(null)
  const [ebbinghausData, setEbbinghausData] = useState<{ standard: number[]; actual: number[] }>({
    standard: STANDARD_RETENTION,
    actual: STANDARD_RETENTION,
  })
  const [stats, setStats] = useState({ totalWords: 0, totalReviews: 0, highForget: 0, avgLevel: 0 })
  const [reviewMode, setReviewMode] = useState<ReviewMode>('flashcard')
  const [spellingInput, setSpellingInput] = useState('')
  const [spellingSubmitted, setSpellingSubmitted] = useState(false)
  const [spellingCorrect, setSpellingCorrect] = useState(false)

  useEffect(() => {
    loadWords()
    loadStats()
    loadEbbinghaus()
  }, [])

  async function loadWords() {
    setLoading(true)
    const rows = await window.electronAPI.getReviewWords()
    setWords(rows)
    setCurrentIndex(0)
    setShowAnswer(false)
    setFinished(rows.length === 0)
    setLoading(false)
  }

  async function loadStats() {
    const s = await window.electronAPI.getMemoryStats()
    setStats(s)
  }

  async function loadEbbinghaus() {
    const data = await window.electronAPI.getEbbinghausData()
    setEbbinghausData(data)
  }

  async function handleResult(result: 'forgotten' | 'vague' | 'known') {
    const word = words[currentIndex]
    await window.electronAPI.updateWordReview(word.id, result)

    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
      setShowAnswer(false)
    } else {
      setFinished(true)
      loadStats()
      loadEbbinghaus()
    }
  }

  async function runAiAnalysis() {
    const settings = await window.electronAPI.getSettings()
    const aiSettings = {
      provider: (settings.aiProvider as any) || 'claude',
      apiKey: settings.aiApiKey || '',
      model: settings.aiModel || '',
      baseUrl: settings.aiBaseUrl || undefined,
    }

    if (!aiSettings.apiKey) {
      alert('请先在设置中配置 AI API Key')
      return
    }

    setAiLoading(true)
    try {
      const data = await window.electronAPI.getMemoryData()
      const result = await analyzeMemory(aiSettings, stats, data)
      setAiResult(result)
    } catch (e: any) {
      alert(`AI 分析失败: ${e.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  async function runGapAnalysis() {
    const settings = await window.electronAPI.getSettings()
    const aiSettings = {
      provider: (settings.aiProvider as any) || 'claude',
      apiKey: settings.aiApiKey || '',
      model: settings.aiModel || '',
      baseUrl: settings.aiBaseUrl || undefined,
    }

    if (!aiSettings.apiKey) {
      alert('请先在设置中配置 AI API Key')
      return
    }

    setGapLoading(true)
    try {
      const result = await analyzeEbbinghausGap(aiSettings, ebbinghausData.standard, ebbinghausData.actual)
      setGapResult(result)
    } catch (e: any) {
      alert(`AI 分析失败: ${e.message}`)
    } finally {
      setGapLoading(false)
    }
  }

  function EbbinghausChart({
    standard,
    actual,
  }: {
    standard: number[]
    actual: number[]
  }) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null)
    const width = 640
    const height = 220
    const padding = { top: 20, right: 30, bottom: 40, left: 45 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const xPositions = EBBINGHAUS_DAYS.map((_, i) =>
      padding.left + (i / (EBBINGHAUS_DAYS.length - 1)) * chartW
    )
    const yPos = (val: number) => padding.top + chartH - (val / 100) * chartH

    function smoothPath(values: number[]) {
      if (values.length < 2) return ''
      let d = `M ${xPositions[0]} ${yPos(values[0])}`
      for (let i = 0; i < values.length - 1; i++) {
        const x0 = xPositions[i]
        const y0 = yPos(values[i])
        const x1 = xPositions[i + 1]
        const y1 = yPos(values[i + 1])
        const cp1x = x0 + (x1 - x0) * 0.4
        const cp1y = y0
        const cp2x = x1 - (x1 - x0) * 0.4
        const cp2y = y1
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`
      }
      return d
    }

    const activeIdx = hoverIdx ?? (xPositions.length > 0 ? 0 : null)

    return (
      <div style={{ position: 'relative', userSelect: 'none' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={yPos(v)}
                x2={width - padding.right}
                y2={yPos(v)}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
              <text x={padding.left - 8} y={yPos(v) + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {v}%
              </text>
            </g>
          ))}

          {/* 标准曲线 */}
          <path
            d={smoothPath(standard)}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={2.5}
            strokeDasharray="6,4"
          />
          {standard.map((v, i) => (
            <circle key={`s-${i}`} cx={xPositions[i]} cy={yPos(v)} r={4} fill="#cbd5e1" />
          ))}

          {/* 实际曲线 */}
          <path
            d={smoothPath(actual)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.5}
          />
          {actual.map((v, i) => (
            <circle key={`a-${i}`} cx={xPositions[i]} cy={yPos(v)} r={5} fill="var(--primary)" />
          ))}

          {/* X 轴标签 */}
          {EBBINGHAUS_DAYS.map((days, i) => (
            <text
              key={i}
              x={xPositions[i]}
              y={height - 12}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-secondary)"
            >
              {days}天
            </text>
          ))}

          {/* 交互层 */}
          {xPositions.map((x, i) => (
            <rect
              key={`hit-${i}`}
              x={x - chartW / (EBBINGHAUS_DAYS.length - 1) / 2}
              y={padding.top}
              width={chartW / (EBBINGHAUS_DAYS.length - 1)}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: 'crosshair' }}
            />
          ))}

          {/* 高亮竖线 */}
          {activeIdx !== null && (
            <line
              x1={xPositions[activeIdx]}
              y1={padding.top}
              x2={xPositions[activeIdx]}
              y2={padding.top + chartH}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.5}
            />
          )}

          {/* 高亮点 */}
          {activeIdx !== null && (
            <>
              <circle
                cx={xPositions[activeIdx]}
                cy={yPos(standard[activeIdx])}
                r={6}
                fill="#cbd5e1"
                stroke="#fff"
                strokeWidth={2}
              />
              <circle
                cx={xPositions[activeIdx]}
                cy={yPos(actual[activeIdx])}
                r={7}
                fill="var(--primary)"
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {activeIdx !== null && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(
                Math.max(xPositions[activeIdx] - 80, 0),
                width - 160
              ),
              top: Math.min(yPos(Math.max(standard[activeIdx], actual[activeIdx])) - 70, height - 80),
              width: 160,
              background: '#fff',
              borderRadius: 10,
              padding: '10px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid var(--border)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              {EBBINGHAUS_DAYS[activeIdx]}天后复习
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>标准留存率</span>
              <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}>{standard[activeIdx]}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>实际留存率</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: actual[activeIdx] < standard[activeIdx] ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {actual[activeIdx]}%
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: '1px solid #f3f4f6',
                fontSize: 11,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              差距: {Math.abs(standard[activeIdx] - actual[activeIdx]).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (finished || words.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Brain size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 18, color: 'var(--text-secondary)' }}>没有待复习的单词</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>新添加的单词或到达复习时间的单词会出现在这里</div>
          <button
            onClick={loadWords}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
            }}
          >
            刷新
          </button>
        </div>

        {/* 记忆统计卡片 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 32,
            marginBottom: 24,
          }}
        >
          {[
            { label: '总单词', value: stats.totalWords, icon: Brain, color: 'var(--primary)' },
            { label: '已复习', value: stats.totalReviews, icon: TrendingUp, color: 'var(--success)' },
            { label: '高频遗忘', value: stats.highForget, icon: TrendingDown, color: 'var(--danger)' },
            { label: '平均阶段', value: stats.avgLevel, icon: TrendingUp, color: 'var(--warning)' },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                style={{
                  background: 'var(--card)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  textAlign: 'center',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <Icon size={20} color={s.color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            )
          })}
        </div>

        {/* 艾宾浩斯曲线对比 */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            padding: 24,
            boxShadow: 'var(--shadow)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart3 size={20} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>艾宾浩斯遗忘曲线对比</span>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#cbd5e1' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>标准留存率</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--primary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>你的实际留存率</span>
            </div>
          </div>

          <EbbinghausChart
            standard={ebbinghausData.standard}
            actual={ebbinghausData.actual}
          />

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={runGapAnalysis}
              disabled={gapLoading}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {gapLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
              AI 分析曲线差距
            </button>
          </div>

          {gapResult && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>差距分析</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#1e3a5f', marginBottom: 12 }}>{gapResult.gapAnalysis}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>改进建议</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gapResult.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: 14, lineHeight: 1.6, color: '#1e3a5f' }}>
                    {i + 1}. {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 记忆分析 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button
            onClick={runAiAnalysis}
            disabled={aiLoading}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
            AI 记忆分析
          </button>
        </div>

        {aiResult && (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              padding: 24,
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={18} color="var(--primary)" />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>AI 记忆分析报告</span>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                marginBottom: 16,
                fontSize: 14,
                lineHeight: 1.7,
                color: '#1e3a5f',
              }}
            >
              {aiResult.summary}
            </div>

            {aiResult.weakWords.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                  优先加强这些单词
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {aiResult.weakWords.map((w) => (
                    <span
                      key={w}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: '#fee2e2',
                        color: 'var(--danger)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {aiResult.suggestions.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  记忆策略建议
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiResult.suggestions.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#f9fafb',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {i + 1}. {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const current = words[currentIndex]
  const stage = current.level
  const nextDays = EBBINGHAUS_DAYS[Math.min(stage, EBBINGHAUS_DAYS.length - 1)]
  const mnemonic = MNEMONICS[current.word.toLowerCase()] || null

  function handleSpellingSubmit() {
    setSpellingSubmitted(true)
    const correct = spellingInput.trim().toLowerCase() === current.word.trim().toLowerCase()
    setSpellingCorrect(correct)
  }

  function handleSpellingNext() {
    const result: 'forgotten' | 'vague' | 'known' = spellingCorrect ? 'known' : 'forgotten'
    setSpellingInput('')
    setSpellingSubmitted(false)
    setSpellingCorrect(false)
    handleResult(result)
  }

  function handleModeSwitch(mode: ReviewMode) {
    setReviewMode(mode)
    setShowAnswer(false)
    setSpellingInput('')
    setSpellingSubmitted(false)
  }

  function speakWord() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(current.word)
      u.lang = 'en-US'
      u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>背单词</h1>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>基于艾宾浩斯遗忘曲线</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        {currentIndex + 1} / {words.length}
      </p>

      {/* 复习模式切换 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
        {[
          { mode: 'flashcard' as ReviewMode, label: '卡片记忆', icon: Layers },
          { mode: 'spelling' as ReviewMode, label: '拼写默写', icon: Pencil },
        ].map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => handleModeSwitch(mode)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              background: reviewMode === mode ? 'var(--primary)' : '#f1f5f9',
              color: reviewMode === mode ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* 卡片记忆模式 */}
      {reviewMode === 'flashcard' && (
        <>
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              padding: 40,
              boxShadow: 'var(--shadow)',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{current.word}</div>
            {current.phonetic && (
              <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>{current.phonetic}</div>
            )}

            <button
              onClick={speakWord}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: '#f1f5f9',
                border: 'none',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                marginBottom: 20,
                color: 'var(--text-secondary)',
              }}
            >
              <Volume2 size={14} />
              听发音
            </button>

            {/* 艾宾浩斯阶段指示器 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {EBBINGHAUS_DAYS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 6,
                    borderRadius: 3,
                    background: i <= stage ? 'var(--primary)' : '#e5e7eb',
                    transition: 'background 0.3s',
                  }}
                  title={`第${i + 1}阶段: ${d}天后复习`}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              当前第 {stage + 1} 阶段 · 下次复习: {nextDays} 天后
              {current.forget_count > 0 && ` · 已遗忘 ${current.forget_count} 次`}
            </div>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: 15,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Eye size={18} />
                显示释义
              </button>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ fontSize: 20, marginBottom: 12 }}>{current.meaning || '暂无释义'}</div>
                {current.example && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>
                    "{current.example}"
                  </div>
                )}

                {/* 助记法展示 */}
                {mnemonic && (mnemonic.roots || mnemonic.memory) && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 14,
                      borderRadius: 10,
                      background: '#fff7ed',
                      border: '1px solid #fdba74',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ea580c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={14} />
                      助记法
                    </div>
                    {mnemonic.roots && (
                      <div style={{ fontSize: 13, color: '#7c2d12', lineHeight: 1.6, marginBottom: mnemonic.memory ? 8 : 0 }}>
                        <span style={{ fontWeight: 600 }}>词根词缀：</span>
                        {mnemonic.roots}
                      </div>
                    )}
                    {mnemonic.memory && (
                      <div style={{ fontSize: 13, color: '#7c2d12', lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 600 }}>联想记忆：</span>
                        {mnemonic.memory}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {showAnswer && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleResult('forgotten')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: 10,
                  background: '#fee2e2',
                  color: 'var(--danger)',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <X size={18} />
                <span>忘记</span>
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>返回第一阶段</span>
              </button>
              <button
                onClick={() => handleResult('vague')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: 10,
                  background: '#fef3c7',
                  color: 'var(--warning)',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <AlertCircle size={18} />
                <span>模糊</span>
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>保持当前阶段</span>
              </button>
              <button
                onClick={() => handleResult('known')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: 10,
                  background: '#d1fae5',
                  color: 'var(--success)',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Check size={18} />
                <span>认识</span>
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>进入下一阶段</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* 拼写模式 */}
      {reviewMode === 'spelling' && (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            padding: 40,
            boxShadow: 'var(--shadow)',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {/* 显示中文释义，听发音猜单词 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 6 }}>请拼写以下单词</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              {current.meaning || '暂无释义'}
            </div>
            {current.phonetic && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>{current.phonetic}</div>
            )}
            <button
              onClick={speakWord}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Play size={16} />
              点击听发音
            </button>

            {!spellingSubmitted && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>（不显示单词，先听发音再默写）</span>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              value={spellingInput}
              onChange={(e) => setSpellingInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !spellingSubmitted) handleSpellingSubmit(); if (e.key === 'Enter' && spellingSubmitted) handleSpellingNext() }}
              placeholder="输入英文单词..."
              disabled={spellingSubmitted}
              autoFocus
              style={{
                width: '100%',
                maxWidth: 320,
                padding: '14px 20px',
                borderRadius: 12,
                border: spellingSubmitted
                  ? spellingCorrect
                    ? '2px solid var(--success)'
                    : '2px solid var(--danger)'
                  : '2px solid var(--border)',
                fontSize: 20,
                textAlign: 'center',
                outline: 'none',
                letterSpacing: 2,
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {!spellingSubmitted ? (
            <button
              onClick={handleSpellingSubmit}
              disabled={!spellingInput.trim()}
              style={{
                padding: '12px 32px',
                borderRadius: 10,
                background: spellingInput.trim() ? 'var(--primary)' : '#e5e7eb',
                color: spellingInput.trim() ? '#fff' : '#9ca3af',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: spellingInput.trim() ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Check size={18} />
              确认
            </button>
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {spellingCorrect ? (
                <div style={{ padding: 12, borderRadius: 10, background: '#d1fae5', marginBottom: 16 }}>
                  <Check size={20} color="var(--success)" style={{ display: 'inline' }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)', marginLeft: 8 }}>正确！</span>
                </div>
              ) : (
                <div style={{ padding: 12, borderRadius: 10, background: '#fee2e2', marginBottom: 16 }}>
                  <X size={20} color="var(--danger)" style={{ display: 'inline' }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)', marginLeft: 8 }}>
                    错误！正确答案: <strong>{current.word}</strong>
                  </span>
                </div>
              )}
              <button
                onClick={handleSpellingNext}
                style={{
                  padding: '12px 32px',
                  borderRadius: 10,
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                下一词
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
