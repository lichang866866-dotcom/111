import { useEffect, useState } from 'react'
import { Check, X, Loader2, BookMarked, ArrowRight, Sparkles, FileText, Calendar } from 'lucide-react'
import { Question } from '../types'
import { analyzeMistake } from '../services/ai'

type ExamFilter = 'all' | 'CET4' | 'CET6'

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ analysis: string; errorType: string } | null>(null)
  const [wordSaved, setWordSaved] = useState(false)

  // 新的筛选状态
  const [typeFilter, setTypeFilter] = useState<'all' | 'vocabulary' | 'grammar'>('all')
  const [examFilter, setExamFilter] = useState<ExamFilter>('all')
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [cetStats, setCetStats] = useState<{ cet4Count: number; cet6Count: number } | null>(null)

  useEffect(() => {
    loadCETInfo()
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [typeFilter, examFilter, yearFilter])

  async function loadCETInfo() {
    try {
      const stats = await window.electronAPI.getCETStats()
      setCetStats({ cet4Count: stats.cet4Count, cet6Count: stats.cet6Count })
      setAvailableYears(stats.years)
    } catch (e) {
      console.error('加载 CET 信息失败:', e)
    }
  }

  async function loadQuestions() {
    setLoading(true)
    setQuestions([])
    setCurrentIndex(0)
    setAnswered(false)
    setSelectedOption(null)
    setAiResult(null)
    setWordSaved(false)

    const type = typeFilter === 'all' ? undefined : typeFilter
    const examType = examFilter === 'all' ? undefined : examFilter
    const examYear = yearFilter || undefined

    const qs = await window.electronAPI.getQuestions(type, undefined, examType, examYear)
    setQuestions(qs.map((q: any) => ({ ...q, options: q.options ? JSON.parse(q.options) : undefined })))
    setLoading(false)
  }

  const current = questions[currentIndex]

  async function handleSubmit() {
    if (!selectedOption || !current) return
    const correct = selectedOption === current.correct_answer
    setIsCorrect(correct)
    setAnswered(true)

    const attemptId = await window.electronAPI.submitAttempt(current.id, selectedOption, correct)

    if (!correct) {
      const settings = await window.electronAPI.getSettings()
      const aiSettings = {
        provider: (settings.aiProvider as any) || 'claude',
        apiKey: settings.aiApiKey || '',
        model: settings.aiModel || '',
        baseUrl: settings.aiBaseUrl || undefined,
      }

      if (aiSettings.apiKey) {
        setAiLoading(true)
        try {
          const result = await analyzeMistake(
            aiSettings,
            current.question,
            current.correct_answer,
            selectedOption,
            current.explanation,
            current.category
          )
          setAiResult(result)
          await window.electronAPI.saveMistake(attemptId, result.errorType, result.analysis)
        } catch (e: any) {
          setAiResult({ analysis: `AI 分析失败: ${e.message}`, errorType: '未知' })
        } finally {
          setAiLoading(false)
        }
      } else {
        await window.electronAPI.saveMistake(attemptId, '未分析', '未配置 AI API')
      }
    }
  }

  async function saveWord() {
    if (!current || wordSaved) return
    const wordMatch = current.question.match(/"([a-zA-Z]+)"/) || current.question.match(/\b([a-zA-Z]{4,})\b/)
    const word = wordMatch ? wordMatch[1] : current.correct_answer
    const id = await window.electronAPI.addWord(word, '', '', '', current.category)
    if (id !== null) setWordSaved(true)
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setAnswered(false)
      setSelectedOption(null)
      setAiResult(null)
      setWordSaved(false)
    } else {
      loadQuestions()
    }
  }

  function resetFilters() {
    setTypeFilter('all')
    setExamFilter('all')
    setYearFilter(null)
  }

  const examLabel = current?.exam_type ? (current.exam_type === 'CET4' ? '四级' : '六级') : ''
  const yearLabel = current?.exam_year ? `${current.exam_year}年` : ''

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>做题练习</h1>

        {/* CET 统计信息 */}
        {cetStats && (cetStats.cet4Count > 0 || cetStats.cet6Count > 0) && (
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={18} />
              <span style={{ fontSize: 13 }}>CET-4 真题库</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{cetStats.cet4Count} 题</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={18} />
              <span style={{ fontSize: 13 }}>CET-6 真题库</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{cetStats.cet6Count} 题</span>
            </div>
          </div>
        )}

        {/* 筛选区域 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* 题型筛选 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'vocabulary', 'grammar'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  background: typeFilter === f ? 'var(--primary)' : '#fff',
                  color: typeFilter === f ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'all' ? '全部题型' : f === 'vocabulary' ? '词汇' : '语法'}
              </button>
            ))}
          </div>

          {/* 考试类型筛选 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'CET4', 'CET6'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setExamFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  background: examFilter === f ? (f === 'CET4' ? '#3b82f6' : f === 'CET6' ? '#8b5cf6' : 'var(--primary)') : '#fff',
                  color: examFilter === f ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'all' ? '全部考试' : f === 'CET4' ? '四级' : '六级'}
              </button>
            ))}
          </div>

          {/* 年份筛选 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Calendar size={14} color="var(--text-secondary)" />
            <select
              value={yearFilter || ''}
              onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 13,
                border: '1px solid var(--border)',
                background: yearFilter ? 'var(--primary-light)' : '#fff',
                color: yearFilter ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <option value="">全部年份</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </div>

          {/* 重置筛选 */}
          {(typeFilter !== 'all' || examFilter !== 'all' || yearFilter) && (
            <button
              onClick={resetFilters}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                background: '#fee2e2',
                color: '#ef4444',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 当前筛选信息 */}
      {(typeFilter !== 'all' || examFilter !== 'all' || yearFilter) && (
        <div style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: '#f0f9ff',
          borderRadius: 8,
          fontSize: 13,
          color: '#0369a1',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          当前筛选: {typeFilter !== 'all' ? typeFilter === 'vocabulary' ? '词汇题' : '语法题' : '全部题型'}
          {examFilter !== 'all' && ` | ${examFilter === 'CET4' ? '四级' : '六级'}真题`}
          {yearFilter && ` | ${yearFilter}年`}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>加载题目中...</span>
        </div>
      ) : !current ? (
        <div style={{ textAlign: 'center', marginTop: 120 }}>
          <div style={{ fontSize: 18, marginBottom: 16, color: 'var(--text-secondary)' }}>暂无符合条件的题目</div>
          <button
            onClick={loadQuestions}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            刷新题目
          </button>
          <button
            onClick={resetFilters}
            style={{
              marginLeft: 12,
              background: '#fff',
              color: 'var(--primary)',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              border: '1px solid var(--primary)',
              cursor: 'pointer',
            }}
          >
            重置筛选
          </button>
        </div>
      ) : (
        <div
          className="fadeInUp"
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            padding: 32,
            boxShadow: 'var(--shadow)',
            marginBottom: 16,
          }}
        >
          {/* 题目头部信息 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: current.type === 'vocabulary' ? 'var(--primary-light)' : '#d1fae5',
                  color: current.type === 'vocabulary' ? 'var(--primary)' : 'var(--success)',
                }}
              >
                {current.category}
              </span>
              {examLabel && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: examLabel === '四级' ? '#dbeafe' : '#f3e8ff',
                    color: examLabel === '四级' ? '#2563eb' : '#9333ea',
                  }}
                >
                  {examLabel} {yearLabel}
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {currentIndex + 1} / {questions.length}
            </span>
          </div>

          <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.6, marginBottom: 24 }}>{current.question}</div>

          {current.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {current.options.map((opt, i) => {
                let borderColor = 'var(--border)'
                let bg = '#fff'
                if (answered) {
                  if (opt === current.correct_answer) {
                    borderColor = 'var(--success)'
                    bg = '#d1fae5'
                  } else if (opt === selectedOption) {
                    borderColor = 'var(--danger)'
                    bg = '#fee2e2'
                  }
                } else if (selectedOption === opt) {
                  borderColor = 'var(--primary)'
                  bg = 'var(--primary-light)'
                }

                return (
                  <button
                    key={opt}
                    disabled={answered}
                    onClick={() => setSelectedOption(opt)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 10,
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      textAlign: 'left',
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.2s',
                      cursor: answered ? 'default' : 'pointer',
                    }}
                  >
                    {answered && opt === current.correct_answer && <Check size={18} color="var(--success)" />}
                    {answered && opt === selectedOption && opt !== current.correct_answer && <X size={18} color="var(--danger)" />}
                    <span style={{ marginRight: 4, color: 'var(--text-secondary)', fontSize: 13 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {!answered && (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                background: selectedOption ? 'var(--primary)' : '#e5e7eb',
                color: selectedOption ? '#fff' : '#9ca3af',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: selectedOption ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              提交答案
            </button>
          )}

          {answered && (
            <>
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  borderRadius: 10,
                  background: isCorrect ? '#d1fae5' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {isCorrect ? (
                  <>
                    <Check size={20} color="var(--success)" />
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>回答正确！</span>
                  </>
                ) : (
                  <>
                    <X size={20} color="var(--danger)" />
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                      回答错误，正确答案是：{current.correct_answer}
                    </span>
                  </>
                )}
              </div>

              <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#f9fafb' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>解析</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>{current.explanation}</div>
              </div>

              {aiLoading && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>AI 正在分析错题原因...</span>
                </div>
              )}

              {aiResult && !isCorrect && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Sparkles size={16} color="var(--primary)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>AI 错题分析</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--primary)',
                        color: '#fff',
                      }}
                    >
                      {aiResult.errorType}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#1e3a5f', whiteSpace: 'pre-wrap' }}>
                    {aiResult.analysis}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button
                  onClick={saveWord}
                  disabled={wordSaved}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 10,
                    background: wordSaved ? '#d1fae5' : '#fff',
                    color: wordSaved ? 'var(--success)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: wordSaved ? 'default' : 'pointer',
                  }}
                >
                  <BookMarked size={16} />
                  {wordSaved ? '已添加到词汇本' : '标记词汇'}
                </button>
                <button
                  onClick={nextQuestion}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: 10,
                    background: 'var(--primary)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  下一题
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 学习提示 */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: 12,
        border: '1px solid #bae6fd',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>
          💡 学习提示
        </div>
        <div style={{ fontSize: 13, color: '#0284c7', lineHeight: 1.6 }}>
          选择年份和考试类型可专项练习历年真题，如选择「2023年 - 四级」查看2023年6月四级真题。混合练习可以全面检测英语水平。
        </div>
      </div>
    </div>
  )
}