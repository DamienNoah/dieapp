import BetterSqlite3 from 'better-sqlite3';
import path from 'path';

export class Database {
  private static instance: Database;
  private db: BetterSqlite3.Database;

  private constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'lifespan.db');
    this.db = new BetterSqlite3(dbPath || defaultPath);
    this.db.pragma('journal_mode = WAL');
  }

  static getInstance(dbPath?: string): Database {
    if (!Database.instance) {
      Database.instance = new Database(dbPath);
    }
    return Database.instance;
  }

  static resetInstance(): void {
    if (Database.instance) {
      Database.instance.close();
      Database.instance = undefined as any;
    }
  }

  run(sql: string, params: any[] = []): BetterSqlite3.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  get<T>(sql: string, params: any[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T>(sql: string, params: any[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }

  // Initialize database schema
  initializeSchema(): void {
    this.exec(`
      -- User Profiles Table
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        age INTEGER NOT NULL,
        sex TEXT NOT NULL,
        ethnicity TEXT,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        body_fat_percentage REAL,
        medical_history TEXT DEFAULT '{}',
        lifestyle_factors TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Biomarkers Table
      CREATE TABLE IF NOT EXISTS biomarkers (
        biomarker_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        clinical_range_min REAL NOT NULL,
        clinical_range_max REAL NOT NULL,
        optimal_range_min REAL NOT NULL,
        optimal_range_max REAL NOT NULL,
        risk_weight REAL NOT NULL,
        category TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Index for faster biomarker queries
      CREATE INDEX IF NOT EXISTS idx_biomarkers_user_timestamp
        ON biomarkers(user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_biomarkers_user_name
        ON biomarkers(user_id, name);

      -- Habits Table
      CREATE TABLE IF NOT EXISTS habits (
        habit_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        target_value REAL NOT NULL,
        target_unit TEXT NOT NULL,
        frequency TEXT NOT NULL,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        points_per_completion INTEGER DEFAULT 10,
        streak_bonus_multiplier REAL DEFAULT 1.5,
        streak_break_penalty INTEGER DEFAULT 5,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Habit Logs Table
      CREATE TABLE IF NOT EXISTS habit_logs (
        log_id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        completed INTEGER NOT NULL,
        actual_value REAL,
        notes TEXT,
        points_earned INTEGER DEFAULT 0,
        logged_at TEXT NOT NULL,
        FOREIGN KEY (habit_id) REFERENCES habits(habit_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Index for habit logs
      CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
        ON habit_logs(habit_id, logged_at DESC);
      CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
        ON habit_logs(user_id, logged_at DESC);

      -- Points Table
      CREATE TABLE IF NOT EXISTS points (
        user_id TEXT PRIMARY KEY,
        current_points INTEGER DEFAULT 0,
        lifetime_points INTEGER DEFAULT 0,
        level TEXT DEFAULT 'novice',
        level_progress REAL DEFAULT 0,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Points Transactions Table
      CREATE TABLE IF NOT EXISTS points_transactions (
        transaction_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Index for points transactions
      CREATE INDEX IF NOT EXISTS idx_points_transactions_user_date
        ON points_transactions(user_id, created_at DESC);

      -- Rewards Table
      CREATE TABLE IF NOT EXISTS rewards (
        reward_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        cost INTEGER NOT NULL,
        available INTEGER DEFAULT 1,
        required_level TEXT,
        image_url TEXT
      );

      -- User Rewards Table (redeemed rewards)
      CREATE TABLE IF NOT EXISTS user_rewards (
        user_reward_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        redeemed_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE
      );

      -- Lifespan Predictions Table
      CREATE TABLE IF NOT EXISTS lifespan_predictions (
        prediction_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        predicted_lifespan_years REAL NOT NULL,
        biological_age REAL NOT NULL,
        chronological_age INTEGER NOT NULL,
        age_difference REAL NOT NULL,
        confidence_interval_low REAL NOT NULL,
        confidence_interval_high REAL NOT NULL,
        risk_hotspots TEXT DEFAULT '[]',
        recommended_actions TEXT DEFAULT '[]',
        calculated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      );

      -- Index for lifespan predictions
      CREATE INDEX IF NOT EXISTS idx_lifespan_predictions_user_date
        ON lifespan_predictions(user_id, calculated_at DESC);

      -- Achievements Table
      CREATE TABLE IF NOT EXISTS achievements (
        achievement_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        criteria TEXT NOT NULL,
        points_reward INTEGER DEFAULT 0
      );

      -- User Achievements Table
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_achievement_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        earned_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE
      );
    `);
  }

  // Transaction helper
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
