const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await sql`
      SELECT key, value FROM game_config 
      WHERE key IN ('current_phase', 'phases_status')
    `;
    
    let currentPhase = 'lobby';
    let phases = { quiz: false, logic: false, contact: false, survey: false, auction: false };

    config.rows.forEach(row => {
      if (row.key === 'current_phase') {
        currentPhase = JSON.parse(row.value);
      } else if (row.key === 'phases_status') {
        phases = JSON.parse(row.value);
      }
    });

    // Добавляем информацию о времени обновления
    const serverTime = new Date().toISOString();

    return res.json({
      currentPhase,
      phases,
      serverTime,
      success: true
    });

  } catch (error) {
    console.error('Ошибка получения фазы игры:', error);
    return res.status(500).json({
      error: 'Ошибка сервера',
      currentPhase: 'lobby',
      phases: { quiz: false, logic: false, contact: false, survey: false, auction: false },
      success: false
    });
  }
};
