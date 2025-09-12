const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    switch (method) {
      case 'POST':
        if (body.action === 'save_round_result') {
          const result = await sql`
            INSERT INTO player_results (user_id, round_id, round_type, points_earned, total_time, answers)
            VALUES (${body.user_id}, ${body.round_id}, ${body.round_type}, ${body.points_earned}, 
                    ${body.total_time}, ${JSON.stringify(body.answers)})
            RETURNING id
          `;

          // Обновляем общие баллы пользователя
          await sql`
            UPDATE telegram_users 
            SET total_points = total_points + ${body.points_earned},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${body.user_id}
          `;

          return res.json({ success: true, result_id: result.rows[0].id });
        }

        break;

      case 'GET':
        if (query.action === 'user_results' && query.user_id) {
          const results = await sql`
            SELECT pr.*, gr.title as round_title
            FROM player_results pr
            JOIN game_rounds gr ON pr.round_id = gr.id
            WHERE pr.user_id = ${query.user_id}
            ORDER BY pr.completed_at DESC
          `;
          return res.json(results.rows);
        }

        if (query.action === 'round_stats' && query.round_id) {
          const stats = await sql`
            SELECT 
              COUNT(*) as total_players,
              AVG(points_earned) as avg_points,
              MAX(points_earned) as max_points,
              MIN(points_earned) as min_points,
              AVG(total_time) as avg_time
            FROM player_results 
            WHERE round_id = ${query.round_id}
          `;
          return res.json(stats.rows[0]);
        }

        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Results API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
