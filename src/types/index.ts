export interface Question {
  id: number
  type: 'vocabulary' | 'grammar'
  category: string
  question: string
  options?: string[]
  correct_answer: string
  explanation: string
  difficulty: number
  exam_type?: string
  exam_year?: number
  created_at: string
}

export interface Attempt {
  id: number
  question_id: number
  user_answer: string
  is_correct: number
  time_spent: number
  created_at: string
}

export interface Mistake {
  id: number
  attempt_id: number
  ai_analysis: string | null
  error_type: string | null
  reviewed: number
  created_at: string
  question: string
  correct_answer: string
  explanation: string
  category: string
  user_answer: string
}

export interface Word {
  id: number
  word: string
  meaning: string | null
  phonetic: string | null
  example: string | null
  tags: string | null
  created_at: string
}

export interface WordReview {
  id: number
  word_id: number
  level: number
  next_review: string
  review_count: number
}

export interface ReviewWord extends Word {
  level: number
  next_review: string
  review_count: number
  forget_count: number
}

export interface AISettings {
  provider: 'claude' | 'openai' | 'gemini' | 'deepseek' | 'qwen' | 'zhipu' | 'moonshot' | 'custom'
  apiKey: string
  baseUrl?: string
  model: string
  systemPrompt?: string
}

export type Page = 'home' | 'quiz' | 'mistakes' | 'words' | 'review' | 'dictionary' | 'learning-plan' | 'literature' | 'settings'

export interface DictionaryDefinition {
  definition: string
  example?: string
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryMeaning {
  partOfSpeech: string
  definitions: DictionaryDefinition[]
  synonyms: string[]
  antonyms: string[]
}

export interface DictionaryPhonetic {
  text?: string
  audio?: string
}

export interface DictionaryEntry {
  word: string
  phonetic?: string
  phonetics: DictionaryPhonetic[]
  meanings: DictionaryMeaning[]
  sourceUrls: string[]
}
