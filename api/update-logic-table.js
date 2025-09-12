const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'update-logic-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Обновляем таблицу logic_questions для поддержки картинок...');

    // Добавляем новые колонки для URL картинок
    await sql`
      ALTER TABLE logic_questions 
      ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS use_images BOOLEAN DEFAULT false
    `;

    console.log('✅ Таблица обновлена!');

    return res.status(200).json({
      success: true,
      message: 'Таблица logic_questions обновлена для поддержки картинок'
    });

  } catch (error) {
    console.error('❌ Ошибка обновления таблицы:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
