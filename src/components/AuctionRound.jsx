import React, { useState, useEffect } from 'react';

const AuctionRound = ({ userId, userPoints, teamId, onBack }) => {
  const [activeLot, setActiveLot] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  const [userName] = useState('Участник');

  useEffect(() => {
    fetchActiveLot();
    const interval = setInterval(fetchActiveLot, 1000); // Каждую секунду
    return () => clearInterval(interval);
  }, []);

  const fetchActiveLot = async () => {
    try {
      const response = await fetch('/api/auction?action=active');
      if (response.ok) {
        const data = await response.json();
        setActiveLot(data.lot);
        setTimeLeft(data.timeLeft || 0);
        
        if (data.lot) {
          fetchBids(data.lot.id);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки лота:', error);
    }
    setLoading(false);
  };

  const fetchBids = async (lotId) => {
    try {
      const response = await fetch(`/api/auction?action=bids&lot_id=${lotId}`);
      if (response.ok) {
        const data = await response.json();
        setBids(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки ставок:', error);
    }
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || placingBid) return;
    
    const amount = parseInt(bidAmount);
    if (amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }
    
    if (amount > userPoints) {
      alert('Недостаточно баллов!');
      return;
    }
    
    setPlacingBid(true);
    
    try {
      const response = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_bid',
          user_id: userId,
          user_name: userName,
          lot_id: activeLot.id,
          bid_amount: amount,
          team_id: teamId
        })
      });
      
      if (response.ok) {
        setBidAmount('');
        alert('✅ Ставка принята!');
        fetchActiveLot(); // Обновляем данные
      } else {
        const error = await response.json();
        alert(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Ошибка ставки:', error);
      alert('❌ Ошибка сети');
    }
    
    setPlacingBid(false);
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Завершен';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMinBid = () => {
    if (!activeLot) return 200;
    return Math.max(activeLot.current_price + 10, activeLot.starting_price);
  };

  if (loading) {
    return (
      <div className="auction-loading">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Загрузка аукциона...</p>
        </div>
      </div>
    );
  }

  if (!activeLot) {
    return (
      <div className="auction-waiting">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="waiting-content">
          <div className="auction-logo">🏛️</div>
          <h2>Аукцион SotheBEAT</h2>
          <p>В данный момент нет активных лотов</p>
          <p>Дождитесь начала торгов!</p>
          
          <div className="user-balance">
            💰 Ваш баланс: <strong>{userPoints} баллов</strong>
          </div>
          
          {teamId && (
            <div className="team-info">
              👥 Команда: {teamId}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isTimeUp = timeLeft <= 0;
  const minBid = getMinBid();

  return (
    <div className="auction-round">
      <div className="auction-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>🏛️ Аукцион</h2>
      </div>

      <div className="auction-content">
        {/* Лот */}
        <div className="lot-display">
          <div className="lot-image">
            <img src={activeLot.image_url} alt={activeLot.title} />
          </div>
          
          <div className="lot-info">
            <h3 className="lot-title">{activeLot.title}</h3>
            <p className="lot-description">{activeLot.description}</p>
            
            <div className="lot-details">
              <div className="price-info">
                <span className="label">Стартовая цена:</span>
                <span className="value">{activeLot.starting_price} баллов</span>
              </div>
              
              <div className="current-price">
                <span className="label">Текущая цена:</span>
                <span className="value">{activeLot.current_price || activeLot.starting_price} баллов</span>
              </div>
              
              {activeLot.leading_bidder && (
                <div className="leading-bidder">
                  <span className="label">Лидирует:</span>
                  <span className="value">{activeLot.leading_bidder}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Таймер */}
        <div className={`auction-timer ${isTimeUp ? 'expired' : ''} ${timeLeft <= 10 ? 'urgent' : ''}`}>
          <div className="timer-label">Время до окончания:</div>
          <div className="timer-value">{formatTime(timeLeft)}</div>
        </div>

        {/* Форма ставки */}
        {!isTimeUp && (
          <div className="bid-section">
            <div className="user-info">
              <div className="balance">💰 Ваш баланс: <strong>{userPoints}</strong> баллов</div>
              {teamId && <div className="team">👥 Команда: {teamId}</div>}
            </div>
            
            <div className="bid-form">
              <div className="bid-input-group">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Мин. ставка: ${minBid}`}
                  min={minBid}
                  max={userPoints}
                  disabled={placingBid}
                />
                <span className="currency">баллов</span>
              </div>
              
              <button 
                className="bid-button"
                onClick={handlePlaceBid}
                disabled={placingBid || !bidAmount || parseInt(bidAmount) < minBid}
              >
                {placingBid ? '⏳ Ставка...' : '🔥 Сделать ставку'}
              </button>
            </div>
            
            <div className="bid-hints">
              <button 
                className="quick-bid"
                onClick={() => setBidAmount(minBid.toString())}
                disabled={minBid > userPoints}
              >
                {minBid} баллов (мин.)
              </button>
              <button 
                className="quick-bid"
                onClick={() => setBidAmount((minBid + 50).toString())}
                disabled={minBid + 50 > userPoints}
              >
                {minBid + 50} баллов
              </button>
              <button 
                className="quick-bid"
                onClick={() => setBidAmount((minBid + 100).toString())}
                disabled={minBid + 100 > userPoints}
              >
                {minBid + 100} баллов
              </button>
            </div>
          </div>
        )}

        {/* История ставок */}
        <div className="bids-history">
          <h4>История ставок</h4>
          {bids.length === 0 ? (
            <p className="no-bids">Пока никто не делал ставок</p>
          ) : (
            <div className="bids-list">
              {bids.map((bid, index) => (
                <div key={bid.id} className={`bid-item ${index === 0 ? 'leading' : ''}`}>
                  <div className="bid-user">
                    {index === 0 && <span className="crown">👑</span>}
                    {bid.user_name}
                    {bid.team_id && <span className="team-badge">👥</span>}
                  </div>
                  <div className="bid-amount">{bid.bid_amount} баллов</div>
                  <div className="bid-time">
                    {new Date(bid.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isTimeUp && (
          <div className="auction-ended">
            <h3>🎉 Торги завершены!</h3>
            {activeLot.leading_bidder ? (
              <p>Победитель: <strong>{activeLot.leading_bidder}</strong></p>
            ) : (
              <p>Никто не сделал ставку</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionRound;
