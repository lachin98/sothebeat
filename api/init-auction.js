const { sql } = require('@vercel/postgres');

// Лоты из ТЗ
const auctionLots = [
  {
    title: "Мерч от Зернова",
    description: "Эксклюзивный мерч от легендарного бармена",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/4a90e2/white?text=ZERNOV",
    order_num: 1
  },
  {
    title: "Футболка с автографами всех спикеров BEAT 2025",
    description: "Уникальная футболка с подписями спикеров",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/9c27b0/white?text=BEAT+2025",
    order_num: 2
  },
  {
    title: "Реклама в Instagram BEAT",
    description: "Кросс пост (или reels) + сторис",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/ff9800/white?text=INSTAGRAM",
    order_num: 3
  },
  {
    title: "Мерч от Перука",
    description: "Эксклюзивный мерч от популярного бармена",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/4caf50/white?text=PERUK",
    order_num: 4
  },
  {
    title: "Безлимит на коктейли на афтепати",
    description: "Неограниченные коктейли на вечеринке",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/f44336/white?text=COCKTAILS",
    order_num: 5
  },
  {
    title: "Сборник мерча от брендов Pernod Ricard",
    description: "Набор фирменного мерча от известных брендов",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/607d8b/white?text=PERNOD",
    order_num: 6
  },
  {
    title: "Ящик разного алкоголя",
    description: "ARARAT Akhtamar, Ballantines 7, Jameson Black Barrel, Havana Club 7, Olmeca Altos, Elyx",
    starting_price: 200,
    image_url: "https://via.placeholder.com/300x200/795548/white?text=ALCOHOL+BOX",
    order_num: 7
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== 'init-auction-2025') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🏛️ Создаем таблицы для аукциона...');

    // Создаем таблицу лотов
    await sql`
      CREATE TABLE IF NOT EXISTS auction_lots (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        starting_price INTEGER DEFAULT 200,
        current_price INTEGER DEFAULT 0,
        image_url TEXT,
        is_active BOOLEAN DEFAULT false,
        is_completed BOOLEAN DEFAULT false,
        winner_user_id BIGINT,
        winner_name VARCHAR(255),
        order_num INTEGER DEFAULT 0,
        auction_started_at TIMESTAMP,
        auction_ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем таблицу ставок
    await sql`
      CREATE TABLE IF NOT EXISTS auction_bids (
        id SERIAL PRIMARY KEY,
        lot_id INTEGER REFERENCES auction_lots(id),
        user_id BIGINT NOT NULL,
        user_name VARCHAR(255),
        bid_amount INTEGER NOT NULL,
        is_team_bid BOOLEAN DEFAULT false,
        team_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Создаем индексы для быстрого поиска
    await sql`CREATE INDEX IF NOT EXISTS idx_auction_lots_active ON auction_lots(is_active, order_num)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auction_bids_lot ON auction_bids(lot_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auction_bids_user ON auction_bids(user_id)`;

    console.log('✅ Таблицы созданы');

    // Добавляем лоты из ТЗ
    for (const lot of auctionLots) {
      await sql`
        INSERT INTO auction_lots (title, description, starting_price, image_url, order_num)
        VALUES (${lot.title}, ${lot.description}, ${lot.starting_price}, ${lot.image_url}, ${lot.order_num})
        ON CONFLICT DO NOTHING
      `;
    }

    console.log('✅ Лоты добавлены');

    // Проверяем что получилось
    const lotsCount = await sql`SELECT COUNT(*) as count FROM auction_lots`;
    const bidsCount = await sql`SELECT COUNT(*) as count FROM auction_bids`;

    return res.json({
      success: true,
      message: 'Аукцион инициализирован',
      lots: parseInt(lotsCount.rows[0].count),
      bids: parseInt(bidsCount.rows[0].count)
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации аукциона:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
