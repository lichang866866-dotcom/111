use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use std::path::PathBuf;

// Database state
pub struct AppState {
    db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Question {
    pub id: i64,
    pub question_type: String,
    pub category: String,
    pub question: String,
    pub options: String,
    pub correct_answer: String,
    pub explanation: String,
    pub difficulty: i32,
    pub exam_type: Option<String>,
    pub exam_year: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Word {
    pub id: i64,
    pub word: String,
    pub meaning: Option<String>,
    pub phonetic: Option<String>,
    pub example: Option<String>,
    pub tags: Option<String>,
    pub source: Option<String>,
    pub dictionary_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordReview {
    pub id: i64,
    pub word_id: i64,
    pub level: i32,
    pub next_review: String,
    pub review_count: i32,
    pub forget_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Dictionary {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DictionaryWord {
    pub id: i64,
    pub dictionary_id: i64,
    pub word: String,
    pub meaning: Option<String>,
    pub phonetic: Option<String>,
    pub example: Option<String>,
    pub difficulty: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LearningPlan {
    pub id: i64,
    pub title: Option<String>,
    pub daily_new_words: i32,
    pub daily_review_words: i32,
    pub target_dictionary_id: Option<i64>,
    pub target_exam: Option<String>,
    pub daily_minutes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Stats {
    pub total: i32,
    pub correct: i32,
    pub mistakes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_words: i32,
    pub total_reviews: i32,
    pub high_forget: i32,
    pub avg_level: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CETStats {
    pub cet4_count: i32,
    pub cet6_count: i32,
    pub years: Vec<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EbbinghausData {
    pub standard: Vec<i32>,
    pub actual: Vec<i32>,
}

// Get questions with optional filters
#[tauri::command]
pub fn get_questions(
    state: State<AppState>,
    question_type: Option<String>,
    category: Option<String>,
    exam_type: Option<String>,
    exam_year: Option<i32>,
) -> Result<Vec<Question>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from("SELECT * FROM questions WHERE 1=1");
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref t) = question_type {
        sql.push_str(" AND type = ?");
        params_vec.push(Box::new(t.clone()));
    }
    if let Some(ref c) = category {
        sql.push_str(" AND category = ?");
        params_vec.push(Box::new(c.clone()));
    }
    if let Some(ref e) = exam_type {
        sql.push_str(" AND exam_type = ?");
        params_vec.push(Box::new(e.clone()));
    }
    if let Some(y) = exam_year {
        sql.push_str(" AND exam_year = ?");
        params_vec.push(Box::new(y));
    }

    sql.push_str(" ORDER BY RANDOM() LIMIT 20");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let questions = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Question {
            id: row.get(0)?,
            question_type: row.get(1)?,
            category: row.get(2)?,
            question: row.get(3)?,
            options: row.get(4)?,
            correct_answer: row.get(5)?,
            explanation: row.get(6)?,
            difficulty: row.get(7)?,
            exam_type: row.get(8).ok(),
            exam_year: row.get(9).ok(),
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for q in questions {
        result.push(q.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Submit attempt
#[tauri::command]
pub fn submit_attempt(
    state: State<AppState>,
    question_id: i64,
    user_answer: String,
    is_correct: bool,
    time_spent: Option<i32>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO attempts (question_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?)",
        params![question_id, user_answer, is_correct as i32, time_spent.unwrap_or(0)],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
}

// Save mistake
#[tauri::command]
pub fn save_mistake(
    state: State<AppState>,
    attempt_id: i64,
    error_type: Option<String>,
    ai_analysis: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO mistakes (attempt_id, error_type, ai_analysis) VALUES (?, ?, ?)",
        params![attempt_id, error_type, ai_analysis],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Get mistakes
#[tauri::command]
pub fn get_mistakes(state: State<AppState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT m.*, q.question, q.correct_answer, q.explanation, q.category, a.user_answer
         FROM mistakes m
         JOIN attempts a ON m.attempt_id = a.id
         JOIN questions q ON a.question_id = q.id
         ORDER BY m.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let mistakes = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "attempt_id": row.get::<_, i64>(1)?,
            "ai_analysis": row.get::<_, Option<String>>(2)?,
            "error_type": row.get::<_, Option<String>>(3)?,
            "reviewed": row.get::<_, i32>(4)?,
            "created_at": row.get::<_, String>(5)?,
            "question": row.get::<_, String>(6)?,
            "correct_answer": row.get::<_, String>(7)?,
            "explanation": row.get::<_, String>(8)?,
            "category": row.get::<_, String>(9)?,
            "user_answer": row.get::<_, String>(10)?,
        }))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for m in mistakes {
        result.push(m.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Get stats
#[tauri::command]
pub fn get_stats(state: State<AppState>) -> Result<Stats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let total: i32 = conn.query_row(
        "SELECT COUNT(*) FROM attempts",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let correct: i32 = conn.query_row(
        "SELECT COUNT(*) FROM attempts WHERE is_correct = 1",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let mistakes: i32 = conn.query_row(
        "SELECT COUNT(*) FROM mistakes WHERE reviewed = 0",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(Stats { total, correct, mistakes })
}

// Get words
#[tauri::command]
pub fn get_words(state: State<AppState>) -> Result<Vec<Word>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT w.*, wr.level, wr.next_review, wr.review_count, wr.forget_count
         FROM words w
         JOIN word_reviews wr ON w.id = wr.word_id
         ORDER BY w.created_at DESC"
    ).map_err(|e| e.to_string())?;

    let words = stmt.query_map([], |row| {
        Ok(Word {
            id: row.get(0)?,
            word: row.get(1)?,
            meaning: row.get(2)?,
            phonetic: row.get(3)?,
            example: row.get(4)?,
            tags: row.get(5)?,
            source: row.get::<_, Option<String>>(8).ok(),
            dictionary_id: row.get::<_, Option<i64>>(9).ok(),
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for w in words {
        result.push(w.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Add word
#[tauri::command]
pub fn add_word(
    state: State<AppState>,
    word: String,
    meaning: Option<String>,
    phonetic: Option<String>,
    example: Option<String>,
    tags: Option<String>,
) -> Result<Option<i64>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    match conn.execute(
        "INSERT INTO words (word, meaning, phonetic, example, tags) VALUES (?, ?, ?, ?, ?)",
        params![word, meaning, phonetic, example, tags],
    ) {
        Ok(_) => {
            let id = conn.last_insert_rowid();
            conn.execute(
                "INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime('now'))",
                params![id],
            ).map_err(|e| e.to_string())?;
            Ok(Some(id))
        }
        Err(_) => Ok(None),
    }
}

// Delete word
#[tauri::command]
pub fn delete_word(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM word_reviews WHERE word_id = ?", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM words WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Get review words
#[tauri::command]
pub fn get_review_words(state: State<AppState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT w.*, wr.level, wr.next_review, wr.review_count, wr.forget_count
         FROM words w
         JOIN word_reviews wr ON w.id = wr.word_id
         WHERE wr.next_review <= datetime('now')
         ORDER BY RANDOM()"
    ).map_err(|e| e.to_string())?;

    let words = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "word": row.get::<_, String>(1)?,
            "meaning": row.get::<_, Option<String>>(2)?,
            "phonetic": row.get::<_, Option<String>>(3)?,
            "example": row.get::<_, Option<String>>(4)?,
            "tags": row.get::<_, Option<String>>(5)?,
            "level": row.get::<_, i32>(7)?,
            "next_review": row.get::<_, String>(8)?,
            "review_count": row.get::<_, i32>(9)?,
            "forget_count": row.get::<_, i32>(10)?,
        }))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for w in words {
        result.push(w.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Update word review
#[tauri::command]
pub fn update_word_review(
    state: State<AppState>,
    word_id: i64,
    result_str: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let ebbinghaus = vec![1, 2, 4, 7, 15, 30];

    let (level, forget_count): (i32, i32) = conn.query_row(
        "SELECT level, forget_count FROM word_reviews WHERE word_id = ?",
        params![word_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).unwrap_or((0, 0));

    let (new_level, new_forget) = match result_str.as_str() {
        "known" => (std::cmp::min(level + 1, 5), forget_count),
        "vague" => (level, forget_count),
        _ => (std::cmp::max(level - 1, 0), forget_count + 1),
    };

    let mut days = ebbinghaus[new_level as usize];
    if result_str == "vague" {
        days = std::cmp::max(1, (days as f32 * 0.6) as i32);
    }

    conn.execute(
        &format!(
            "UPDATE word_reviews SET level = ?, forget_count = ?, next_review = datetime('now', '+{} days'), review_count = review_count + 1 WHERE word_id = ?",
            days
        ),
        params![new_level, new_forget, word_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Get memory stats
#[tauri::command]
pub fn get_memory_stats(state: State<AppState>) -> Result<MemoryStats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let total_words: i32 = conn.query_row(
        "SELECT COUNT(*) FROM words",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_reviews: i32 = conn.query_row(
        "SELECT COUNT(*) FROM word_reviews WHERE review_count > 0",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let high_forget: i32 = conn.query_row(
        "SELECT COUNT(*) FROM word_reviews WHERE forget_count >= 2",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let avg_level: f64 = conn.query_row(
        "SELECT AVG(level) FROM word_reviews",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    Ok(MemoryStats {
        total_words,
        total_reviews,
        high_forget,
        avg_level: (avg_level * 10.0).round() / 10.0,
    })
}

// Get settings
#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<std::collections::HashMap<String, String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT * FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    let mut settings = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        settings.insert(k, v);
    }

    Ok(settings)
}

// Set setting
#[tauri::command]
pub fn set_setting(
    state: State<AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        params![key, value],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Get dictionaries
#[tauri::command]
pub fn get_dictionaries(state: State<AppState>) -> Result<Vec<Dictionary>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT * FROM dictionaries ORDER BY id")
        .map_err(|e| e.to_string())?;

    let dicts = stmt.query_map([], |row| {
        Ok(Dictionary {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            category: row.get(3)?,
            icon: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for d in dicts {
        result.push(d.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Get dictionary words
#[tauri::command]
pub fn get_dictionary_words(
    state: State<AppState>,
    dictionary_id: i64,
) -> Result<Vec<DictionaryWord>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT * FROM dictionary_words WHERE dictionary_id = ? ORDER BY id"
    ).map_err(|e| e.to_string())?;

    let words = stmt.query_map(params![dictionary_id], |row| {
        Ok(DictionaryWord {
            id: row.get(0)?,
            dictionary_id: row.get(1)?,
            word: row.get(2)?,
            meaning: row.get(3)?,
            phonetic: row.get(4)?,
            example: row.get(5)?,
            difficulty: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for w in words {
        result.push(w.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Add words to plan
#[tauri::command]
pub fn add_words_to_plan(
    state: State<AppState>,
    word_ids: Vec<i64>,
) -> Result<i32, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut added = 0;

    for id in word_ids {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM words WHERE id = ?)",
            params![id],
            |row| row.get(0),
        ).unwrap_or(false);

        if !exists {
            let dw: Option<(String, Option<String>, Option<String>, Option<String>, i64)> = conn.query_row(
                "SELECT word, meaning, phonetic, example, dictionary_id FROM dictionary_words WHERE id = ?",
                params![id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            ).ok();

            if let Some((word, meaning, phonetic, example, dict_id)) = dw {
                if conn.execute(
                    "INSERT INTO words (word, meaning, phonetic, example, source, dictionary_id) VALUES (?, ?, ?, ?, 'dictionary', ?)",
                    params![word, meaning, phonetic, example, dict_id],
                ).is_ok() {
                    let word_id = conn.last_insert_rowid();
                    if conn.execute(
                        "INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime('now'))",
                        params![word_id],
                    ).is_ok() {
                        added += 1;
                    }
                }
            }
        }
    }

    Ok(added)
}

// Get Ebbinghaus data
#[tauri::command]
pub fn get_ebbinghaus_data(state: State<AppState>) -> Result<EbbinghausData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let standard = vec![56, 36, 25, 21, 18, 15];
    let mut actual = Vec::new();

    for i in 0..6 {
        let rate: Option<f64> = conn.query_row(
            "SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * SUM(CASE WHEN forget_count = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) ELSE NULL END
             FROM word_reviews WHERE level = ? AND review_count > 0",
            params![i],
            |row| row.get(0),
        ).ok();

        actual.push(rate.unwrap_or(standard[i] as f64) as i32);
    }

    Ok(EbbinghausData { standard, actual })
}

// Get learning plan
#[tauri::command]
pub fn get_learning_plan(state: State<AppState>) -> Result<Option<LearningPlan>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row(
        "SELECT * FROM learning_plans ORDER BY id DESC LIMIT 1",
        [],
        |row| {
            Ok(LearningPlan {
                id: row.get(0)?,
                title: row.get(1)?,
                daily_new_words: row.get(2)?,
                daily_review_words: row.get(3)?,
                target_dictionary_id: row.get(4)?,
                target_exam: row.get(5)?,
                daily_minutes: row.get(6)?,
            })
        },
    );

    match result {
        Ok(plan) => Ok(Some(plan)),
        Err(_) => Ok(None),
    }
}

// Save learning plan
#[tauri::command]
pub fn save_learning_plan(
    state: State<AppState>,
    plan: LearningPlan,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM learning_plans", [])
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO learning_plans (title, daily_new_words, daily_review_words, target_dictionary_id, target_exam, daily_minutes) VALUES (?, ?, ?, ?, ?, ?)",
        params![plan.title, plan.daily_new_words, plan.daily_review_words, plan.target_dictionary_id, plan.target_exam, plan.daily_minutes],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// Get CET exam years
#[tauri::command]
pub fn get_cet_exam_years(state: State<AppState>) -> Result<Vec<i32>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT DISTINCT exam_year FROM questions WHERE exam_year IS NOT NULL ORDER BY exam_year DESC"
    ).map_err(|e| e.to_string())?;

    let years = stmt.query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for y in years {
        result.push(y.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

// Get CET stats
#[tauri::command]
pub fn get_cet_stats(state: State<AppState>) -> Result<CETStats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let cet4_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM questions WHERE exam_type = 'CET4'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let cet6_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM questions WHERE exam_type = 'CET6'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let years = get_cet_exam_years(state)?;

    Ok(CETStats {
        cet4_count,
        cet6_count,
        years,
    })
}

// Get user data path
#[tauri::command]
pub fn get_user_data_path(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;

    // Create directory if not exists
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

// Initialize database with schema
pub fn init_database(db_path: &PathBuf) -> SqliteResult<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "
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
            source TEXT DEFAULT 'manual',
            dictionary_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS word_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER NOT NULL,
            level INTEGER DEFAULT 0,
            next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
            review_count INTEGER DEFAULT 0,
            forget_count INTEGER DEFAULT 0
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
        "
    )?;

    // Add columns if they don't exist (for migration)
    let _ = conn.execute("ALTER TABLE words ADD COLUMN source TEXT DEFAULT 'manual'", []);
    let _ = conn.execute("ALTER TABLE words ADD COLUMN dictionary_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE questions ADD COLUMN exam_type TEXT", []);
    let _ = conn.execute("ALTER TABLE questions ADD COLUMN exam_year INTEGER", []);

    Ok(conn)
}
