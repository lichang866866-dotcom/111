import { useState } from 'react'
import { Page } from './types'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import MistakesPage from './pages/MistakesPage'
import WordsPage from './pages/WordsPage'
import ReviewPage from './pages/ReviewPage'
import DictionaryPage from './pages/DictionaryPage'
import LearningPlanPage from './pages/LearningPlanPage'
import LiteratureImportPage from './pages/LiteratureImportPage'
import SettingsPage from './pages/SettingsPage'

function PageWrapper({ page, children }: { page: Page; children: React.ReactNode }) {
  return (
    <div key={page} className="page-enter" style={{ height: '100%', overflow: 'auto' }}>
      {children}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('home')

  const pages: Record<Page, React.ReactNode> = {
    home: <HomePage onNavigate={setPage} />,
    quiz: <QuizPage />,
    mistakes: <MistakesPage />,
    words: <WordsPage />,
    review: <ReviewPage />,
    dictionary: <DictionaryPage />,
    'learning-plan': <LearningPlanPage />,
    literature: <LiteratureImportPage />,
    settings: <SettingsPage />,
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      <PageWrapper page={page}>
        {pages[page]}
      </PageWrapper>
    </Layout>
  )
}
