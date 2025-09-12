import { sql } from '@vercel/postgres';

export const createTables = async () => {
  try {
    // Таблица пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        current_phase VARCHAR(50) DEFAULT 'lobby',
        team_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица игровых сессий
    await sql`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        round_number INTEGER,
        round_type VARCHAR(50),
        points_earned INTEGER DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answers JSONB,
        time_spent INTEGER
      );
    `;

    // Таблица команд
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица участников команд
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(100) REFERENCES teams(id),
        user_id BIGINT REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, user_id)
      );
    `;

    // Таблица настроек игры
    await sql`
      CREATE TABLE IF NOT EXISTS game_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Вставляем начальные настройки
    await sql`
      INSERT INTO game_config (key, value) VALUES 
      ('current_phase', '"lobby"'),
      ('phases_status', '{"quiz": false, "logic": false, "contact": false, "survey": false, "auction": false}'),
      ('online_users', '0')
      ON CONFLICT (key) DO NOTHING;
    `;

    console.log('✅ Таблицы созданы успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
    return false;
  }
};
