import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { method, body } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    if (method === 'POST' && body.action === 'init') {
      // Инициализация базы данных
      await initDatabase();
      return res.json({ success: true, message: 'Database initialized' });
    }

    if (method === 'GET' && req.query.action === 'test') {
      // Тест подключения к базе
      const result = await sql`SELECT NOW() as current_time`;
      return res.json({ 
        success: true, 
        message: 'Database connected', 
        time: result.rows[0].current_time 
      });
    }

    res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Database API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function initDatabase() {
  // Создаем таблицы
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

  // Добавляем тестовых пользователей
  await sql`
    INSERT INTO users (id, username, first_name, total_points) VALUES 
    (1, 'lina_bar', 'Lina', 500),
    (2, 'dmitriy_mix', 'Dmitriy', 180),
    (3, 'lachin_beat', 'Lachin', 50),
    (4, 'suhrab_pro', 'Suhrab', 50)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      total_points = EXCLUDED.total_points;
  `;

  console.log('✅ База данных инициализирована');
}
