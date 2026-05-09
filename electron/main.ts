import path from 'path'
import fs from 'fs'
import { app, BrowserWindow, ipcMain } from 'electron'

// Lazy load heavy data
let DICTIONARY_LIST: any[] = []
let DICTIONARY_WORDS: Record<number, [string, string, string, string][]> = {}
let CET_QUESTIONS: any[] = []

function loadData() {
  if (DICTIONARY_LIST.length === 0) {
    const dataPath = path.join(__dirname, 'dictionary-data.js')
    if (fs.existsSync(dataPath)) {
      const data = require(dataPath)
      DICTIONARY_LIST = data.dictionaries || []
      DICTIONARY_WORDS = data.wordData || {}
    }
  }
  if (CET_QUESTIONS.length === 0) {
    const cetPath = path.join(__dirname, 'cet-questions.js')
    if (fs.existsSync(cetPath)) {
      const data = require(cetPath)
      CET_QUESTIONS = data.CET_QUESTIONS || []
    }
  }
}

let db: any
let mainWindow: any = null

function getWasmPath(): string {
  const devPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  if (fs.existsSync(devPath)) {
    return devPath
  }
  return path.join(process.resourcesPath, 'sql-wasm.wasm')
}

function getDbPath(): string {
  return path.join(app.getPath('userData'), 'english-tutor.db')
}

function saveDb() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(getDbPath(), Buffer.from(data))
}

function run(sql: string, params?: any[]) {
  if (!db) return
  if (params) {
    const stmt = db.prepare(sql)
    stmt.run(params)
    stmt.free()
  } else {
    db.run(sql)
  }
}

function get(sql: string, params?: any[]): any {
  if (!db) return null
  const stmt = db.prepare(sql)
  stmt.step()
  const row = stmt.getAsObject()
  stmt.free()
  return Object.keys(row).length ? row : null
}

function all(sql: string, params?: any[]): any[] {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params) {
    stmt.bind(params)
  }
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function initSchema() {
  run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      difficulty INTEGER DEFAULT 1,
      exam_type TEXT,
      exam_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      user_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      time_spent INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      ai_analysis TEXT,
      error_type TEXT,
      reviewed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      meaning TEXT,
      phonetic TEXT,
      example TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS word_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      level INTEGER DEFAULT 0,
      next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
      review_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dictionaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dictionary_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dictionary_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      meaning TEXT,
      phonetic TEXT,
      example TEXT,
      difficulty INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS learning_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      daily_new_words INTEGER DEFAULT 10,
      daily_review_words INTEGER DEFAULT 20,
      target_dictionary_id INTEGER,
      target_exam TEXT,
      daily_minutes INTEGER DEFAULT 20,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  try { db.run('ALTER TABLE word_reviews ADD COLUMN forget_count INTEGER DEFAULT 0') } catch { /* ignore */ }
  try { db.run('ALTER TABLE words ADD COLUMN source TEXT DEFAULT "manual"') } catch { /* ignore */ }
  try { db.run('ALTER TABLE words ADD COLUMN dictionary_id INTEGER') } catch { /* ignore */ }
  try { db.run('ALTER TABLE questions ADD COLUMN exam_type TEXT') } catch { /* ignore */ }
  try { db.run('ALTER TABLE questions ADD COLUMN exam_year INTEGER') } catch { /* ignore */ }

  loadData()

  const count = get('SELECT COUNT(*) as count FROM questions')
  if (count && count.count === 0) {
    seedData()
  }

  const dictCount = get('SELECT COUNT(*) as count FROM dictionaries')
  const wordCount = get('SELECT COUNT(*) as count FROM dictionary_words')
  if (!dictCount || dictCount.count === 0 || !wordCount || wordCount.count < 5000) {
    run('DELETE FROM dictionary_words')
    run('DELETE FROM dictionaries')
    seedDictionaries()
  }

  seedCETQuestions()
}

function seedData() {
  const questions = [
    ['vocabulary', '词汇', 'The word "ambiguous" means:', '["清晰的", "模棱两可的", "明确的", "简单的"]', '模棱两可的', '"Ambiguous" 表示意思不明确，可以有多种解释。', 2],
    ['vocabulary', '词汇', 'Choose the correct synonym for "profound":', '["shallow", "deep", "simple", "brief"]', 'deep', '"Profound" 意为深刻的、深远的，与 deep 意思最接近。', 2],
    ['grammar', '语法', 'She ___ to the market every morning.', '["go", "goes", "going", "gone"]', 'goes', '主语 She 是第三人称单数，一般现在时动词需加 -es。', 1],
    ['grammar', '语法', 'If I ___ rich, I would buy a house.', '["am", "was", "were", "be"]', 'were', '虚拟语气中，if 从句用过去式 were（所有人称）。', 3],
    ['vocabulary', '词汇', 'The ___ of the mountain was breathtaking.', '["view", "views", "viewing", "viewed"]', 'view', '此处需要名词作主语，view 为不可数/单数名词。', 1],
    ['grammar', '语法', 'By the time we arrived, they ___ .', '["left", "have left", "had left", "leave"]', 'had left', 'By the time + 过去时间，主句用过去完成时。', 3],
    ['vocabulary', '词汇', '"Resilient" best describes someone who:', '["gives up easily", "recovers quickly", "avoids problems", "gets angry"]', 'recovers quickly', '"Resilient" 指有弹性的、能迅速从困难中恢复的。', 2],
    ['grammar', '语法', 'Not only ___ late, but he also forgot his homework.', '["he was", "was he", "he is", "is he"]', 'was he', 'Not only 置于句首时，句子需要部分倒装。', 3],
  ]

  const stmt = db.prepare('INSERT INTO questions (type, category, question, options, correct_answer, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const q of questions) {
    stmt.run(q)
  }
  stmt.free()

  const words = [
    ['ambiguous', '模棱两可的', '/æmˈbɪɡjuəs/', 'The instructions were ambiguous and confusing.'],
    ['profound', '深刻的', '/prəˈfaʊnd/', 'The book had a profound effect on her.'],
    ['resilient', '有弹性的', '/rɪˈzɪliənt/', 'Children are often remarkably resilient.'],
    ['meticulous', '一丝不苟的', '/məˈtɪkjələs/', 'He was meticulous about keeping records.'],
    ['ephemeral', '短暂的', '/ɪˈfemərəl/', 'Fashion is ephemeral, changing with every season.'],
    ['pragmatic', '务实的', '/præɡˈmætɪk/', 'We need a pragmatic approach to this problem.'],
    ['eloquent', '雄辩的', '/ˈeləkwənt/', 'She made an eloquent speech in defense of her policy.'],
    ['ubiquitous', '无处不在的', '/juːˈbɪkwɪtəs/', 'Smartphones have become ubiquitous in modern life.'],
  ]

  const wordStmt = db.prepare('INSERT INTO words (word, meaning, phonetic, example) VALUES (?, ?, ?, ?)')
  const reviewStmt = db.prepare('INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime("now"))')
  for (const w of words) {
    wordStmt.run(w)
    const last = get('SELECT last_insert_rowid() as id')
    if (last) reviewStmt.run([last.id])
  }
  wordStmt.free()
  reviewStmt.free()

  saveDb()
}

function seedDictionaries() {
  console.log('Seeding dictionaries...')
  console.log('DICTIONARY_LIST length:', DICTIONARY_LIST.length)
  console.log('wordData keys:', Object.keys(DICTIONARY_WORDS))
  const dictStmt = db.prepare('INSERT INTO dictionaries (name, description, category, icon) VALUES (?, ?, ?, ?)')
  for (const d of DICTIONARY_LIST) {
    dictStmt.run([d.name, d.description, d.category, d.icon])
  }
  dictStmt.free()

  let totalWords = 0
  const wordStmt = db.prepare('INSERT INTO dictionary_words (dictionary_id, word, meaning, phonetic, example) VALUES (?, ?, ?, ?, ?)')
  for (const [dictId, words] of Object.entries(DICTIONARY_WORDS) as [string, [string, string, string, string][]][]) {
    for (const w of words) {
      wordStmt.run([parseInt(dictId), ...w])
      totalWords++
    }
  }
  console.log('Total words seeded:', totalWords)
  wordStmt.free()
  saveDb()
}

function seedCETQuestions() {
  console.log('Seeding CET questions...')
  console.log('CET_QUESTIONS length:', CET_QUESTIONS.length)
  const cetCount = get("SELECT COUNT(*) as count FROM questions WHERE exam_type IS NOT NULL")
  if (cetCount && cetCount.count > 0) {
    console.log('CET questions already exist, skipping')
    return
  }

  const stmt = db.prepare('INSERT INTO questions (type, category, question, options, correct_answer, explanation, difficulty, exam_type, exam_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const q of CET_QUESTIONS) {
    stmt.run([q.type, q.category, q.question, JSON.stringify(q.options), q.correct_answer, q.explanation, q.difficulty, q.exam_type, q.exam_year])
  }
  stmt.free()
  saveDb()
  console.log('CET questions seeded successfully')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('db:getQuestions', (_event: any, type?: string, category?: string, examType?: string, examYear?: number) => {
    let sql = 'SELECT * FROM questions WHERE 1=1'
    const params: any[] = []
    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (examType) {
      sql += ' AND exam_type = ?'
      params.push(examType)
    }
    if (examYear) {
      sql += ' AND exam_year = ?'
      params.push(examYear)
    }
    sql += ' ORDER BY RANDOM() LIMIT 20'
    return all(sql, params)
  })

  ipcMain.handle('db:getQuestionById', (_event: any, id: number) => {
    return get('SELECT * FROM questions WHERE id = ?', [id])
  })

  ipcMain.handle('db:submitAttempt', (_event: any, questionId: number, userAnswer: string, isCorrect: boolean, timeSpent?: number) => {
    run('INSERT INTO attempts (question_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?)', [
      questionId,
      userAnswer,
      isCorrect ? 1 : 0,
      timeSpent || 0,
    ])
    const row = get('SELECT last_insert_rowid() as id')
    saveDb()
    return row?.id
  })

  ipcMain.handle('db:saveMistake', (_event: any, attemptId: number, errorType?: string, aiAnalysis?: string) => {
    run('INSERT INTO mistakes (attempt_id, error_type, ai_analysis) VALUES (?, ?, ?)', [
      attemptId,
      errorType || null,
      aiAnalysis || null,
    ])
    saveDb()
  })

  ipcMain.handle('db:getMistakes', () => {
    return all(`
      SELECT m.*, q.question, q.correct_answer, q.explanation, q.category, a.user_answer
      FROM mistakes m
      JOIN attempts a ON m.attempt_id = a.id
      JOIN questions q ON a.question_id = q.id
      ORDER BY m.created_at DESC
    `)
  })

  ipcMain.handle('db:getStats', () => {
    const total = get('SELECT COUNT(*) as count FROM attempts')
    const correct = get('SELECT COUNT(*) as count FROM attempts WHERE is_correct = 1')
    const mistakes = get('SELECT COUNT(*) as count FROM mistakes WHERE reviewed = 0')
    return { total: total?.count || 0, correct: correct?.count || 0, mistakes: mistakes?.count || 0 }
  })

  ipcMain.handle('db:getWords', () => {
    return all('SELECT * FROM words ORDER BY created_at DESC')
  })

  ipcMain.handle('db:addWord', (_event: any, word: string, meaning?: string, phonetic?: string, example?: string, tags?: string) => {
    try {
      run('INSERT INTO words (word, meaning, phonetic, example, tags) VALUES (?, ?, ?, ?, ?)', [
        word,
        meaning || null,
        phonetic || null,
        example || null,
        tags || null,
      ])
      const row = get('SELECT last_insert_rowid() as id')
      if (row) {
        run('INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime("now"))', [row.id])
      }
      saveDb()
      return row?.id
    } catch {
      return null
    }
  })

  ipcMain.handle('db:deleteWord', (_event: any, id: number) => {
    run('DELETE FROM word_reviews WHERE word_id = ?', [id])
    run('DELETE FROM words WHERE id = ?', [id])
    saveDb()
  })

  ipcMain.handle('db:getReviewWords', () => {
    return all(`
      SELECT w.*, wr.level, wr.next_review, wr.review_count, wr.forget_count
      FROM words w
      JOIN word_reviews wr ON w.id = wr.word_id
      WHERE wr.next_review <= datetime('now')
      ORDER BY RANDOM()
    `)
  })

  ipcMain.handle('db:updateWordReview', (_event: any, wordId: number, result: 'forgotten' | 'vague' | 'known') => {
    const ebbinghaus = [1, 2, 4, 7, 15, 30]

    const row = get('SELECT level, forget_count FROM word_reviews WHERE word_id = ?', [wordId])
    const currentLevel = row?.level || 0
    const currentForget = row?.forget_count || 0

    let newLevel: number
    let newForget: number

    if (result === 'known') {
      newLevel = Math.min(currentLevel + 1, ebbinghaus.length - 1)
      newForget = currentForget
    } else if (result === 'vague') {
      newLevel = currentLevel
      newForget = currentForget
    } else {
      newLevel = Math.max(currentLevel - 1, 0)
      newForget = currentForget + 1
    }

    let days = ebbinghaus[newLevel]
    if (result === 'vague') {
      days = Math.max(1, Math.round(days * 0.6))
    }

    run(
      'UPDATE word_reviews SET level = ?, forget_count = ?, next_review = datetime("now", "+' + days + ' days"), review_count = review_count + 1 WHERE word_id = ?',
      [newLevel, newForget, wordId]
    )
    saveDb()
  })

  ipcMain.handle('db:getMemoryStats', () => {
    const totalWords = get('SELECT COUNT(*) as count FROM words')
    const totalReviews = get('SELECT COUNT(*) as count FROM word_reviews WHERE review_count > 0')
    const highForget = get('SELECT COUNT(*) as count FROM word_reviews WHERE forget_count >= 2')
    const avgLevel = get('SELECT AVG(level) as avg FROM word_reviews')
    return {
      totalWords: totalWords?.count || 0,
      totalReviews: totalReviews?.count || 0,
      highForget: highForget?.count || 0,
      avgLevel: Math.round((avgLevel?.avg || 0) * 10) / 10,
    }
  })

  ipcMain.handle('db:getMemoryData', () => {
    return all(`
      SELECT w.word, w.meaning, wr.level, wr.review_count, wr.forget_count, wr.next_review
      FROM words w
      JOIN word_reviews wr ON w.id = wr.word_id
      ORDER BY wr.forget_count DESC, wr.level ASC
    `)
  })

  ipcMain.handle('db:getSettings', () => {
    const rows = all('SELECT * FROM settings')
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    return settings
  })

  ipcMain.handle('db:setSetting', (_event: any, key: string, value: string) => {
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
    saveDb()
  })

  ipcMain.handle('app:getUserDataPath', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('db:getDictionaries', () => {
    return all('SELECT * FROM dictionaries ORDER BY id')
  })

  ipcMain.handle('db:getDictionaryWords', (_event: any, dictionaryId: number) => {
    return all('SELECT * FROM dictionary_words WHERE dictionary_id = ? ORDER BY id', [dictionaryId])
  })

  ipcMain.handle('db:addWordsToPlan', async (_event: any, wordIds: number[]) => {
    let added = 0
    for (const id of wordIds) {
      const exists = get('SELECT id FROM words WHERE id = ?', [id])
      if (!exists) {
        const dw = get('SELECT * FROM dictionary_words WHERE id = ?', [id])
        if (dw) {
          run('INSERT INTO words (word, meaning, phonetic, example, source, dictionary_id) VALUES (?, ?, ?, ?, ?, ?)', [
            dw.word, dw.meaning, dw.phonetic, dw.example, 'dictionary', dw.dictionary_id,
          ])
          const row = get('SELECT last_insert_rowid() as id')
          if (row) {
            run('INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime("now"))', [row.id])
            added++
          }
        }
      }
    }
    saveDb()
    return added
  })

  ipcMain.handle('db:getEbbinghausData', () => {
    const standard = [56, 36, 25, 21, 18, 15]
    const actual: number[] = []

    for (let i = 0; i < 6; i++) {
      const row = get(`
        SELECT
          CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * SUM(CASE WHEN forget_count = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) ELSE NULL END as rate
        FROM word_reviews WHERE level = ? AND review_count > 0
      `, [i])
      actual.push(row?.rate !== null && row?.rate !== undefined ? parseFloat(row.rate) : standard[i])
    }

    return { standard, actual }
  })

  ipcMain.handle('db:getLearningPlan', () => {
    return get('SELECT * FROM learning_plans ORDER BY id DESC LIMIT 1')
  })

  ipcMain.handle('db:saveLearningPlan', (_event: any, plan: any) => {
    run('DELETE FROM learning_plans')
    run('INSERT INTO learning_plans (title, daily_new_words, daily_review_words, target_dictionary_id, target_exam, daily_minutes) VALUES (?, ?, ?, ?, ?, ?)', [
      plan.title, plan.daily_new_words, plan.daily_review_words, plan.target_dictionary_id, plan.target_exam, plan.daily_minutes,
    ])
    saveDb()
  })

  ipcMain.handle('db:getAIMemories', (_event: any, category?: string) => {
    if (category) {
      return all('SELECT * FROM ai_memories WHERE category = ? ORDER BY updated_at DESC', [category])
    }
    return all('SELECT * FROM ai_memories ORDER BY updated_at DESC')
  })

  ipcMain.handle('db:saveAIMemory', (_event: any, category: string, content: string) => {
    run('INSERT INTO ai_memories (category, content) VALUES (?, ?)', [category, content])
    const row = get('SELECT last_insert_rowid() as id')
    saveDb()
    return row?.id
  })

  ipcMain.handle('db:updateAIMemory', (_event: any, id: number, content: string) => {
    run('UPDATE ai_memories SET content = ?, updated_at = datetime("now") WHERE id = ?', [content, id])
    saveDb()
  })

  ipcMain.handle('db:deleteAIMemory', (_event: any, id: number) => {
    run('DELETE FROM ai_memories WHERE id = ?', [id])
    saveDb()
  })

  ipcMain.handle('db:getUserProfile', (_event: any, key: string) => {
    return get('SELECT * FROM user_profiles WHERE key = ?', [key])
  })

  ipcMain.handle('db:getAllUserProfiles', () => {
    return all('SELECT * FROM user_profiles')
  })

  ipcMain.handle('db:setUserProfile', (_event: any, key: string, value: string) => {
    run('INSERT OR REPLACE INTO user_profiles (key, value, updated_at) VALUES (?, ?, datetime("now"))', [key, value])
    saveDb()
  })

  ipcMain.handle('db:getDictionaryWordCount', (_event: any, dictionaryId: number) => {
    const row = get('SELECT COUNT(*) as count FROM dictionary_words WHERE dictionary_id = ?', [dictionaryId])
    return row?.count || 0
  })

  ipcMain.handle('db:getCETExamYears', () => {
    return all('SELECT DISTINCT exam_year FROM questions WHERE exam_year IS NOT NULL ORDER BY exam_year DESC')
  })

  ipcMain.handle('db:getCETStats', () => {
    const cet4 = get("SELECT COUNT(*) as count FROM questions WHERE exam_type = 'CET4'")
    const cet6 = get("SELECT COUNT(*) as count FROM questions WHERE exam_type = 'CET6'")
    const years = all("SELECT DISTINCT exam_year FROM questions WHERE exam_year IS NOT NULL ORDER BY exam_year DESC")
    return {
      cet4Count: cet4?.count || 0,
      cet6Count: cet6?.count || 0,
      years: years.map((y: any) => y.exam_year),
    }
  })
}

// Initialize and run
async function main() {
  const initSqlJs = (await import('sql.js')).default

  const SQL = await initSqlJs({ locateFile: () => getWasmPath() })
  const dbPath = getDbPath()
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(filebuffer)
  } else {
    db = new SQL.Database()
  }

  initSchema()
  registerIpcHandlers()
  createWindow()
}

app.whenReady().then(main)

app.on('window-all-closed', () => {
  saveDb()
  if (db) db.close()
  if (process.platform !== 'darwin') app.quit()
})
