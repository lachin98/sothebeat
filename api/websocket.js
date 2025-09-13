const { sql } = require('@vercel/postgres');

// Хранилище активных соединений
const connections = new Map();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Server-Sent Events для реального времени
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const clientId = Date.now() + Math.random().toString(36);
    
    // Добавляем соединение
    connections.set(clientId, res);
    
    // Отправляем текущую фазу при подключении
    try {
      const currentState = await getCurrentGameState();
      res.write(`data: ${JSON.stringify({
        type: 'initial_state',
        ...currentState
      })}\n\n`);
    } catch (error) {
      console.error('Ошибка получения начального состояния:', error);
    }

    // Очищаем соединение при отключении
    req.on('close', () => {
      connections.delete(clientId);
    });

    // Heartbeat каждые 30 секунд
    const heartbeat = setInterval(() => {
      if (connections.has(clientId)) {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

  } else if (req.method === 'POST') {
    // Обновление состояния от админа
    const { type, data, admin_token } = req.body;
    
    if (admin_token !== 'a') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      if (type === 'phase_update') {
        await updateGamePhase(data.phase);
        broadcastToAll({
          type: 'phase_changed',
          phase: data.phase,
          timestamp: Date.now()
        });
      } else if (type === 'phase_toggle') {
        await togglePhaseStatus(data.phase);
        const newState = await getCurrentGameState();
        broadcastToAll({
          type: 'phases_updated',
          phases: newState.phases,
          timestamp: Date.now()
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка обновления состояния:', error);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

// Функции для работы с БД
async function getCurrentGameState() {
  const config = await sql`SELECT key, value FROM game_config`;
  
  const state = {
    currentPhase: 'lobby',
    phases: { quiz: false, logic: false, contact: false, survey: false, auction: false },
    onlineUsers: 0,
    lastUpdated: new Date().toISOString()
  };

  config.rows.forEach(row => {
    if (row.key === 'current_phase') {
      state.currentPhase = JSON.parse(row.value);
    } else if (row.key === 'phases_status') {
      state.phases = JSON.parse(row.value);
    } else if (row.key === 'online_users') {
      state.onlineUsers = JSON.parse(row.value);
    }
  });

  return state;
}

async function updateGamePhase(phase) {
  await sql`
    UPDATE game_config 
    SET value = ${JSON.stringify(phase)}, updated_at = CURRENT_TIMESTAMP
    WHERE key = 'current_phase'
  `;
}

async function togglePhaseStatus(phase) {
  const current = await sql`SELECT value FROM game_config WHERE key = 'phases_status'`;
  const phases = JSON.parse(current.rows[0].value);
  
  phases[phase] = !phases[phase];
  
  await sql`
    UPDATE game_config 
    SET value = ${JSON.stringify(phases)}, updated_at = CURRENT_TIMESTAMP
    WHERE key = 'phases_status'
  `;
}

// Отправка сообщений всем подключенным клиентам
function broadcastToAll(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach((res, clientId) => {
    try {
      res.write(message);
    } catch (error) {
      // Удаляем неактивные соединения
      connections.delete(clientId);
    }
  });
}
