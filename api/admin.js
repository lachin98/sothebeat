import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Проверка токена
  const adminToken = query.token || body.token;
  if (adminToken !== 'a') {
    return res.status(401).json({ error: 'Invalid admin token' });
  }

  try {
    switch (method) {
      case 'GET':
        if (query.action === 'status') {
          return await getGameStatus(res);
        }
        
        if (query.action === 'leaderboard') {
          return await getLeaderboard(res);
        }
        
        if (query.action === 'participants') {
          return await getParticipants(res);
        }
        
        break;

      case 'POST':
        if (body.action === 'updatePhase') {
          return await updatePhase(res, body.phase);
        }
        
        if (body.action === 'togglePhase') {
          return await togglePhase(res, body.phase);
        }
        
        if (body.action === 'updatePoints') {
          return await updateUserPoints(res, body.name, body.points);
        }
        
        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getGameStatus(res) {
  const config = await sql`SELECT key, value FROM game_config WHERE key IN ('current_phase', 'phases_status', 'online_users')`;
  
  const gameState = {
    currentPhase: 'lobby',
    phases: { quiz: false, logic: false, contact: false, survey: false, auction: false },
    onlineUsers: 0,
    totalRegistered: 0,
    lastUpdated: new Date().toISOString()
  };

  // Парсим конфиг из базы
  config.rows.forEach(row => {
    if (row.key === 'current_phase') {
      gameState.currentPhase = JSON.parse(row.value);
    } else if (row.key === 'phases_status') {
      gameState.phases = JSON.parse(row.value);
    } else if (row.key === 'online_users') {
      gameState.onlineUsers = JSON.parse(row.value);
    }
  });

  // Считаем общее количество пользователей
  const userCount = await sql`SELECT COUNT(*) as count FROM users`;
  gameState.totalRegistered = parseInt(userCount.rows[0].count);

  return res.json(gameState);
}

async function getLeaderboard(res) {
  const users = await sql`
    SELECT first_name as name, total_points as points 
    FROM users 
    ORDER BY total_points DESC 
    LIMIT 10
  `;
  
  const leaderboard = users.rows.map((user, index) => ({
    rank: index + 1,
    name: user.name,
    points: user.points
  }));
  
  return res.json(leaderboard);
}

async function getParticipants(res) {
  const users = await sql`
    SELECT id, username, first_name as name, total_points as points 
    FROM users 
    ORDER BY total_points DESC
  `;
  
  return res.json(users.rows);
}

async function updatePhase(res, phase) {
  await sql`
    UPDATE game_config 
    SET value = ${JSON.stringify(phase)}, updated_at = CURRENT_TIMESTAMP
    WHERE key = 'current_phase'
  `;
  
  return res.json({ success: true, phase });
}

async function togglePhase(res, phase) {
  // Получаем текущее состояние фаз
  const current = await sql`SELECT value FROM game_config WHERE key = 'phases_status'`;
  const phases = JSON.parse(current.rows[0].value);
  
  // Переключаем фазу
  phases[phase] = !phases[phase];
  
  // Сохраняем обновленное состояние
  await sql`
    UPDATE game_config 
    SET value = ${JSON.stringify(phases)}, updated_at = CURRENT_TIMESTAMP
    WHERE key = 'phases_status'
  `;
  
  return res.json({ success: true, phases });
}

async function updateUserPoints(res, userName, points) {
  await sql`
    UPDATE users 
    SET total_points = total_points + ${points}, updated_at = CURRENT_TIMESTAMP
    WHERE first_name = ${userName}
  `;
  
  return res.json({ success: true });
}
