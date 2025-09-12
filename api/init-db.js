import pg from 'pg';

const { Pool } = pg;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'init-sothebeat-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Начинаем инициализацию базы данных...');

    // Создаем таблицы
    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        round_number INTEGER,
        round_type VARCHAR(50),
        points_earned INTEGER DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answers JSONB,
        time_spent INTEGER
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Вставляем начальные настройки
    await pool.query(`
      INSERT INTO game_config (key, value) VALUES 
      ('current_phase', '"lobby"'),
      ('phases_status', '{"quiz": false, "logic": false, "contact": false, "survey": false, "auction": false}'),
      ('online_users', '0')
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Добавляем тестовых пользователей
    await pool.query(`
      INSERT INTO users (id, username, first_name, total_points) VALUES 
      (1, 'lina_bar', 'Lina', 500),
      (2, 'dmitriy_mix', 'Dmitriy', 180),
      (3, 'lachin_beat', 'Lachin', 50),
      (4, 'suhrab_pro', 'Suhrab', 50)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        total_points = EXCLUDED.total_points,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Проверяем результат
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const configCount = await pool.query('SELECT COUNT(*) as count FROM game_config');
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    await pool.end();

    console.log('🎉 База данных успешно инициализирована!');

    return res.status(200).json({
      success: true,
      message: 'База данных успешно инициализирована',
      tables: tablesCheck.rows.map(row => row.table_name),
      users: parseInt(userCount.rows[0].count),
      config: parseInt(configCount.rows[0].count)
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    await pool.end();
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
