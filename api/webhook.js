const TelegramBot = require('node-telegram-bot-api');
const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Webhook endpoint ready' });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webAppUrl = process.env.WEBAPP_URL || 'https://southbeat-bot.vercel.app';
    
    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN не найден');
      return res.status(500).json({ error: 'Bot token not found' });
    }

    const bot = new TelegramBot(token);
    const { body } = req;

    console.log('Получено сообщение от Telegram:', JSON.stringify(body, null, 2));

    if (body.message) {
      const chatId = body.message.chat.id;
      const user = body.message.from;
      
      // Регистрируем или обновляем пользователя в базе данных
      await registerUser(user);
      
      if (body.message.text === '/start') {
        const keyboard = {
          inline_keyboard: [[
            {
              text: '🎯 Начать игру SotheBEAT!',
              web_app: { url: webAppUrl }
            }
          ]]
        };

        const welcomeMessage = `🎉 Добро пожаловать на BEAT 2025, ${user.first_name}!\n\n` +
          `Это интерактивный аукцион в стиле Sotheby's в мире барного искусства!\n\n` +
          `📝 Правила:\n` +
          `• 3 раунда викторин (5 минут каждый)\n` +
          `• За правильные ответы и скорость получаете баллы\n` +
          `• Максимум 200 баллов за раунд = 600 всего\n` +
          `• В финале - аукцион призов за баллы!\n\n` +
          `🤝 Можете объединяться в команды для покупки лотов\n\n` +
          `Готовы начать? Нажмите кнопку ниже! 👇`;

        await bot.sendMessage(chatId, welcomeMessage, { 
          reply_markup: keyboard,
          parse_mode: 'HTML'
        });

        console.log(`Пользователь ${user.first_name} (${user.id}) начал игру`);
      }

      if (body.message.text && body.message.text.startsWith('/join_')) {
        // Команда для присоединения к команде: /join_team123
        const teamId = body.message.text.replace('/join_', '');
        await joinTeam(user.id, teamId);
        
        await bot.sendMessage(chatId, 
          `✅ Вы успешно присоединились к команде: ${teamId}\n` +
          `Теперь вы можете объединять баллы с участниками команды!`
        );
      }

      if (body.message.text === '/profile') {
        const userProfile = await getUserProfile(user.id);
        const profileMessage = `👤 Ваш профиль:\n\n` +
          `💰 Баллы: ${userProfile.total_points}\n` +
          `👥 Команда: ${userProfile.team_id || 'Без команды'}\n` +
          `📊 Фаза: ${userProfile.current_phase}\n\n` +
          `Для игры используйте Web App кнопку выше!`;
        
        await bot.sendMessage(chatId, profileMessage);
      }
    }

    // Обрабатываем callback от Web App
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const user = body.callback_query.from;
      
      await bot.answerCallbackQuery(body.callback_query.id);
      
      if (callbackData === 'start_game') {
        await bot.sendMessage(user.id, 'Игра началась! Используйте Web App для участия.');
      }
    }

    // Увеличиваем счетчик онлайн пользователей
    await updateOnlineCount();
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ошибка webhook:', error);
    res.status(200).json({ ok: true, error: error.message });
  }
};

// Функция регистрации пользователя
async function registerUser(telegramUser) {
  try {
    const result = await sql`
      INSERT INTO telegram_users (id, username, first_name, last_name, language_code, is_bot)
      VALUES (${telegramUser.id}, ${telegramUser.username}, ${telegramUser.first_name}, 
              ${telegramUser.last_name}, ${telegramUser.language_code}, ${telegramUser.is_bot || false})
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        language_code = EXCLUDED.language_code,
        updated_at = CURRENT_TIMESTAMP
      RETURNING total_points, team_id
    `;

    console.log(`Пользователь ${telegramUser.first_name} (${telegramUser.id}) зарегистрирован/обновлен`);
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error);
  }
}

// Функция присоединения к команде
async function joinTeam(userId, teamId) {
  try {
    // Создаем команду если не существует
    await sql`
      INSERT INTO teams (id, name, member_count)
      VALUES (${teamId}, ${teamId}, 0)
      ON CONFLICT (id) DO NOTHING
    `;
    
    // Добавляем пользователя в команду
    await sql`
      UPDATE telegram_users 
      SET team_id = ${teamId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;
    
    // Обновляем счетчик участников команды
    await sql`
      UPDATE teams 
      SET member_count = (
        SELECT COUNT(*) FROM telegram_users WHERE team_id = ${teamId}
      ),
      total_points = (
        SELECT COALESCE(SUM(total_points), 0) FROM telegram_users WHERE team_id = ${teamId}
      )
      WHERE id = ${teamId}
    `;

    console.log(`Пользователь ${userId} присоединился к команде ${teamId}`);
  } catch (error) {
    console.error('Ошибка присоединения к команде:', error);
  }
}

// Функция получения профиля пользователя
async function getUserProfile(userId) {
  try {
    const result = await sql`
      SELECT * FROM telegram_users WHERE id = ${userId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    return null;
  }
}

// Обновление счетчика онлайн пользователей
async function updateOnlineCount() {
  try {
    // Получаем количество активных пользователей за последние 10 минут
    const onlineCount = await sql`
      SELECT COUNT(DISTINCT id) as count 
      FROM telegram_users 
      WHERE updated_at > NOW() - INTERVAL '10 minutes'
    `;

    await sql`
      UPDATE game_config 
      SET value = ${JSON.stringify(onlineCount.rows[0].count)}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE key = 'online_users'
    `;
  } catch (error) {
    console.error('Ошибка обновления счетчика онлайн:', error);
  }
}
