import { useEffect, useState } from 'react'
import {
  BookOpen,
  AlertCircle,
  Brain,
  TrendingUp,
  Calendar,
  CheckCircle,
  Zap,
  ChevronRight,
  BookMarked,
} from 'lucide-react'
import { Page } from '../types'

interface HomePageProps {
  onNavigate: (page: Page) => void
}

interface TodayTask {
  newWords: number
  newWordsTarget: number
  reviewWords: number
  reviewWordsTarget: number
  forgottenWords: number
  completed: boolean
}

interface DailyStat {
  date: string
  newWords: number
  reviewWords: number
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [stats, setStats] = useState({ total: 0, correct: 0, mistakes: 0 })
  const [todayTask, setTodayTask] = useState<TodayTask>({
    newWords: 0,
    newWordsTarget: 20,
    reviewWords: 0,
    reviewWordsTarget: 50,
    forgottenWords: 0,
    completed: false,
  })
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [streak, setStreak] = useState(15)

  useEffect(() => {
    loadStats()
    loadTodayTask()
    loadDailyStats()
    loadCheckInStatus()
  }, [])

  async function loadStats() {
    const s = await window.electronAPI.getStats()
    setStats(s)
  }

  async function loadTodayTask() {
    // 模拟加载今日任务数据
    // 实际应该调用 API 获取今日学习数据
    const mockTask: TodayTask = {
      newWords: 12,
      newWordsTarget: 20,
      reviewWords: 35,
      reviewWordsTarget: 50,
      forgottenWords: 5,
      completed: false,
    }
    setTodayTask(mockTask)
  }

  async function loadDailyStats() {
    // 生成近365天的模拟数据
    const stats: DailyStat[] = []
    const today = new Date()
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const hasActivity = Math.random() > 0.4
      stats.push({
        date: date.toISOString().split('T')[0],
        newWords: hasActivity ? Math.floor(Math.random() * 30) + 5 : 0,
        reviewWords: hasActivity ? Math.floor(Math.random() * 50) + 10 : 0,
      })
    }
    setDailyStats(stats)
  }

  async function loadCheckInStatus() {
    // 实际应该查询数据库获取打卡状态
    setIsCheckedIn(false)
    setStreak(15)
  }

  async function handleCheckIn() {
    if (isCheckedIn) return
    // 实际应该调用 API 记录打卡
    setIsCheckedIn(true)
    setStreak((s) => s + 1)
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  const progressPercent = Math.round(
    ((todayTask.newWords + todayTask.reviewWords) / (todayTask.newWordsTarget + todayTask.reviewWordsTarget)) * 100
  )

  // 生成日历热力图数据
  function getHeatmapData() {
    const weeks: DailyStat[][] = []
    const days = [...dailyStats]

    // 补齐到完整的周
    const firstDay = new Date(days[0]?.date || new Date())
    const dayOfWeek = firstDay.getDay()
    for (let i = 0; i < dayOfWeek; i++) {
      days.unshift({ date: '', newWords: 0, reviewWords: 0 })
    }

    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  }

  function getIntensityLevel(count: number) {
    if (count === 0) return 0
    if (count < 10) return 1
    if (count < 20) return 2
    if (count < 30) return 3
    return 4
  }

  function getHeatmapColor(level: number) {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
    return colors[level] || colors[0]
  }

  const heatmapData = getHeatmapData()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* 标题区域 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>欢迎回来 👋</h1>
          <p style={{ color: 'var(--text-secondary)' }}>继续你的英语学习之旅</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 20,
              background: '#fef3c7',
              color: '#d97706',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Zap size={18} />
            🔥 {streak} 天
          </div>
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn}
            style={{
              padding: '10px 20px',
              borderRadius: 20,
              background: isCheckedIn ? '#d1fae5' : 'var(--primary)',
              color: isCheckedIn ? '#166534' : '#fff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: isCheckedIn ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle size={16} />
            {isCheckedIn ? '已打卡' : '今日打卡'}
          </button>
        </div>
      </div>

      {/* 今日任务卡片 */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #60a5fa 100%)',
          borderRadius: 20,
          padding: 24,
          color: '#fff',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>今日任务</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {todayTask.newWords + todayTask.reviewWords} / {todayTask.newWordsTarget + todayTask.reviewWordsTarget}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>已完成 {progressPercent}%</div>
          </div>
          <button
            onClick={() => onNavigate('review')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            去学习
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 进度条 */}
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 20 }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              borderRadius: 4,
              background: '#fff',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {/* 任务项 */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <BookMarked size={16} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: 13, opacity: 0.9 }}>新词学习</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {todayTask.newWords} <span style={{ fontSize: 14, opacity: 0.7 }}>/ {todayTask.newWordsTarget}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Brain size={16} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: 13, opacity: 0.9 }}>今日复习</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {todayTask.reviewWords} <span style={{ fontSize: 14, opacity: 0.7 }}>/ {todayTask.reviewWordsTarget}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertCircle size={16} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: 13, opacity: 0.9 }}>待复习</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{todayTask.forgottenWords}</div>
          </div>
        </div>
      </div>

      {/* 日历热力图 */}
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>学习日历</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: getHeatmapColor(level),
                }}
              />
            ))}
            <span>多</span>
          </div>
        </div>

        {/* 热力图网格 */}
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 8 }}>
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((day, dayIndex) => {
                const level = getIntensityLevel(day.newWords + day.reviewWords)
                return (
                  <div
                    key={dayIndex}
                    title={day.date ? `${day.date}: 新词 ${day.newWords}, 复习 ${day.reviewWords}` : ''}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: getHeatmapColor(level),
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>近一年学习记录</span>
          <span>
            总学习 {dailyStats.reduce((sum, d) => sum + d.newWords + d.reviewWords, 0)} 词
          </span>
        </div>
      </div>

      {/* 统计数据 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: '正确率', value: `${accuracy}%`, sub: `${stats.correct} / ${stats.total} 题`, icon: TrendingUp, color: 'var(--primary)' },
          { label: '单词本', value: '128', sub: '已收录单词', icon: BookMarked, color: '#7ED321' },
          { label: '已掌握', value: '86', sub: '熟练单词', icon: CheckCircle, color: 'var(--success)' },
          { label: '错题本', value: `${stats.mistakes}`, sub: '待复习错题', icon: AlertCircle, color: 'var(--danger)' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                padding: 20,
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={stat.color} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stat.sub}</div>
            </div>
          )
        })}
      </div>

      {/* 快速开始 */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>快速开始</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          {
            title: '去做题',
            desc: '练习词汇和语法题',
            icon: BookOpen,
            page: 'quiz' as Page,
            color: 'var(--primary)',
            bg: 'var(--primary-light)',
          },
          {
            title: '背单词',
            desc: '今日剩余 ' + (todayTask.newWordsTarget - todayTask.newWords + todayTask.reviewWordsTarget - todayTask.reviewWords) + ' 词',
            icon: Brain,
            page: 'review' as Page,
            color: 'var(--success)',
            bg: '#d1fae5',
          },
          {
            title: '查词典',
            desc: '浏览专业词典',
            icon: BookMarked,
            page: 'dictionary' as Page,
            color: '#F5A623',
            bg: '#fef3c7',
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.page}
              onClick={() => onNavigate(card.page)}
              style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                padding: 24,
                textAlign: 'left',
                boxShadow: 'var(--shadow)',
                transition: 'transform 0.2s',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  marginBottom: 16,
                }}
              >
                <Icon size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{card.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
