import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
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

    console.log('Получено сообщение:', JSON.stringify(body, null, 2));

    if (body.message) {
      const chatId = body.message.chat.id;
      const user = body.message.from;
      
      if (body.message.text === '/start') {
        const keyboard = {
          inline_keyboard: [[
            {
              text: '�� Начать игру SotheBEAT!',
              web_app: { url: webAppUrl }
            }
          ]]
        };

        await bot.sendMessage(chatId, 
          `🎉 Добро пожаловать на BEAT 2025!\n\n` +
          `Это интерактивный аукцион в стиле Sotheby's!\n\n` +
          `📝 Правила:\n` +
          `• 3 раунда викторин (5 минут каждый)\n` +
          `• За правильные ответы получаете баллы\n` +
          `• В финале - аукцион призов!\n\n` +
          `Готовы? Нажмите кнопку! 👇`,
          { reply_markup: keyboard }
        );
      }
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ошибка webhook:', error);
    res.status(200).json({ ok: true, error: error.message });
  }
}
