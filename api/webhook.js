const TelegramBot = require("node-telegram-bot-api");
const { sql } = require("@vercel/postgres");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") {
    return res
      .status(200)
      .json({ ok: true, message: "Webhook endpoint ready" });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webAppUrl =
      process.env.WEBAPP_URL || "https://southbeat-bot.vercel.app";

    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN не найден");
      return res.status(500).json({ error: "Bot token not found" });
    }

    const bot = new TelegramBot(token);
    const { body } = req;

    console.log(
      "Получено сообщение от Telegram:",
      JSON.stringify(body, null, 2)
    );

    if (body.message) {
      const chatId = body.message.chat.id;
      const user = body.message.from;

      // Регистрируем пользователя
      await registerUser(user);

      if (body.message.text === "/start") {
        // Создаем простую кнопку-ссылку
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "🎯 Начать игру SotheBEAT!",
                url: webAppUrl,
              },
            ],
          ],
        };

        const welcomeMessage =
          `🎉 Добро пожаловать на BEAT 2025, ${user.first_name}!\n\n` +
          `Это интерактивный аукцион в стиле Sotheby's в мире барного искусства!\n\n` +
          `📝 Правила:\n` +
          `• 3 раунда викторин (5 минут каждый)\n` +
          `• За правильные ответы и скорость получаете баллы\n` +
          `• Максимум 200 баллов за раунд = 600 всего\n` +
          `• В финале - аукцион призов за баллы!\n\n` +
          `🤝 Можете объединяться в команды для покупки лотов\n\n` +
          `Готовы начать? Нажмите кнопку ниже! 👇`;

        await bot.sendMessage(chatId, " ", {
          reply_markup: {
            keyboard: [[{ text: "🎯 Играть" }]],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        });

        // await bot.sendMessage(chatId, welcomeMessage, {
        //   reply_markup: keyboard
        // });

        // Дублируем с Web App кнопкой для поддерживающих клиентов
        // try {
        //   const webAppKeyboard = {
        //     inline_keyboard: [[
        //       {
        //         text: '🎮 Web App Игра',
        //         web_app: { url: webAppUrl }
        //       }
        //     ]]
        //   };

        //   await bot.sendMessage(chatId,
        //     'Или используйте Web App версию (если поддерживается):',
        //     { reply_markup: webAppKeyboard }
        //   );
        // } catch (webAppError) {
        //   console.log('Web App кнопка не поддерживается:', webAppError.message);
        // }

        console.log(`Пользователь ${user.first_name} (${user.id}) начал игру`);
      }

      if (body.message.text === "/play") {
        await bot.sendMessage(
          chatId,
          `🎮 Ссылка на игру: ${webAppUrl}\n\n` +
            "Откройте эту ссылку в браузере для игры!"
        );
      }
    }

    await updateOnlineCount();
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка webhook:", error);
    res.status(200).json({ ok: true, error: error.message });
  }
};

// Остальные функции остаются прежними...
async function registerUser(telegramUser) {
  try {
    const result = await sql`
      INSERT INTO telegram_users (id, username, first_name, last_name, language_code, is_bot)
      VALUES (${telegramUser.id}, ${telegramUser.username}, ${
      telegramUser.first_name
    }, 
              ${telegramUser.last_name}, ${telegramUser.language_code}, ${
      telegramUser.is_bot || false
    })
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        language_code = EXCLUDED.language_code,
        updated_at = CURRENT_TIMESTAMP
      RETURNING total_points, team_id
    `;
    console.log(
      `Пользователь ${telegramUser.first_name} (${telegramUser.id}) зарегистрирован`
    );
    return result.rows[0];
  } catch (error) {
    console.error("Ошибка регистрации пользователя:", error);
  }
}

async function updateOnlineCount() {
  try {
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
    console.error("Ошибка обновления счетчика онлайн:", error);
  }
}
