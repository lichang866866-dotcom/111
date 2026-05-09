import { invoke } from '@tauri-apps/api/core'

export interface CETStats {
  cet4_count: number
  cet6_count: number
  years: number[]
}

export interface Stats {
  total: number
  correct: number
  mistakes: number
}

export interface MemoryStats {
  total_words: number
  total_reviews: number
  high_forget: number
  avg_level: number
}

export interface EbbinghausData {
  standard: number[]
  actual: number[]
}

export interface LearningPlan {
  id: number
  title?: string
  daily_new_words: number
  daily_review_words: number
  target_dictionary_id?: number
  target_exam?: string
  daily_minutes: number
}

export interface Question {
  id: number
  question_type: string
  category: string
  question: string
  options: string
  correct_answer: string
  explanation: string
  difficulty: number
  exam_type?: string
  exam_year?: number
}

export const api = {
  // Questions
  getQuestions: (type?: string, category?: string, examType?: string, examYear?: number): Promise<Question[]> =>
    invoke('get_questions', { questionType: type, category, examType, examYear }),

  // Attempts
  submitAttempt: (questionId: number, userAnswer: string, isCorrect: boolean, timeSpent?: number): Promise<number> =>
    invoke('submit_attempt', { questionId, userAnswer, isCorrect, timeSpent }),

  // Mistakes
  saveMistake: (attemptId: number, errorType?: string, aiAnalysis?: string): Promise<void> =>
    invoke('save_mistake', { attemptId, errorType, aiAnalysis }),
  getMistakes: (): Promise<any[]> =>
    invoke('get_mistakes'),
  getStats: (): Promise<Stats> =>
    invoke('get_stats'),

  // Words
  getWords: (): Promise<any[]> =>
    invoke('get_words'),
  addWord: (word: string, meaning?: string, phonetic?: string, example?: string, tags?: string): Promise<number | null> =>
    invoke('add_word', { word, meaning, phonetic, example, tags }),
  deleteWord: (id: number): Promise<void> =>
    invoke('delete_word', { id }),
  getReviewWords: (): Promise<any[]> =>
    invoke('get_review_words'),
  updateWordReview: (wordId: number, result: 'forgotten' | 'vague' | 'known'): Promise<void> =>
    invoke('update_word_review', { wordId, resultStr: result }),

  // Memory
  getMemoryStats: (): Promise<MemoryStats> =>
    invoke('get_memory_stats'),

  // Settings
  getSettings: (): Promise<Record<string, string>> =>
    invoke('get_settings'),
  setSetting: (key: string, value: string): Promise<void> =>
    invoke('set_setting', { key, value }),

  // Dictionaries
  getDictionaries: (): Promise<any[]> =>
    invoke('get_dictionaries'),
  getDictionaryWords: (dictionaryId: number): Promise<any[]> =>
    invoke('get_dictionary_words', { dictionaryId }),
  addWordsToPlan: (wordIds: number[]): Promise<number> =>
    invoke('add_words_to_plan', { wordIds }),
  getDictionaryWordCount: (dictionaryId: number): Promise<number> =>
    invoke('get_dictionary_word_count', { dictionaryId }),

  // Ebbinghaus
  getEbbinghausData: (): Promise<EbbinghausData> =>
    invoke('get_ebbinghaus_data'),

  // Learning Plan
  getLearningPlan: (): Promise<LearningPlan | null> =>
    invoke('get_learning_plan'),
  saveLearningPlan: (plan: LearningPlan): Promise<void> =>
    invoke('save_learning_plan', { plan }),

  // CET
  getCETExamYears: (): Promise<number[]> =>
    invoke('get_cet_exam_years'),
  getCETStats: (): Promise<CETStats> =>
    invoke('get_cet_stats'),

  // User Data
  getUserDataPath: (): Promise<string> =>
    invoke('get_user_data_path'),
}

// For backward compatibility with existing code that uses window.electronAPI
declare global {
  interface Window {
    electronAPI: typeof api
  }
}
