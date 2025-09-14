const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    console.log(`Users API: ${method}`, body || query);

    switch (method) {
      case 'GET':
        if (query.action === 'profile' && query.user_id) {
          console.log(`🔍 Looking for user: ${query.user_id}`);
          
          const user = await sql`
            SELECT * FROM telegram_users WHERE id = ${query.user_id}
          `;
          
          console.log(`📋 Found ${user.rows.length} users`);
          
          if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          return res.json(user.rows[0]);
        }
        
        if (query.action === 'leaderboard') {
          const users = await sql`
            SELECT id, first_name, username, total_points, team_id
            FROM telegram_users 
            ORDER BY total_points DESC 
            LIMIT 50
          `;
          return res.json(users.rows);
        }
        
        if (query.action === 'all' && query.admin_token === 'a') {
          const users = await sql`
            SELECT id, username, first_name, last_name, total_points, current_phase, team_id, created_at
            FROM telegram_users 
            ORDER BY total_points DESC
          `;
          return res.json(users.rows);
        }
        
        break;

      case 'POST':
        // НОВЫЙ ACTION для App.jsx
        if (body.action === 'register') {
          console.log('📝 Registering user with new action:', body.user_data);
          
          const userData = body.user_data;
          const result = await sql`
            INSERT INTO telegram_users (id, username, first_name, last_name, language_code)
            VALUES (
              ${userData.id}, 
              ${userData.username || ''}, 
              ${userData.first_name || 'Пользователь'}, 
              ${userData.last_name || ''}, 
              ${userData.language_code || 'ru'}
            )
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              language_code = EXCLUDED.language_code,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `;
          
          console.log('✅ User registered/updated:', result.rows[0]);
          return res.json(result.rows[0]);
        }

        // СТАРЫЙ ACTION для обратной совместимости
        if (body.action === 'register_user') {
          const result = await sql`
            INSERT INTO telegram_users (id, username, first_name, last_name, language_code)
            VALUES (${body.id}, ${body.username}, ${body.first_name}, ${body.last_name}, ${body.language_code})
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `;
          return res.json(result.rows[0]);
        }

        if (body.action === 'update_points') {
          const result = await sql`
            UPDATE telegram_users 
            SET total_points = total_points + ${body.points}, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${body.user_id}
            RETURNING total_points
          `;
          
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          return res.json({ 
            success: true, 
            new_total: result.rows[0].total_points 
          });
        }

        if (body.action === 'join_team') {
          // Создаем команду если не существует
          await sql`
            INSERT INTO teams (id, name, member_count)
            VALUES (${body.team_id}, ${body.team_id}, 0)
            ON CONFLICT (id) DO NOTHING
          `;
          
          // Добавляем пользователя в команду
          await sql`
            UPDATE telegram_users 
            SET team_id = ${body.team_id}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${body.user_id}
          `;
          
          // Обновляем счетчик участников команды
          await sql`
            UPDATE teams 
            SET member_count = (
              SELECT COUNT(*) FROM telegram_users WHERE team_id = ${body.team_id}
            )
            WHERE id = ${body.team_id}
          `;
          
          return res.json({ success: true, team_id: body.team_id });
        }

        if (body.action === 'admin_update_points' && body.admin_token === 'a') {
          const result = await sql`
            UPDATE telegram_users 
            SET total_points = total_points + ${body.points}, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${body.user_id}
            RETURNING total_points, first_name
          `;
          
          return res.json({ 
            success: true, 
            user: result.rows[0]
          });
        }

        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
