const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'fix-db-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔧 Исправляем поврежденные данные в game_config...');

    // Удаляем все поврежденные записи
    await sql`DELETE FROM game_config`;
    console.log('Удалены все записи из game_config');

    // Создаем правильные записи с нуля
    await sql`
      INSERT INTO game_config (key, value, updated_at) VALUES 
      ('current_phase', '"lobby"', CURRENT_TIMESTAMP),
      ('phases_status', '{"quiz":false,"logic":false,"contact":false,"survey":false,"auction":false}', CURRENT_TIMESTAMP),
      ('online_users', '0', CURRENT_TIMESTAMP)
    `;
    console.log('Созданы новые правильные записи');

    // Проверяем что получилось
    const verification = await sql`SELECT key, value FROM game_config`;
    console.log('Проверка:', verification.rows);

    return res.json({
      success: true,
      message: 'База данных исправлена',
      records: verification.rows
    });

  } catch (error) {
    console.error('❌ Ошибка исправления БД:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
