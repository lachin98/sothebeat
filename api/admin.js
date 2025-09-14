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
    console.log(`Admin API: ${method} ${JSON.stringify(body || query)}`);

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
        
        break;

      case 'POST':
        if (body.action === 'updatePhase') {
          console.log(`Updating phase to: ${body.phase}`);
          return await updatePhase(res, body.phase);
        }
        
        if (body.action === 'togglePhase') {
          console.log(`Toggling phase: ${body.phase}`);
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
          console.log(`Started round ${body.round_id}`);
          return res.json({ success: true });
        }

        if (body.action === 'stop_round') {
          await sql`
            UPDATE game_rounds 
            SET is_active = false 
            WHERE id = ${body.round_id}
          `;
          console.log(`Stopped round ${body.round_id}`);
          return res.json({ success: true });
        }

        // Полный сброс игры
        if (body.action === 'full_reset') {
          return await fullGameReset(res);
        }
        
        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Полный сброс игры - только пользователи, результаты, аукцион, фаза
async function fullGameReset(res) {
  console.log('🔄 Starting FULL GAME RESET...');
  
  try {
    // Считаем что было до сброса
    const usersBefore = await sql`SELECT COUNT(*) as count FROM telegram_users`;
    const resultsBefore = await sql`SELECT COUNT(*) as count FROM player_results`;
    const bidsBefore = await sql`SELECT COUNT(*) as count FROM auction_bids`;
    const teamsBefore = await sql`SELECT COUNT(*) as count FROM teams`;

    // 1. 🗑️ Удаляем всех пользователей
    console.log('1️⃣ Deleting all users...');
    await sql`DELETE FROM telegram_users`;

    // 2. 🗑️ Удаляем все результаты игр
    console.log('2️⃣ Deleting all game results...');
    await sql`DELETE FROM player_results`;

    // 3. 🗑️ Очищаем аукционные ставки
    console.log('3️⃣ Clearing auction bids...');
    await sql`DELETE FROM auction_bids`;

    // 4. 🗑️ Очищаем команды (неиспользуемые)
    console.log('4️⃣ Clearing teams...');
    await sql`DELETE FROM teams`;

    // 5. 🔄 Сбрасываем лоты аукциона
    console.log('5️⃣ Resetting auction lots...');
    await sql`
      UPDATE auction_lots 
      SET 
        is_active = false,
        is_completed = false,
        current_price = 0,
        winner_user_id = NULL,
        winner_name = NULL,
        auction_started_at = NULL,
        auction_ends_at = NULL
    `;

    // 6. 🏠 Сбрасываем игровые состояния на лобби
    console.log('6️⃣ Resetting game phase to lobby...');
    await sql`DELETE FROM game_config`;
    
    // Устанавливаем начальные состояния
    await sql`
      INSERT INTO game_config (key, value, updated_at) VALUES 
      ('current_phase', '"lobby"', CURRENT_TIMESTAMP),
      ('phases_status', '{"quiz": false, "logic": false, "survey": false, "auction": false}', CURRENT_TIMESTAMP),
      ('online_users', '0', CURRENT_TIMESTAMP),
      ('event_started', 'false', CURRENT_TIMESTAMP)
    `;

    // 7. ⏹️ Деактивируем все раунды
    console.log('7️⃣ Deactivating all rounds...');
    await sql`UPDATE game_rounds SET is_active = false`;

    // ✅ ВОПРОСЫ НЕ ТРОГАЕМ! Таблицы quiz_questions, logic_questions, survey_questions остаются целыми!

    // Собираем статистику
    const stats = {
      users_deleted: parseInt(usersBefore.rows[0].count),
      results_deleted: parseInt(resultsBefore.rows[0].count),
      auction_bids_deleted: parseInt(bidsBefore.rows[0].count),
      teams_deleted: parseInt(teamsBefore.rows[0].count),
      auction_lots_reset: true,
      game_phase_reset: 'lobby',
      rounds_deactivated: true,
      questions_preserved: '✅ ВСЕ ВОПРОСЫ СОХРАНЕНЫ'
    };

    console.log('✅ FULL GAME RESET COMPLETE:', stats);
    
    return res.json({
      success: true,
      message: 'Игра сброшена для нового мероприятия',
      stats
    });
    
  } catch (error) {
    console.error('❌ Error in full game reset:', error);
    throw error;
  }
}

async function getGameStatus(res) {
  try {
    const config = await sql`SELECT key, value FROM game_config`;
    
    const gameState = {
      currentPhase: 'lobby',
      phases: { quiz: false, logic: false, survey: false, auction: false },
      onlineUsers: 0,
      totalRegistered: 0,
      eventStarted: false,
      lastUpdated: new Date().toISOString()
    };

    config.rows.forEach(row => {
      if (row.key === 'current_phase') {
        gameState.currentPhase = safeJSONParse(row.value, 'lobby');
      } else if (row.key === 'phases_status') {
        const phases = safeJSONParse(row.value, { quiz: false, logic: false, survey: false, auction: false });
        delete phases.contact;
        gameState.phases = phases;
      } else if (row.key === 'online_users') {
        gameState.onlineUsers = safeJSONParse(row.value, 0);
      } else if (row.key === 'event_started') {
        gameState.eventStarted = safeJSONParse(row.value, false);
      }
    });

    const userCount = await sql`SELECT COUNT(*) as count FROM telegram_users`;
    gameState.totalRegistered = parseInt(userCount.rows[0].count);

    console.log(`Current game status: ${JSON.stringify(gameState)}`);
    return res.json(gameState);
  } catch (error) {
    console.error('Error getting game status:', error);
    throw error;
  }
}

async function updatePhase(res, phase) {
  try {
    console.log(`Updating current_phase to: ${phase}`);
    
    const existing = await sql`SELECT key FROM game_config WHERE key = 'current_phase'`;
    
    if (existing.rows.length === 0) {
      await sql`
        INSERT INTO game_config (key, value, updated_at)
        VALUES ('current_phase', ${JSON.stringify(phase)}, CURRENT_TIMESTAMP)
      `;
      console.log(`Created new current_phase record: ${phase}`);
    } else {
      await sql`
        UPDATE game_config 
        SET value = ${JSON.stringify(phase)}, updated_at = CURRENT_TIMESTAMP
        WHERE key = 'current_phase'
      `;
      console.log(`Updated current_phase record: ${phase}`);
    }
    
    const verification = await sql`SELECT value FROM game_config WHERE key = 'current_phase'`;
    const newValue = safeJSONParse(verification.rows[0].value, 'lobby');
    console.log(`Verification - new value: ${newValue}`);
    
    return res.json({ success: true, phase: newValue });
  } catch (error) {
    console.error('Error updating phase:', error);
    throw error;
  }
}

async function togglePhase(res, phase) {
  try {
    console.log(`Toggling phase: ${phase}`);
    
    const current = await sql`SELECT value FROM game_config WHERE key = 'phases_status'`;
    let phases;
    
    if (current.rows.length === 0) {
      phases = { quiz: false, logic: false, survey: false, auction: false };
    } else {
      phases = safeJSONParse(current.rows[0].value, { quiz: false, logic: false, survey: false, auction: false });
      delete phases.contact;
    }
    
    if (['quiz', 'logic', 'survey', 'auction'].includes(phase)) {
      phases[phase] = !phases[phase];
    }
    
    console.log(`New phases state:`, phases);
    
    if (current.rows.length === 0) {
      await sql`
        INSERT INTO game_config (key, value, updated_at)
        VALUES ('phases_status', ${JSON.stringify(phases)}, CURRENT_TIMESTAMP)
      `;
    } else {
      await sql`
        UPDATE game_config 
        SET value = ${JSON.stringify(phases)}, updated_at = CURRENT_TIMESTAMP
        WHERE key = 'phases_status'
      `;
    }
    
    console.log(`Toggled phase ${phase} to ${phases[phase]}`);
    return res.json({ success: true, phases });
  } catch (error) {
    console.error('Error toggling phase:', error);
    throw error;
  }
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

async function updateUserPoints(res, userId, points) {
  await sql`
    UPDATE telegram_users 
    SET total_points = total_points + ${points}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
  
  return res.json({ success: true });
}
