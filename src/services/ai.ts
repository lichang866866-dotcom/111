import { AISettings } from '../types'

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  claude: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-sonnet-20240229',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
  },
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
  },
  custom: {
    baseUrl: '',
    model: '',
  },
}

const DEFAULT_SYSTEM_PROMPT = `你是一位专业的英语学习AI助手，专注于帮助用户高效背单词、提升英语能力。

你的核心职责：
1. 分析用户的遗忘模式，提供针对性的记忆策略
2. 识别用户的学习困惑（如相似词混淆、语法盲点），给出清晰的辨析和讲解
3. 根据用户的记忆曲线数据，动态调整学习建议
4. 提供生动有趣的记忆技巧，如联想记忆、词根词缀拆解、场景化记忆等

沟通风格：
- 耐心、鼓励、专业
- 善于用中文解释英语知识点
- 回答简洁有力，避免冗长
- 针对用户的具体错误给出精准反馈`

async function loadSystemPrompt(settings: AISettings): Promise<string> {
  return settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
}

async function loadLongTermMemory(): Promise<{ memories: any[]; profiles: Record<string, string> }> {
  try {
    const memories = await window.electronAPI.getAIMemories()
    const profiles = await window.electronAPI.getAllUserProfiles()
    const profileMap: Record<string, string> = {}
    for (const p of profiles) {
      profileMap[p.key] = p.value
    }
    return { memories, profiles: profileMap }
  } catch {
    return { memories: [], profiles: {} }
  }
}

function buildEnhancedPrompt(systemPrompt: string, memories: any[], profiles: Record<string, string>, userPrompt: string): string {
  const memoryContext = memories.length > 0
    ? `\n## 长期记忆库\n以下是我记录的学习偏好和历史观察，请在分析时参考：\n${memories.slice(0, 10).map((m) => `- [${m.category}] ${m.content}`).join('\n')}\n`
    : ''

  const profileContext = Object.keys(profiles).length > 0
    ? `\n## 用户画像\n${Object.entries(profiles).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`
    : ''

  return `${systemPrompt}\n${memoryContext}${profileContext}\n## 当前任务\n${userPrompt}`
}

function getHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (provider === 'claude') {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

function buildBody(provider: string, model: string, prompt: string) {
  if (provider === 'claude') {
    return {
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }
  }
  if (provider === 'gemini') {
    return {
      contents: [{ parts: [{ text: prompt }] }],
    }
  }
  return {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  }
}

function parseResponse(provider: string, data: any): string {
  if (provider === 'claude') {
    return data.content?.[0]?.text || '无分析结果'
  }
  if (provider === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '无分析结果'
  }
  return data.choices?.[0]?.message?.content || '无分析结果'
}

export async function analyzeMistake(
  settings: AISettings,
  question: string,
  correctAnswer: string,
  userAnswer: string,
  explanation: string,
  category: string
): Promise<{ analysis: string; errorType: string }> {
  const provider = settings.provider
  const baseUrl = settings.baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl

  if (!baseUrl || !settings.apiKey) {
    throw new Error('请先在设置中配置 AI API 信息')
  }

  const [systemPrompt, { memories, profiles }] = await Promise.all([
    loadSystemPrompt(settings),
    loadLongTermMemory(),
  ])

  const userPrompt = `你是一位专业的英语学习分析师。请分析以下学生的错题，并给出详细的错误原因和改进建议。

题目类型: ${category}
题目: ${question}
正确答案: ${correctAnswer}
学生答案: ${userAnswer}
题目解析: ${explanation}

请以以下 JSON 格式返回结果（不要包含其他文字）:
{
  "errorType": "错误类型，如：词汇理解偏差、语法规则混淆、时态误用、介词搭配错误、句意理解错误等",
  "analysis": "详细分析：1. 学生为什么选错 2. 涉及的知识点 3. 如何记忆和避免再次出错"
}`

  const prompt = buildEnhancedPrompt(systemPrompt, memories, profiles, userPrompt)

  const model = settings.model || PROVIDER_DEFAULTS[provider]?.model
  const body = buildBody(provider, model, prompt)

  let url = baseUrl
  if (provider === 'gemini') {
    url = `${baseUrl}?key=${settings.apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(provider, settings.apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const status = response.status
    const errorText = await response.text().catch(() => '无返回内容')
    throw new Error(`HTTP ${status}: ${errorText || '请求失败，请检查 Base URL 和 API Key 是否正确'}`)
  }

  const data = await response.json()
  const text = parseResponse(provider, data)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        analysis: result.analysis || text,
        errorType: result.errorType || '未知错误',
      }
    }
  } catch {
    // fallback
  }

  return { analysis: text, errorType: '分析错误' }
}

export async function analyzeMemory(
  settings: AISettings,
  stats: { totalWords: number; totalReviews: number; highForget: number; avgLevel: number },
  words: any[]
): Promise<{ summary: string; weakWords: string[]; suggestions: string[] }> {
  const provider = settings.provider
  const baseUrl = settings.baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl

  if (!baseUrl || !settings.apiKey) {
    throw new Error('请先在设置中配置 AI API 信息')
  }

  const topWeak = words.slice(0, 15).map((w) =>
    `- ${w.word}: 遗忘${w.forget_count}次, 当前阶段${w.level + 1}/6, 复习${w.review_count}次`
  ).join('\n')

  const [systemPrompt, { memories, profiles }] = await Promise.all([
    loadSystemPrompt(settings),
    loadLongTermMemory(),
  ])

  const userPrompt = `你是一位专业的记忆科学顾问，擅长基于艾宾浩斯遗忘曲线分析学习数据。

## 用户背单词总体数据
- 词汇本总单词数: ${stats.totalWords}
- 已开始复习的单词: ${stats.totalReviews}
- 高频遗忘单词数(遗忘≥2次): ${stats.highForget}
- 平均记忆阶段: ${stats.avgLevel}/6 (阶段越高记忆越牢固)

## 最容易遗忘的单词 Top 15
${topWeak}

艾宾浩斯复习间隔为: 第1天→第2天→第4天→第7天→第15天→第30天。

请基于以上数据，以 JSON 格式返回:
{
  "summary": "一段整体的记忆状态总结，指出主要问题",
  "weakWords": ["列出3-5个最需要优先加强的单词"],
  "suggestions": ["给出3-5条具体的记忆技巧或复习策略建议"]
}`

  const model = settings.model || PROVIDER_DEFAULTS[provider]?.model
  const prompt = buildEnhancedPrompt(systemPrompt, memories, profiles, userPrompt)
  const body = buildBody(provider, model, prompt)

  let url = baseUrl
  if (provider === 'gemini') {
    url = `${baseUrl}?key=${settings.apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(provider, settings.apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const status = response.status
    const errorText = await response.text().catch(() => '无返回内容')
    throw new Error(`HTTP ${status}: ${errorText || '请求失败，请检查 Base URL 和 API Key 是否正确'}`)
  }

  const data = await response.json()
  const text = parseResponse(provider, data)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        summary: result.summary || '暂无分析',
        weakWords: result.weakWords || [],
        suggestions: result.suggestions || [],
      }
    }
  } catch {
    // fallback
  }

  return { summary: text, weakWords: [], suggestions: [] }
}

export async function analyzeEbbinghausGap(
  settings: AISettings,
  standard: number[],
  actual: number[]
): Promise<{ gapAnalysis: string; recommendations: string[] }> {
  const provider = settings.provider
  const baseUrl = settings.baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl

  if (!baseUrl || !settings.apiKey) {
    throw new Error('请先在设置中配置 AI API 信息')
  }

  const stages = ['1天后', '2天后', '4天后', '7天后', '15天后', '30天后']
  const comparison = stages.map((s, i) => `  ${s}: 标准留存${standard[i]}% vs 实际留存${actual[i]}%`).join('\n')

  const [systemPrompt, { memories, profiles }] = await Promise.all([
    loadSystemPrompt(settings),
    loadLongTermMemory(),
  ])

  const userPrompt = `你是一位记忆科学研究专家。请分析以下艾宾浩斯遗忘曲线对比数据。

## 艾宾浩斯遗忘曲线对比
${comparison}

标准艾宾浩斯留存率：1天后56%, 2天后36%, 4天后25%, 7天后21%, 15天后18%, 30天后15%。

请以 JSON 格式返回:
{
  "gapAnalysis": "分析用户实际曲线与标准曲线的差距，指出用户在哪个阶段遗忘最快、哪个阶段记忆最稳定",
  "recommendations": ["给出3-5条针对性建议，帮助用户缩小与标准曲线的差距"]
}`

  const model = settings.model || PROVIDER_DEFAULTS[provider]?.model
  const prompt = buildEnhancedPrompt(systemPrompt, memories, profiles, userPrompt)
  const body = buildBody(provider, model, prompt)

  let url = baseUrl
  if (provider === 'gemini') {
    url = `${baseUrl}?key=${settings.apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(provider, settings.apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const status = response.status
    const errorText = await response.text().catch(() => '无返回内容')
    throw new Error(`HTTP ${status}: ${errorText || '请求失败'}`)
  }

  const data = await response.json()
  const text = parseResponse(provider, data)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        gapAnalysis: result.gapAnalysis || '暂无分析',
        recommendations: result.recommendations || [],
      }
    }
  } catch {
    // fallback
  }

  return { gapAnalysis: text, recommendations: [] }
}

export async function generateLearningPlan(
  settings: AISettings,
  params: {
    dailyMinutes: number
    targetExam: string
    totalWords: number
    highForget: number
    avgLevel: number
    ebbinghausStandard: number[]
    ebbinghausActual: number[]
    dictionaryName?: string
    dictionaryWordCount?: number
    priorityWords?: string[]
  }
): Promise<{
  title: string
  dailyNewWords: number
  dailyReviewWords: number
  focusWords: string[]
  strategy: string[]
}> {
  const provider = settings.provider
  const baseUrl = settings.baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl

  if (!baseUrl || !settings.apiKey) {
    throw new Error('请先在设置中配置 AI API 信息')
  }

  const [systemPrompt, { memories, profiles }] = await Promise.all([
    loadSystemPrompt(settings),
    loadLongTermMemory(),
  ])

  const priorityWordsHint = params.priorityWords && params.priorityWords.length > 0
    ? `\n- 重点背诵词汇（前50个）: ${params.priorityWords.slice(0, 20).join(', ')}...`
    : ''

  const userPrompt = `你是一位专业的英语学习规划师。请根据以下用户数据，设计一个个性化的背单词计划。

## 用户参数
- 每日可用时间: ${params.dailyMinutes} 分钟
- 目标考试/场景: ${params.targetExam}
- 当前词汇本总单词: ${params.totalWords}
- 高频遗忘单词数: ${params.highForget}
- 平均记忆阶段: ${params.avgLevel}/6
${params.dictionaryName ? `- 选定的背诵词典: ${params.dictionaryName} (${params.dictionaryWordCount || 0}词)` : ''}${priorityWordsHint}

## 艾宾浩斯曲线对比
- 标准留存率: [56%, 36%, 25%, 21%, 18%, 15%]
- 实际留存率: [${params.ebbinghausActual.join('%, ')}%]

请以 JSON 格式返回:
{
  "title": "计划标题，如'雅思冲刺30天计划'",
  "dailyNewWords": 建议的每日新词数量（数字）,
  "dailyReviewWords": 建议的每日复习数量（数字）,
  "focusWords": ["3-5个建议优先攻克的单词类型或主题，参考选定词典的词汇特点"],
  "strategy": ["3-5条具体的背单词策略和记忆方法建议，针对选定词典的词汇特点"]
}

注意：用户希望优先背诵选定词典中的词汇，计划应围绕该词典设计。`

  const model = settings.model || PROVIDER_DEFAULTS[provider]?.model
  const prompt = buildEnhancedPrompt(systemPrompt, memories, profiles, userPrompt)
  const body = buildBody(provider, model, prompt)

  let url = baseUrl
  if (provider === 'gemini') {
    url = `${baseUrl}?key=${settings.apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(provider, settings.apiKey),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const status = response.status
    const errorText = await response.text().catch(() => '无返回内容')
    throw new Error(`HTTP ${status}: ${errorText || '请求失败'}`)
  }

  const data = await response.json()
  const text = parseResponse(provider, data)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return {
        title: result.title || '个性化学习计划',
        dailyNewWords: Number(result.dailyNewWords) || 10,
        dailyReviewWords: Number(result.dailyReviewWords) || 20,
        focusWords: result.focusWords || [],
        strategy: result.strategy || [],
      }
    }
  } catch {
    // fallback
  }

  return { title: '个性化学习计划', dailyNewWords: 10, dailyReviewWords: 20, focusWords: [], strategy: [] }
}

export function getDefaultModel(provider: string): string {
  return PROVIDER_DEFAULTS[provider]?.model || ''
}

export function getDefaultBaseUrl(provider: string): string {
  return PROVIDER_DEFAULTS[provider]?.baseUrl || ''
}
