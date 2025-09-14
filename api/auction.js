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
        
        // Получить живой чат всех ставок для админки
        if (query.action === 'live_bids' && query.admin_token === 'a') {
          const limit = query.limit || 50;
          return await getLiveBidsChat(res, limit);
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
          
          if (body.action === 'announce_winner') {
            return await announceWinner(res, body.lot_id, body.winner_message);
          }

          // Сброс всего аукциона
          if (body.action === 'reset_auction') {
            return await resetAuction(res);
          }

          // НОВОЕ: Сброс отдельного лота
          if (body.action === 'reset_lot') {
            return await resetLot(res, body.lot_id);
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
      (SELECT user_name FROM auction_bids WHERE lot_id = l.id ORDER BY bid_amount DESC, created_at ASC LIMIT 1) as leading_bidder,
      (SELECT username FROM telegram_users tu JOIN auction_bids ab ON tu.id = ab.user_id WHERE ab.lot_id = l.id ORDER BY ab.bid_amount DESC, ab.created_at ASC LIMIT 1) as winner_username
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
      (SELECT user_name FROM auction_bids WHERE lot_id = l.id ORDER BY bid_amount DESC, created_at ASC LIMIT 1) as leading_bidder,
      (SELECT username FROM telegram_users tu JOIN auction_bids ab ON tu.id = ab.user_id WHERE ab.lot_id = l.id ORDER BY ab.bid_amount DESC, ab.created_at ASC LIMIT 1) as leading_username
    FROM auction_lots l
    WHERE l.is_active = true AND l.is_completed = false
    ORDER BY l.order_num
    LIMIT 1
  `;

  if (activeLot.rows.length === 0) {
    return res.json({ lot: null });
  }

  const lot = activeLot.rows[0];

  return res.json({
    lot,
    serverTime: new Date().toISOString()
  });
}

async function getLiveBidsChat(res, limit) {
  const bids = await sql`
    SELECT 
      ab.*,
      al.title as lot_title,
      al.is_active as lot_is_active,
      tu.username as user_username,
      (ab.bid_amount = (SELECT MAX(bid_amount) FROM auction_bids WHERE lot_id = ab.lot_id)) as is_leading
    FROM auction_bids ab
    JOIN auction_lots al ON ab.lot_id = al.id
    LEFT JOIN telegram_users tu ON ab.user_id = tu.id
    ORDER BY ab.created_at DESC
    LIMIT ${limit}
  `;
  
  return res.json(bids.rows);
}

async function startLot(res, lotId) {
  console.log(`🏛️ Starting auction for lot ${lotId}`);
  
  // Завершаем все активные лоты И ВОЗВРАЩАЕМ БАЛЛЫ проигравшим
  await returnBidsFromPreviousLots();
  
  // Запускаем выбранный лот
  await sql`
    UPDATE auction_lots 
    SET 
      is_active = true,
      is_completed = false,
      auction_started_at = CURRENT_TIMESTAMP,
      auction_ends_at = NULL,
      current_price = starting_price,
      winner_user_id = NULL,
      winner_name = NULL
    WHERE id = ${lotId}
  `;
  
  console.log(`🔥 Lot ${lotId} started (manual control)`);
  
  return res.json({ 
    success: true, 
    lot_id: lotId,
    message: `Аукцион запущен! Завершение только вручную.`
  });
}

// НОВАЯ ФУНКЦИЯ: Сброс отдельного лота
async function resetLot(res, lotId) {
  console.log(`🔄 Resetting lot ${lotId}`);
  
  try {
    // Получаем информацию о лоте
    const lot = await sql`
      SELECT title FROM auction_lots WHERE id = ${lotId}
    `;
    
    if (lot.rows.length === 0) {
      return res.status(404).json({ error: 'Лот не найден' });
    }
    
    const lotTitle = lot.rows[0].title;
    
    // 1. Возвращаем баллы всем участникам этого лота
    const bids = await sql`
      SELECT user_id, SUM(bid_amount) as total_bids
      FROM auction_bids 
      WHERE lot_id = ${lotId}
      GROUP BY user_id
    `;
    
    for (const bid of bids.rows) {
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points + ${bid.total_bids}
        WHERE id = ${bid.user_id}
      `;
      console.log(`💰 Returned ${bid.total_bids} points to user ${bid.user_id} for lot ${lotId}`);
    }
    
    // 2. Удаляем все ставки по этому лоту
    await sql`DELETE FROM auction_bids WHERE lot_id = ${lotId}`;
    console.log(`🗑️ Cleared all bids for lot ${lotId}`);
    
    // 3. Сбрасываем лот в исходное состояние
    await sql`
      UPDATE auction_lots 
      SET 
        is_active = false,
        is_completed = false,
        current_price = 0,
        winner_user_id = NULL,
        winner_name = NULL,
        auction_started_at = NULL,
        auction_ends_at = NULL
      WHERE id = ${lotId}
    `;
    console.log(`🔄 Reset lot ${lotId} to initial state`);
    
    const totalReturned = bids.rows.reduce((sum, bid) => sum + bid.total_bids, 0);
    const affectedUsers = bids.rows.length;
    
    console.log(`✅ Lot ${lotId} reset: ${totalReturned} points returned to ${affectedUsers} users`);
    
    return res.json({
      success: true,
      message: `Лот "${lotTitle}" сброшен`,
      stats: {
        lot_title: lotTitle,
        points_returned: totalReturned,
        users_affected: affectedUsers,
        bids_cleared: bids.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error resetting lot:', error);
    throw error;
  }
}

// Сброс всего аукциона
async function resetAuction(res) {
  console.log(`🔄 Resetting auction - returning all bids and clearing data`);
  
  try {
    // 1. Возвращаем баллы ВСЕМ участникам аукциона
    const allBids = await sql`
      SELECT user_id, SUM(bid_amount) as total_bids
      FROM auction_bids 
      GROUP BY user_id
    `;
    
    for (const bid of allBids.rows) {
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points + ${bid.total_bids}
        WHERE id = ${bid.user_id}
      `;
      console.log(`💰 Returned ${bid.total_bids} points to user ${bid.user_id}`);
    }
    
    // 2. Очищаем все ставки
    await sql`DELETE FROM auction_bids`;
    console.log('🗑️ Cleared all auction bids');
    
    // 3. Сбрасываем все лоты в исходное состояние
    await sql`
      UPDATE auction_lots 
      SET 
        is_active = false,
        is_completed = false,
        current_price = 0,
        winner_user_id = NULL,
        winner_name = NULL,
        auction_started_at = NULL,
        auction_ends_at = NULL
    `;
    console.log('🔄 Reset all lots to initial state');
    
    // 4. Получаем статистику
    const totalReturned = allBids.rows.reduce((sum, bid) => sum + bid.total_bids, 0);
    const affectedUsers = allBids.rows.length;
    
    console.log(`✅ Auction reset complete: ${totalReturned} points returned to ${affectedUsers} users`);
    
    return res.json({
      success: true,
      message: 'Аукцион полностью сброшен',
      stats: {
        points_returned: totalReturned,
        users_affected: affectedUsers,
        lots_reset: 7,
        bids_cleared: allBids.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error resetting auction:', error);
    throw error;
  }
}

// Возвращаем баллы от предыдущих лотов
async function returnBidsFromPreviousLots() {
  const activeLots = await sql`
    SELECT id FROM auction_lots WHERE is_active = true
  `;
  
  for (const lot of activeLots.rows) {
    const bids = await sql`
      SELECT DISTINCT user_id, SUM(bid_amount) as total_bids
      FROM auction_bids 
      WHERE lot_id = ${lot.id}
      GROUP BY user_id
    `;
    
    for (const bid of bids.rows) {
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points + ${bid.total_bids}
        WHERE id = ${bid.user_id}
      `;
      console.log(`💰 Returned ${bid.total_bids} points to user ${bid.user_id}`);
    }
  }
  
  await sql`
    UPDATE auction_lots 
    SET is_active = false 
    WHERE is_active = true
  `;
}

async function endLot(res, lotId) {
  console.log(`⏹️ Ending auction for lot ${lotId}`);
  
  // Находим победителя с дополнительной информацией
  const winner = await sql`
    SELECT 
      ab.user_id, 
      ab.user_name, 
      ab.bid_amount, 
      ab.team_id, 
      ab.created_at,
      tu.username as winner_username
    FROM auction_bids ab
    LEFT JOIN telegram_users tu ON ab.user_id = tu.id 
    WHERE ab.lot_id = ${lotId}
    ORDER BY ab.bid_amount DESC, ab.created_at ASC
    LIMIT 1
  `;
  
  const lotInfo = await sql`
    SELECT title FROM auction_lots WHERE id = ${lotId}
  `;
  
  const lotTitle = lotInfo.rows[0]?.title || 'Лот';
  
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
    
    // ВОЗВРАЩАЕМ БАЛЛЫ ВСЕМ ПРОИГРАВШИМ
    const allBids = await sql`
      SELECT user_id, SUM(bid_amount) as total_bids
      FROM auction_bids 
      WHERE lot_id = ${lotId} AND user_id != ${winnerData.user_id}
      GROUP BY user_id
    `;
    
    for (const bid of allBids.rows) {
      await sql`
        UPDATE telegram_users 
        SET total_points = total_points + ${bid.total_bids}
        WHERE id = ${bid.user_id}
      `;
      console.log(`💰 Returned ${bid.total_bids} points to user ${bid.user_id} (not winner)`);
    }
    
    console.log(`🏆 Lot ${lotId} won by ${winnerData.user_name} (@${winnerData.winner_username}) for ${winnerData.bid_amount} points`);
    
    return res.json({
      success: true,
      winner: {
        ...winnerData,
        lot_title: lotTitle
      },
      final_price: winnerData.bid_amount,
      message: `Победитель: ${winnerData.user_name}${winnerData.winner_username ? ' (@' + winnerData.winner_username + ')' : ''} за ${winnerData.bid_amount} баллов!`
    });
  } else {
    await sql`
      UPDATE auction_lots 
      SET is_active = false, is_completed = true
      WHERE id = ${lotId}
    `;
    
    console.log(`❌ Lot ${lotId} ended with no bids`);
    
    return res.json({
      success: true,
      winner: null,
      final_price: 0,
      lot_title: lotTitle,
      message: 'Никто не сделал ставку'
    });
  }
}

async function announceWinner(res, lotId, message) {
  console.log(`📢 Announcing winner for lot ${lotId}: ${message}`);
  
  const lot = await sql`
    SELECT title, winner_name, current_price
    FROM auction_lots
    WHERE id = ${lotId}
  `;
  
  if (lot.rows.length === 0) {
    return res.status(404).json({ error: 'Лот не найден' });
  }
  
  const lotData = lot.rows[0];
  
  return res.json({
    success: true,
    lot: lotData,
    announcement: message,
    message: 'Объявление сделано!'
  });
}

async function placeBid(res, { user_id, user_name, lot_id, bid_amount, team_id }) {
  console.log(`�� Placing bid: user=${user_name}, lot=${lot_id}, amount=${bid_amount}`);
  
  const lot = await sql`
    SELECT id, is_active, is_completed, current_price, starting_price, title
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
  
  const minBid = Math.max(lotData.current_price + 10, lotData.starting_price);
  if (bid_amount < minBid) {
    return res.status(400).json({ 
      error: `Ставка должна быть не менее ${minBid} баллов` 
    });
  }
  
  const user = await sql`
    SELECT total_points 
    FROM telegram_users 
    WHERE id = ${user_id}
  `;
  
  if (user.rows.length === 0 || user.rows[0].total_points < bid_amount) {
    return res.status(400).json({ error: 'Недостаточно баллов' });
  }
  
  // РЕЗЕРВИРУЕМ БАЛЛЫ СРАЗУ ПРИ СТАВКЕ
  await sql`
    UPDATE telegram_users 
    SET total_points = total_points - ${bid_amount}
    WHERE id = ${user_id}
  `;
  
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
  
  console.log(`✅ Bid placed: ${bid_amount} points for "${lotData.title}" (reserved from balance)`);
  
  return res.json({
    success: true,
    bid_amount,
    new_leader: user_name,
    lot_title: lotData.title,
    message: `Ставка принята: ${bid_amount} баллов (списано с баланса)`
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
