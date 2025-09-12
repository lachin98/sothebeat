const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Проверяем статус базы данных...');

    // Проверяем подключение
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log('✅ Подключение к БД работает');
    
    // Проверяем существование таблиц
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `;

    const tables = tablesResult.rows.map(row => row.table_name);
    const isInitialized = tables.includes('users') && tables.includes('game_config');

    let stats = {};
    if (isInitialized) {
      try {
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        const configCount = await sql`SELECT COUNT(*) as count FROM game_config`;
        
        stats = {
          users: parseInt(userCount.rows[0].count),
          config_entries: parseInt(configCount.rows[0].count)
        };
      } catch (statsError) {
        console.log('⚠️ Ошибка получения статистики:', statsError.message);
        stats = { error: 'Could not fetch stats' };
      }
    }

    console.log('📊 Статус БД получен успешно');

    return res.status(200).json({
      connected: true,
      initialized: isInitialized,
      server_time: timeResult.rows[0].current_time,
      tables: tables,
      stats: stats,
      postgres_url_exists: !!process.env.POSTGRES_URL
    });

  } catch (error) {
    console.error('❌ Ошибка проверки БД:', error);
    return res.status(500).json({
      connected: false,
      error: error.message,
      postgres_url_exists: !!process.env.POSTGRES_URL,
      env_check: {
        has_postgres_url: !!process.env.POSTGRES_URL,
        postgres_url_length: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0
      }
    });
  }
};
