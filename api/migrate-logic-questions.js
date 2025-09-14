const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  if (req.query.token !== 'a') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔧 Starting logic_questions migration...');

    // Добавляем недостающие колонки в logic_questions
    await sql`
      ALTER TABLE logic_questions 
      ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb
    `;

    await sql`
      ALTER TABLE logic_questions 
      ADD COLUMN IF NOT EXISTS use_images BOOLEAN DEFAULT FALSE
    `;

    // Проверяем структуру таблицы
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'logic_questions'
      ORDER BY ordinal_position
    `;

    console.log('✅ Migration completed');
    console.log('📋 Current logic_questions structure:', tableInfo.rows);

    return res.json({
      success: true,
      message: 'Migration completed successfully',
      columns: tableInfo.rows
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      details: error.message
    });
  }
};
