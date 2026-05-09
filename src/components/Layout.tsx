import { ReactNode } from 'react'
import { Home, BookOpen, AlertCircle, Library, Brain, BookMarked, Settings, Target, FileText } from 'lucide-react'
import { Page } from '../types'

interface LayoutProps {
  children: ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'home', label: '首页', icon: Home },
  { page: 'quiz', label: '做题', icon: BookOpen },
  { page: 'mistakes', label: '错题', icon: AlertCircle },
  { page: 'words', label: '词汇', icon: Library },
  { page: 'review', label: '背单词', icon: Brain },
  { page: 'dictionary', label: '词典', icon: BookMarked },
  { page: 'literature', label: '文献导入', icon: FileText },
  { page: 'learning-plan', label: '学习计划', icon: Target },
  { page: 'settings', label: '设置', icon: Settings },
]

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav
        style={{
          width: 200,
          background: '#fff',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 12px',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, padding: '0 12px 24px', color: 'var(--primary)' }}>
          English Tutor
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.page
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 12px',
                marginBottom: 4,
                borderRadius: 8,
                background: active ? 'var(--primary-light)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              <Icon size={20} />
              {item.label}
            </button>
          )
        })}
      </nav>
      <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>{children}</main>
    </div>
  )
}
