const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'init-sothebeat-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 Начинаем инициализацию базы данных...');

    // Таблица пользователей Telegram
    await sql`
      CREATE TABLE IF NOT EXISTS telegram_users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        language_code VARCHAR(10),
        is_bot BOOLEAN DEFAULT false,
        total_points INTEGER DEFAULT 0,
        current_phase VARCHAR(50) DEFAULT 'lobby',
        team_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица раундов игры
    await sql`
      CREATE TABLE IF NOT EXISTS game_rounds (
        id SERIAL PRIMARY KEY,
        round_number INTEGER NOT NULL,
        round_type VARCHAR(50) NOT NULL, -- 'quiz', 'logic', 'survey', 'auction'
        title VARCHAR(255) NOT NULL,
        description TEXT,
        max_points INTEGER DEFAULT 200,
        time_limit INTEGER DEFAULT 300, -- в секундах
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица вопросов для квиза (раунд 1)
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        round_id INTEGER REFERENCES game_rounds(id),
        question_text TEXT NOT NULL,
        option_a VARCHAR(500),
        option_b VARCHAR(500),
        option_c VARCHAR(500),
        option_d VARCHAR(500),
        correct_answer INTEGER NOT NULL, -- 0, 1, 2, 3
        points INTEGER DEFAULT 10,
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица вопросов "Где логика?" (раунд 2)
    await sql`
      CREATE TABLE IF NOT EXISTS logic_questions (
        id SERIAL PRIMARY KEY,
        round_id INTEGER REFERENCES game_rounds(id),
        question_text TEXT NOT NULL,
        images JSONB, -- массив картинок/эмодзи
        correct_answer VARCHAR(255) NOT NULL,
        alternatives JSONB, -- массив альтернативных ответов
        points INTEGER DEFAULT 15,
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица вопросов "100 к 1" (раунд 3)
    await sql`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id SERIAL PRIMARY KEY,
        round_id INTEGER REFERENCES game_rounds(id),
        question_text TEXT NOT NULL,
        answers JSONB NOT NULL, -- [{"text": "ответ", "points": 47}, ...]
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица лотов аукциона
    await sql`
      CREATE TABLE IF NOT EXISTS auction_lots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        emoji VARCHAR(10),
        start_price INTEGER DEFAULT 200,
        current_bid INTEGER DEFAULT 0,
        winner_id BIGINT REFERENCES telegram_users(id),
        is_sold BOOLEAN DEFAULT false,
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица результатов игроков
    await sql`
      CREATE TABLE IF NOT EXISTS player_results (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES telegram_users(id),
        round_id INTEGER REFERENCES game_rounds(id),
        round_type VARCHAR(50),
        points_earned INTEGER DEFAULT 0,
        total_time INTEGER, -- время прохождения в секундах
        answers JSONB, -- детали ответов
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица команд
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        total_points INTEGER DEFAULT 0,
        member_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица ставок на аукционе
    await sql`
      CREATE TABLE IF NOT EXISTS auction_bids (
        id SERIAL PRIMARY KEY,
        lot_id INTEGER REFERENCES auction_lots(id),
        user_id BIGINT REFERENCES telegram_users(id),
        team_id VARCHAR(100) REFERENCES teams(id),
        bid_amount INTEGER NOT NULL,
        is_winning BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Настройки игры
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
      ('online_users', '0'),
      ('event_started', 'false')
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP;
    `;

    // Создаем начальные раунды
    const quizRound = await sql`
      INSERT INTO game_rounds (round_number, round_type, title, description, max_points, time_limit)
      VALUES (1, 'quiz', 'Квиз про Ballantine''s', 'Виски, достойный короны!', 200, 300)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    const logicRound = await sql`
      INSERT INTO game_rounds (round_number, round_type, title, description, max_points, time_limit)
      VALUES (2, 'logic', 'Где логика?', 'Угадай, что объединяет картинки', 200, 300)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    const surveyRound = await sql`
      INSERT INTO game_rounds (round_number, round_type, title, description, max_points, time_limit)
      VALUES (3, 'survey', '100 к 1', 'Популярные ответы барменов', 200, 300)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    // Создаем начальные лоты аукциона
    await sql`
      INSERT INTO auction_lots (name, description, emoji, start_price, order_num) VALUES 
      ('Мерч от Зернова', 'Эксклюзивный мерч от известного бармена', '🎁', 200, 1),
      ('Футболка с автографами всех спикеров BEAT 2025', 'Коллекционная футболка с автографами', '👕', 200, 2),
      ('Реклама в инстаграме BEAT', 'Кросс пост + сторис в официальном аккаунте', '📱', 200, 3),
      ('Мерч от Перука', 'Фирменные аксессуары от Перука', '🎪', 200, 4),
      ('Безлимит на коктейли на афтепати', 'Неограниченные коктейли на афтепати', '🍹', 200, 5),
      ('Сборник мерча от брендов Pernod Ricard', 'Подарочный набор от спонсора', '📦', 200, 6),
      ('Ящик разного алкоголя', 'ARARAT, Ballantines, Jameson, Havana Club и др.', '🥃', 200, 7)
      ON CONFLICT DO NOTHING;
    `;

    // Добавляем тестового пользователя
    await sql`
      INSERT INTO telegram_users (id, username, first_name, total_points) VALUES 
      (123456789, 'test_user', 'Тестовый пользователь', 100)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name;
    `;

    const userCount = await sql`SELECT COUNT(*) as count FROM telegram_users`;
    const roundsCount = await sql`SELECT COUNT(*) as count FROM game_rounds`;
    const lotsCount = await sql`SELECT COUNT(*) as count FROM auction_lots`;

    console.log('🎉 База данных успешно инициализирована!');

    return res.status(200).json({
      success: true,
      message: 'База данных успешно инициализирована',
      stats: {
        users: parseInt(userCount.rows[0].count),
        rounds: parseInt(roundsCount.rows[0].count),
        lots: parseInt(lotsCount.rows[0].count)
      }
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
