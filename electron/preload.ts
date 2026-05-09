import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getQuestions: (type?: string, category?: string, examType?: string, examYear?: number) => Promise<any[]>
  getQuestionById: (id: number) => Promise<any>
  submitAttempt: (questionId: number, userAnswer: string, isCorrect: boolean, timeSpent?: number) => Promise<number>
  saveMistake: (attemptId: number, errorType?: string, aiAnalysis?: string) => Promise<void>
  getMistakes: () => Promise<any[]>
  getStats: () => Promise<{ total: number; correct: number; mistakes: number }>
  getWords: () => Promise<any[]>
  addWord: (word: string, meaning?: string, phonetic?: string, example?: string, tags?: string) => Promise<number | null>
  deleteWord: (id: number) => Promise<void>
  getReviewWords: () => Promise<any[]>
  updateWordReview: (wordId: number, result: 'forgotten' | 'vague' | 'known') => Promise<void>
  getMemoryStats: () => Promise<{ totalWords: number; totalReviews: number; highForget: number; avgLevel: number }>
  getMemoryData: () => Promise<any[]>
  getDictionaries: () => Promise<any[]>
  getDictionaryWords: (dictionaryId: number) => Promise<any[]>
  addWordsToPlan: (wordIds: number[]) => Promise<number>
  getEbbinghausData: () => Promise<{ standard: number[]; actual: number[] }>
  getLearningPlan: () => Promise<any>
  saveLearningPlan: (plan: any) => Promise<void>
  getSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<void>
  getUserDataPath: () => Promise<string>
  getAIMemories: (category?: string) => Promise<any[]>
  saveAIMemory: (category: string, content: string) => Promise<number | null>
  updateAIMemory: (id: number, content: string) => Promise<void>
  deleteAIMemory: (id: number) => Promise<void>
  getUserProfile: (key: string) => Promise<any>
  getAllUserProfiles: () => Promise<any[]>
  setUserProfile: (key: string, value: string) => Promise<void>
  getDictionaryWordCount: (dictionaryId: number) => Promise<number>
  getCETExamYears: () => Promise<number[]>
  getCETStats: () => Promise<{ cet4Count: number; cet6Count: number; years: number[] }>
}

const api: ElectronAPI = {
  getQuestions: (type?, category?, examType?, examYear?) => ipcRenderer.invoke('db:getQuestions', type, category, examType, examYear),
  getQuestionById: (id) => ipcRenderer.invoke('db:getQuestionById', id),
  submitAttempt: (questionId, userAnswer, isCorrect, timeSpent) =>
    ipcRenderer.invoke('db:submitAttempt', questionId, userAnswer, isCorrect, timeSpent),
  saveMistake: (attemptId, errorType, aiAnalysis) =>
    ipcRenderer.invoke('db:saveMistake', attemptId, errorType, aiAnalysis),
  getMistakes: () => ipcRenderer.invoke('db:getMistakes'),
  getStats: () => ipcRenderer.invoke('db:getStats'),
  getWords: () => ipcRenderer.invoke('db:getWords'),
  addWord: (word, meaning, phonetic, example, tags) =>
    ipcRenderer.invoke('db:addWord', word, meaning, phonetic, example, tags),
  deleteWord: (id) => ipcRenderer.invoke('db:deleteWord', id),
  getReviewWords: () => ipcRenderer.invoke('db:getReviewWords'),
  updateWordReview: (wordId, result) => ipcRenderer.invoke('db:updateWordReview', wordId, result),
  getMemoryStats: () => ipcRenderer.invoke('db:getMemoryStats'),
  getMemoryData: () => ipcRenderer.invoke('db:getMemoryData'),
  getDictionaries: () => ipcRenderer.invoke('db:getDictionaries'),
  getDictionaryWords: (dictionaryId) => ipcRenderer.invoke('db:getDictionaryWords', dictionaryId),
  addWordsToPlan: (wordIds) => ipcRenderer.invoke('db:addWordsToPlan', wordIds),
  getEbbinghausData: () => ipcRenderer.invoke('db:getEbbinghausData'),
  getLearningPlan: () => ipcRenderer.invoke('db:getLearningPlan'),
  saveLearningPlan: (plan) => ipcRenderer.invoke('db:saveLearningPlan', plan),
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),
  getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
  getAIMemories: (category?) => ipcRenderer.invoke('db:getAIMemories', category),
  saveAIMemory: (category, content) => ipcRenderer.invoke('db:saveAIMemory', category, content),
  updateAIMemory: (id, content) => ipcRenderer.invoke('db:updateAIMemory', id, content),
  deleteAIMemory: (id) => ipcRenderer.invoke('db:deleteAIMemory', id),
  getUserProfile: (key) => ipcRenderer.invoke('db:getUserProfile', key),
  getAllUserProfiles: () => ipcRenderer.invoke('db:getAllUserProfiles'),
  setUserProfile: (key, value) => ipcRenderer.invoke('db:setUserProfile', key, value),
  getDictionaryWordCount: (dictionaryId) => ipcRenderer.invoke('db:getDictionaryWordCount', dictionaryId),
  getCETExamYears: () => ipcRenderer.invoke('db:getCETExamYears'),
  getCETStats: () => ipcRenderer.invoke('db:getCETStats'),
}

contextBridge.exposeInMainWorld('electronAPI', api)
