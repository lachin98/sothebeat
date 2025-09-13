const { sql } = require('@vercel/postgres');

// Безопасный JSON парсер
function safeJSONParse(value, fallback = null) {
  try {
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    
    if (typeof value === 'string') {
      if (value.startsWith('{') || value.startsWith('[')) {
        return JSON.parse(value);
      }
      return JSON.parse(`"${value}"`);
    }
    
    return fallback;
  } catch (error) {
    console.log(`JSON parse error for value "${value}":`, error.message);
    return fallback;
  }
}

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
        currentPhase = safeJSONParse(row.value, 'lobby');
      } else if (row.key === 'phases_status') {
        phases = safeJSONParse(row.value, { quiz: false, logic: false, contact: false, survey: false, auction: false });
      }
    });

    const serverTime = new Date().toISOString();

    console.log(`Game phase API: currentPhase=${currentPhase}, phases=${JSON.stringify(phases)}`);

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
