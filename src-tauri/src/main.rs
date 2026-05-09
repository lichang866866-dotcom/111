// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use english_tutor_lib::{
    init_database, AppState,
    get_questions, submit_attempt, save_mistake, get_mistakes, get_stats,
    get_words, add_word, delete_word, get_review_words, update_word_review,
    get_memory_stats, get_settings, set_setting,
    get_dictionaries, get_dictionary_words, add_words_to_plan,
    get_ebbinghaus_data, get_learning_plan, save_learning_plan,
    get_cet_exam_years, get_cet_stats, get_user_data_path,
};
use std::path::PathBuf;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            // Create directory if not exists
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("english-tutor.db");
            println!("Database path: {:?}", db_path);

            // Initialize database
            let conn = init_database(&db_path)
                .expect("Failed to initialize database");

            // Seed data if database is empty
            let count: i32 = conn.query_row(
                "SELECT COUNT(*) FROM questions",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            if count == 0 {
                println!("Seeding initial data...");
                seed_initial_data(&conn);
            }

            // Check and seed dictionaries if needed
            let dict_count: i32 = conn.query_row(
                "SELECT COUNT(*) FROM dictionaries",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let word_count: i32 = conn.query_row(
                "SELECT COUNT(*) FROM dictionary_words",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            if dict_count == 0 || word_count < 1000 {
                println!("Seeding dictionaries...");
                // Note: We would need to load the dictionary data here
                // For now, dictionaries are loaded from the frontend
            }

            app.manage(AppState {
                db: std::sync::Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_questions,
            submit_attempt,
            save_mistake,
            get_mistakes,
            get_stats,
            get_words,
            add_word,
            delete_word,
            get_review_words,
            update_word_review,
            get_memory_stats,
            get_settings,
            set_setting,
            get_dictionaries,
            get_dictionary_words,
            add_words_to_plan,
            get_ebbinghaus_data,
            get_learning_plan,
            save_learning_plan,
            get_cet_exam_years,
            get_cet_stats,
            get_user_data_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn seed_initial_data(conn: &rusqlite::Connection) {
    // Seed initial questions
    let questions = vec![
        ("vocabulary", "词汇", "The word \"ambiguous\" means:", "[\"清晰的\", \"模棱两可的\", \"明确的\", \"简单的\"]", "模棱两可的", "\"Ambiguous\" 表示意思不明确，可以有多种解释。", 2),
        ("vocabulary", "词汇", "Choose the correct synonym for \"profound\":", "[\"shallow\", \"deep\", \"simple\", \"brief\"]", "deep", "\"Profound\" 意为深刻的、深远的，与 deep 意思最接近。", 2),
        ("grammar", "语法", "She ___ to the market every morning.", "[\"go\", \"goes\", \"going\", \"gone\"]", "goes", "主语 She 是第三人称单数，一般现在时动词需加 -es。", 1),
        ("grammar", "语法", "If I ___ rich, I would buy a house.", "[\"am\", \"was\", \"were\", \"be\"]", "were", "虚拟语气中，if 从句用过去式 were（所有人称）。", 3),
        ("vocabulary", "词汇", "The ___ of the mountain was breathtaking.", "[\"view\", \"views\", \"viewing\", \"viewed\"]", "view", "此处需要名词作主语，view 为不可数/单数名词。", 1),
        ("grammar", "语法", "By the time we arrived, they ___.", "[\"left\", \"have left\", \"had left\", \"leave\"]", "had left", "By the time + 过去时间，主句用过去完成时。", 3),
        ("vocabulary", "词汇", "\"Resilient\" best describes someone who:", "[\"gives up easily\", \"recovers quickly\", \"avoids problems\", \"gets angry\"]", "recovers quickly", "\"Resilient\" 指有弹性的、能迅速从困难中恢复的。", 2),
        ("grammar", "语法", "Not only ___ late, but he also forgot his homework.", "[\"he was\", \"was he\", \"he is\", \"is he\"]", "was he", "Not only 置于句首时，句子需要部分倒装。", 3),
    ];

    for q in questions {
        let _ = conn.execute(
            "INSERT INTO questions (type, category, question, options, correct_answer, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![q.0, q.1, q.2, q.3, q.4, q.5, q.6],
        );
    }

    // Seed initial words
    let words = vec![
        ("ambiguous", "模棱两可的", "/æmˈbɪɡjuəs/", "The instructions were ambiguous and confusing."),
        ("profound", "深刻的", "/prəˈfaʊnd/", "The book had a profound effect on her."),
        ("resilient", "有弹性的", "/rɪˈzɪliənt/", "Children are often remarkably resilient."),
        ("meticulous", "一丝不苟的", "/məˈtɪkjələs/", "He was meticulous about keeping records."),
        ("ephemeral", "短暂的", "/ɪˈfemərəl/", "Fashion is ephemeral, changing with every season."),
        ("pragmatic", "务实的", "/præɡˈmætɪk/", "We need a pragmatic approach to this problem."),
        ("eloquent", "雄辩的", "/ˈeləkwənt/", "She made an eloquent speech in defense of her policy."),
        ("ubiquitous", "无处不在的", "/juːˈbɪkwɪtəs/", "Smartphones have become ubiquitous in modern life."),
    ];

    for w in words {
        if conn.execute(
            "INSERT INTO words (word, meaning, phonetic, example) VALUES (?, ?, ?, ?)",
            rusqlite::params![w.0, w.1, w.2, w.3],
        ).is_ok() {
            let word_id = conn.last_insert_rowid();
            let _ = conn.execute(
                "INSERT INTO word_reviews (word_id, next_review) VALUES (?, datetime('now'))",
                rusqlite::params![word_id],
            );
        }
    }
}
