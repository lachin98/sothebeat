import TelegramBot from 'node-telegram-bot-api';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Для дебага - проверяем все переменные
  console.log('Environment variables:', {
    has_token: !!process.env.TELEGRAM_BOT_TOKEN,
    webapp_url: process.env.WEBAPP_URL,
    all_env_keys: Object.keys(process.env).filter(key => key.includes('TELEGRAM'))
  });

  if (req.method !== 'POST') {
    return res.status(200).json({ 
      ok: true, 
      message: 'Webhook endpoint ready',
      has_token: !!process.env.TELEGRAM_BOT_TOKEN
    });
  }

  try {
    // Хардкодим токен для теста
    const token = process.env.TELEGRAM_BOT_TOKEN || '8474874191:AAEx0J5uq915sROraQPglwR60lDWd4qJPNE';
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
      
      if (body.message.text === '/start') {
        const keyboard = {
          inline_keyboard: [[
            {
              text: '🎯 Начать игру SotheBEAT!',
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
    res.status(500).json({ ok: false, error: error.message });
  }
}
