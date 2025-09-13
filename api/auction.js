const { sql } = require('@vercel/postgres');

module.exports = async (req, res) => {
  const { method, body, query } = req;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    switch (method) {
      case 'GET':
        // Получить все лоты
        if (query.action === 'lots') {
          return await getAllLots(res);
        }
        
        // Получить активный лот
        if (query.action === 'active') {
          return await getActiveLot(res);
        }
        
        // Получить ставки по лоту
        if (query.action === 'bids' && query.lot_id) {
          return await getLotBids(res, query.lot_id);
        }
        
        break;

      case 'POST':
        // Админские действия
        if (body.admin_token === 'a') {
          if (body.action === 'start_lot') {
            return await startLot(res, body.lot_id);
          }
          
          if (body.action === 'end_lot') {
            return await endLot(res, body.lot_id);
          }
          
          if (body.action === 'add_lot') {
            return await addLot(res, body);
          }
        }

        // Пользовательская ставка
        if (body.action === 'place_bid') {
          return await placeBid(res, body);
        }
        
        break;

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    res.status(400).json({ message: 'Invalid request' });
  } catch (error) {
    console.error('Auction API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

async function getAllLots(res) {
  const lots = await sql`
    SELECT 
      l.*,
      (SELECT COUNT(*) FROM auction_bids WHERE lot_id = l.id) as bid_count,
      (SELECT MAX(bid_amount) FROM auction_bids WHERE lot_id = l.id) as highest_bid,
      (SELECT user_name FROM auction_bids WHERE lot_id = l.id ORDER BY bid_amount DESC, created_at ASC LIMIT 1) as leading_bidder
    FROM auction_lots l
    ORDER BY l.order_num, l.id
  `;
  
  return res.json(lots.rows);
}

async function getActiveLot(res) {
  const activeLot = await sql`
    SELECT 
      l.*,
      (SELECT COUNT(*) FROM auction_bids WHERE lot_id = l.id) as bid_count,
      (SELECT MAX(bid_amount) FROM auction_bids WHERE lot_id = l.id) as highest_bid,
      (SELECT user_name FROM auction_bids WHERE lot_id = l.id ORDER BY bid_amount DESC, created_at ASC LIMIT 1) as leading_bidder
    FROM auction_lots l
    WHERE l.is_active = true AND l.is_completed = false
    ORDER BY l.order_num
    LIMIT 1
  `;

  if (activeLot.rows.length === 0) {
    return res.json({ lot: null, timeLeft: 0 });
  }

  const lot = activeLot.rows[0];
  
  // Вычисляем оставшееся время
  let timeLeft = 0;
  if (lot.auction_ends_at) {
    timeLeft = Math.max(0, Math.floor((new Date(lot.auction_ends_at) - new Date()) / 1000));
  }

  return res.json({
    lot,
    timeLeft,
    serverTime: new Date().toISOString()
  });
}

async function getLotBids(res, lotId) {
  const bids = await sql`
    SELECT *
    FROM auction_bids
    WHERE lot_id = ${lotId}
    ORDER BY bid_amount DESC, created_at ASC
    LIMIT 20
  `;
  
  return res.json(bids.rows);
}

async function startLot(res, lotId) {
  console.log(`Starting auction for lot ${lotId}`);
  
  // Завершаем все активные лоты
  await sql`
    UPDATE auction_lots 
    SET is_active = false 
    WHERE is_active = true
  `;
  
  // Запускаем выбранный лот на 30 секунд
  const auctionEndsAt = new Date(Date.now() + 30 * 1000); // 30 секунд для теста
  
  await sql`
    UPDATE auction_lots 
    SET 
      is_active = true,
      is_completed = false,
      auction_started_at = CURRENT_TIMESTAMP,
      auction_ends_at = ${auctionEndsAt.toISOString()},
      current_price = starting_price
    WHERE id = ${lotId}
  `;
  
  console.log(`Lot ${lotId} started, ends at ${auctionEndsAt.toISOString()}`);
  
  return res.json({ 
    success: true, 
    lot_id: lotId,
    ends_at: auctionEndsAt.toISOString()
  });
}

async function endLot(res, lotId) {
  console.log(`Ending auction for lot ${lotId}`);
  
  // Находим победителя (самая высокая ставка)
  const winner = await sql`
    SELECT user_id, user_name, bid_amount, team_id
    FROM auction_bids 
    WHERE lot_id = ${lotId}
    ORDER BY bid_amount DESC, created_at ASC
    LIMIT 1
  `;
  
  if (winner.rows.length > 0) {
    const winnerData = winner.rows[0];
    
    // Обновляем лот с победителем
    await sql`
      UPDATE auction_lots 
      SET 
        is_active = false,
        is_completed = true,
        winner_user_id = ${winnerData.user_id},
        winner_name = ${winnerData.user_name},
        current_price = ${winnerData.bid_amount}
      WHERE id = ${lotId}
    `;
    
    // Списываем баллы у победителя
    if (winnerData.team_id) {
      // Если командная ставка - списываем с команды (пока просто с пользователя)
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points - ${winnerData.bid_amount}
        WHERE id = ${winnerData.user_id}
      `;
    } else {
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points - ${winnerData.bid_amount}
        WHERE id = ${winnerData.user_id}
      `;
    }
    
    console.log(`Lot ${lotId} won by ${winnerData.user_name} for ${winnerData.bid_amount} points`);
    
    return res.json({
      success: true,
      winner: winnerData,
      final_price: winnerData.bid_amount
    });
  } else {
    // Никто не делал ставок
    await sql`
      UPDATE auction_lots 
      SET is_active = false, is_completed = true
      WHERE id = ${lotId}
    `;
    
    console.log(`Lot ${lotId} ended with no bids`);
    
    return res.json({
      success: true,
      winner: null,
      final_price: 0
    });
  }
}

async function placeBid(res, { user_id, user_name, lot_id, bid_amount, team_id }) {
  console.log(`Placing bid: user=${user_name}, lot=${lot_id}, amount=${bid_amount}`);
  
  // Проверяем что лот активен
  const lot = await sql`
    SELECT id, is_active, is_completed, auction_ends_at, current_price, starting_price
    FROM auction_lots 
    WHERE id = ${lot_id}
  `;
  
  if (lot.rows.length === 0) {
    return res.status(404).json({ error: 'Лот не найден' });
  }
  
  const lotData = lot.rows[0];
  
  if (!lotData.is_active || lotData.is_completed) {
    return res.status(400).json({ error: 'Аукцион по этому лоту не активен' });
  }
  
  // Проверяем что аукцион не закончился
  if (new Date() > new Date(lotData.auction_ends_at)) {
    return res.status(400).json({ error: 'Время аукциона истекло' });
  }
  
  // Проверяем что ставка больше текущей цены
  const minBid = Math.max(lotData.current_price + 10, lotData.starting_price);
  if (bid_amount < minBid) {
    return res.status(400).json({ 
      error: `Ставка должна быть не менее ${minBid} баллов` 
    });
  }
  
  // Проверяем баланс пользователя
  const user = await sql`
    SELECT total_points 
    FROM telegram_users 
    WHERE id = ${user_id}
  `;
  
  if (user.rows.length === 0 || user.rows[0].total_points < bid_amount) {
    return res.status(400).json({ error: 'Недостаточно баллов' });
  }
  
  // Сохраняем ставку
  await sql`
    INSERT INTO auction_bids (lot_id, user_id, user_name, bid_amount, team_id, is_team_bid)
    VALUES (${lot_id}, ${user_id}, ${user_name}, ${bid_amount}, ${team_id}, ${!!team_id})
  `;
  
  // Обновляем текущую цену лота
  await sql`
    UPDATE auction_lots 
    SET current_price = ${bid_amount}
    WHERE id = ${lot_id}
  `;
  
  // Продлеваем аукцион на 10 секунд если осталось меньше 10 секунд
  const timeLeft = (new Date(lotData.auction_ends_at) - new Date()) / 1000;
  if (timeLeft < 10) {
    const newEndTime = new Date(Date.now() + 10 * 1000);
    await sql`
      UPDATE auction_lots 
      SET auction_ends_at = ${newEndTime.toISOString()}
      WHERE id = ${lot_id}
    `;
    console.log(`Extended auction for lot ${lot_id} by 10 seconds`);
  }
  
  console.log(`Bid placed successfully: ${bid_amount} points`);
  
  return res.json({
    success: true,
    bid_amount,
    new_leader: user_name,
    time_left: Math.max(10, timeLeft)
  });
}

async function addLot(res, { title, description, starting_price, image_url }) {
  const maxOrder = await sql`SELECT COALESCE(MAX(order_num), 0) as max_order FROM auction_lots`;
  const newOrder = maxOrder.rows[0].max_order + 1;
  
  const result = await sql`
    INSERT INTO auction_lots (title, description, starting_price, image_url, order_num)
    VALUES (${title}, ${description}, ${starting_price || 200}, ${image_url}, ${newOrder})
    RETURNING id
  `;
  
  return res.json({
    success: true,
    lot_id: result.rows[0].id
  });
}
