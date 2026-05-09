import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Target, Clock, BookOpen, TrendingUp, CheckCircle } from 'lucide-react'
import { generateLearningPlan } from '../services/ai'

export default function LearningPlanPage() {
  const [plan, setPlan] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    dailyMinutes: 20,
    targetExam: '高考',
    level: '中等',
    selectedDict: null as number | null,
  })
  const [dictionaries, setDictionaries] = useState<any[]>([])

  useEffect(() => {
    loadPlan()
    loadDictionaries()
  }, [])

  async function loadDictionaries() {
    const rows = await window.electronAPI.getDictionaries()
    setDictionaries(rows)
    if (rows.length > 0 && !form.selectedDict) {
      setForm((prev) => ({ ...prev, selectedDict: rows[0].id }))
    }
  }

  async function loadPlan() {
    const p = await window.electronAPI.getLearningPlan()
    if (p) setPlan(p)
  }

  async function generatePlan() {
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

    // 如果没有选择词典，提示用户选择
    if (!form.selectedDict) {
      alert('请先选择一个要背诵的词典')
      return
    }

    setAiLoading(true)
    try {
      const stats = await window.electronAPI.getMemoryStats()
      const ebbinghaus = await window.electronAPI.getEbbinghausData()

      const selectedDict = dictionaries.find((d) => d.id === form.selectedDict)
      const dictWordCount = await window.electronAPI.getDictionaryWordCount(form.selectedDict)

      // 获取选定词典的单词列表作为重点词汇
      const dictWords = await window.electronAPI.getDictionaryWords(form.selectedDict)
      const priorityWords = dictWords.slice(0, 50).map((w: any) => w.word)

      const result = await generateLearningPlan(aiSettings, {
        dailyMinutes: form.dailyMinutes,
        targetExam: form.targetExam,
        totalWords: stats.totalWords,
        highForget: stats.highForget,
        avgLevel: stats.avgLevel,
        ebbinghausStandard: ebbinghaus.standard,
        ebbinghausActual: ebbinghaus.actual,
        dictionaryName: selectedDict?.name,
        dictionaryWordCount: dictWordCount,
        priorityWords: priorityWords,
      })

      const newPlan = {
        title: result.title,
        daily_new_words: result.dailyNewWords,
        daily_review_words: result.dailyReviewWords,
        target_exam: form.targetExam,
        daily_minutes: form.dailyMinutes,
        target_dictionary_id: form.selectedDict,
        focus_words: JSON.stringify(result.focusWords),
        strategy: JSON.stringify(result.strategy),
      }

      await window.electronAPI.saveLearningPlan(newPlan)
      setPlan(newPlan)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)

      // 自动将计划相关的词典单词加入背诵计划
      const wordsToAdd = dictWords.slice(0, result.dailyNewWords * 7).map((w: any) => w.id)
      if (wordsToAdd.length > 0) {
        await window.electronAPI.addWordsToPlan(wordsToAdd)
      }
    } catch (e: any) {
      console.error('生成计划失败:', e)
      alert(`生成计划失败: ${e.message || '网络请求错误，请检查API设置和网络连接'}`)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>学习计划</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>让 AI 根据你的记忆曲线设计个性化背单词方案</p>

      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>学习参数</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              每日可用时间（分钟）
            </label>
            <select
              value={form.dailyMinutes}
              onChange={(e) => setForm({ ...form, dailyMinutes: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 14,
                background: '#fff',
              }}
            >
              <option value={10}>10 分钟</option>
              <option value={20}>20 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={45}>45 分钟</option>
              <option value={60}>60 分钟</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              目标考试/场景
            </label>
            <select
              value={form.targetExam}
              onChange={(e) => setForm({ ...form, targetExam: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 14,
                background: '#fff',
              }}
            >
              <option value="高考">高考</option>
              <option value="考研">考研</option>
              <option value="雅思">雅思</option>
              <option value="托福">托福</option>
              <option value="日常提升">日常提升</option>
              <option value="医学专业">医学专业</option>
              <option value="法律专业">法律专业</option>
              <option value="计算机专业">计算机专业</option>
              <option value="商务英语">商务英语</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            选择背单词词典
          </label>
          <select
            value={form.selectedDict ?? ''}
            onChange={(e) => setForm({ ...form, selectedDict: Number(e.target.value) })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
              background: '#fff',
            }}
          >
            {dictionaries.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={generatePlan}
          disabled={aiLoading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {aiLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
          {saved ? '计划已生成并保存' : aiLoading ? 'AI 正在生成计划...' : '生成个性化学习计划'}
        </button>
      </div>

      {plan && (
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            padding: 28,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Target size={22} color="var(--primary)" />
            <span style={{ fontSize: 18, fontWeight: 700 }}>{plan.title || '学习计划'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: '每日新词', value: plan.daily_new_words, icon: BookOpen, color: 'var(--primary)' },
              { label: '每日复习', value: plan.daily_review_words, icon: TrendingUp, color: 'var(--success)' },
              { label: '每日时长', value: `${plan.daily_minutes || 20}分钟`, icon: Clock, color: 'var(--warning)' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: '#f9fafb',
                    textAlign: 'center',
                  }}
                >
                  <Icon size={20} color={item.color} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
                </div>
              )
            })}
          </div>

          {plan.focus_words && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>重点攻克方向</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(typeof plan.focus_words === 'string' ? JSON.parse(plan.focus_words) : plan.focus_words || []).map((w: string) => (
                  <span
                    key={w}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
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

          {plan.strategy && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>记忆策略</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(typeof plan.strategy === 'string' ? JSON.parse(plan.strategy) : plan.strategy || []).map((s: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#f9fafb',
                      fontSize: 14,
                      lineHeight: 1.6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <CheckCircle size={16} color="var(--success)" style={{ marginTop: 2, flexShrink: 0 }} />
                    {s}
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
