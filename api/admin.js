const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
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

        if (query.action === 'stats') {
          return await getGameStats(res);
        }

        if (query.action === 'rounds') {
          const rounds = await sql`
            SELECT r.*, 
              (SELECT COUNT(*) FROM quiz_questions WHERE round_id = r.id) as quiz_count,
              (SELECT COUNT(*) FROM logic_questions WHERE round_id = r.id) as logic_count,
              (SELECT COUNT(*) FROM survey_questions WHERE round_id = r.id) as survey_count
            FROM game_rounds r
            ORDER BY r.round_number
          `;
          return res.json(rounds.rows);
        }

        if (query.action === 'auction_lots') {
          const lots = await sql`
            SELECT l.*, 
              (SELECT COUNT(*) FROM auction_bids WHERE lot_id = l.id) as bid_count,
              (SELECT MAX(bid_amount) FROM auction_bids WHERE lot_id = l.id) as highest_bid
            FROM auction_lots l
            ORDER BY l.order_num
          `;
          return res.json(lots.rows);
        }
        
        break;

      case 'POST':
        if (body.action === 'updatePhase') {
          return await updatePhase(res, body.phase);
        }
        
        if (body.action === 'togglePhase') {
          return await togglePhase(res, body.phase);
        }
        
        if (body.action === 'updateUserPoints') {
          return await updateUserPoints(res, body.user_id, body.points);
        }

        if (body.action === 'start_round') {
          await sql`
            UPDATE game_rounds 
            SET is_active = true 
            WHERE id = ${body.round_id}
          `;
          return res.json({ success: true });
        }

        if (body.action === 'stop_round') {
          await sql`
            UPDATE game_rounds 
            SET is_active = false 
            WHERE id = ${body.round_id}
          `;
          return res.json({ success: true });
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
};

async function getGameStatus(res) {
  const config = await sql`SELECT key, value FROM game_config`;
  
  const gameState = {
    currentPhase: 'lobby',
    phases: { quiz: false, logic: false, contact: false, survey: false, auction: false },
    onlineUsers: 0,
    totalRegistered: 0,
    eventStarted: false,
    lastUpdated: new Date().toISOString()
  };

  config.rows.forEach(row => {
    if (row.key === 'current_phase') {
      gameState.currentPhase = JSON.parse(row.value);
    } else if (row.key === 'phases_status') {
      gameState.phases = JSON.parse(row.value);
    } else if (row.key === 'online_users') {
      gameState.onlineUsers = JSON.parse(row.value);
    } else if (row.key === 'event_started') {
      gameState.eventStarted = JSON.parse(row.value);
    }
  });

  const userCount = await sql`SELECT COUNT(*) as count FROM telegram_users`;
  gameState.totalRegistered = parseInt(userCount.rows[0].count);

  return res.json(gameState);
}

async function getLeaderboard(res) {
  const users = await sql`
    SELECT first_name as name, username, total_points as points, team_id
    FROM telegram_users 
    ORDER BY total_points DESC 
    LIMIT 10
  `;
  
  const leaderboard = users.rows.map((user, index) => ({
    rank: index + 1,
    name: user.name || user.username,
    points: user.points,
    team: user.team_id
  }));
  
  return res.json(leaderboard);
}

async function getParticipants(res) {
  const users = await sql`
    SELECT id, username, first_name as name, total_points as points, current_phase, team_id, created_at
    FROM telegram_users 
    ORDER BY total_points DESC
  `;
  
  return res.json(users.rows);
}

async function getGameStats(res) {
  const totalUsers = await sql`SELECT COUNT(*) as count FROM telegram_users`;
  const totalResults = await sql`SELECT COUNT(*) as count FROM player_results`;
  const totalTeams = await sql`SELECT COUNT(*) as count FROM teams WHERE member_count > 0`;
  const avgPoints = await sql`SELECT AVG(total_points) as avg FROM telegram_users WHERE total_points > 0`;
  
  const roundStats = await sql`
    SELECT 
      gr.title,
      gr.round_type,
      COUNT(pr.id) as participants,
      AVG(pr.points_earned) as avg_points
    FROM game_rounds gr
    LEFT JOIN player_results pr ON gr.id = pr.round_id
    GROUP BY gr.id, gr.title, gr.round_type
    ORDER BY gr.round_number
  `;

  return res.json({
    total_users: parseInt(totalUsers.rows[0].count),
    total_results: parseInt(totalResults.rows[0].count),
    total_teams: parseInt(totalTeams.rows[0].count),
    avg_points: parseFloat(avgPoints.rows[0].avg || 0).toFixed(1),
    round_stats: roundStats.rows
  });
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
  const current = await sql`SELECT value FROM game_config WHERE key = 'phases_status'`;
  const phases = JSON.parse(current.rows[0].value);
  
  phases[phase] = !phases[phase];
  
  await sql`
    UPDATE game_config 
    SET value = ${JSON.stringify(phases)}, updated_at = CURRENT_TIMESTAMP
    WHERE key = 'phases_status'
  `;
  
  return res.json({ success: true, phases });
}

async function updateUserPoints(res, userId, points) {
  await sql`
    UPDATE telegram_users 
    SET total_points = total_points + ${points}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  
  return res.json({ success: true });
}
