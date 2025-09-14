import React, { useState, useEffect } from 'react';
import AuctionWinnerAnnouncement from './AuctionWinnerAnnouncement';

const AuctionRound = ({ userId, userPoints, userName, onBack }) => {
  const [activeLot, setActiveLot] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  const [currentUserPoints, setCurrentUserPoints] = useState(userPoints);
  const [lastCompletedLot, setLastCompletedLot] = useState(null);
  const [showWinnerAnnouncement, setShowWinnerAnnouncement] = useState(false);
  const [winnerData, setWinnerData] = useState(null);

  useEffect(() => {
    setCurrentUserPoints(userPoints);
    fetchActiveLot();
    const interval = setInterval(fetchActiveLot, 2000);
    return () => clearInterval(interval);
  }, [userPoints]);

  const fetchActiveLot = async () => {
    try {
      const response = await fetch('/api/auction?action=active');
      if (response.ok) {
        const data = await response.json();
        const newActiveLot = data.lot;
        
        // Проверяем смену лота - если предыдущий завершился, показываем результат
        if (!newActiveLot && activeLot && activeLot.is_active) {
          // Лот завершился - получаем данные о победителе
          checkForWinner(activeLot.id);
        }
        
        setActiveLot(newActiveLot);
      }
    } catch (error) {
      console.error('Ошибка загрузки лота:', error);
    }
    setLoading(false);
  };

  const checkForWinner = async (lotId) => {
    try {
      const response = await fetch('/api/auction?action=lots');
      if (response.ok) {
        const lots = await response.json();
        const completedLot = lots.find(lot => lot.id === lotId && lot.is_completed);
        
        if (completedLot && completedLot.winner_name) {
          setWinnerData({
            lot_title: completedLot.title,
            user_name: completedLot.winner_name,
            bid_amount: completedLot.current_price
          });
          setShowWinnerAnnouncement(true);
        }
      }
    } catch (error) {
      console.error('Ошибка получения данных о победителе:', error);
    }
  };

  const fetchUserBalance = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/users?action=profile&user_id=${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserPoints(userData.total_points || 0);
      }
    } catch (error) {
      console.error('Ошибка обновления баланса:', error);
    }
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || placingBid) return;
    
    const amount = parseInt(bidAmount);
    if (amount <= 0) {
      alert('Введите корректную сумму');
      return;
    }
    
    if (amount > currentUserPoints) {
      alert(`Недостаточно баллов!\nУ вас: ${currentUserPoints.toLocaleString()} баллов`);
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
          user_name: userName || 'Участник',
          lot_id: activeLot.id,
          bid_amount: amount
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setBidAmount('');
        
        // Обновляем баланс сразу после ставки
        setCurrentUserPoints(prev => prev - amount);
        
        alert(`✅ Ставка принята!\n${result.message}\n\nВаш баланс: ${(currentUserPoints - amount).toLocaleString()} баллов`);
        
        fetchActiveLot();
        fetchUserBalance(); // Дополнительная проверка баланса
      } else {
        const error = await response.json();
        alert(`❌ ${error.error}`);
        fetchUserBalance(); // Обновляем баланс на случай изменений
      }
    } catch (error) {
      console.error('Ошибка ставки:', error);
      alert('❌ Ошибка сети');
      fetchUserBalance();
    }
    
    setPlacingBid(false);
  };

  const getMinBid = () => {
    if (!activeLot) return 200;
    return Math.max(activeLot.current_price + 10, activeLot.starting_price);
  };

  const getQuickBidOptions = () => {
    const minBid = getMinBid();
    const options = [
      minBid,
      minBid + 50,
      minBid + 100,
      minBid + 200
    ];
    
    return options.filter(amount => amount <= currentUserPoints);
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
          <p>В данный момент нет активных торгов</p>
          <p>Дождитесь начала следующего лота!</p>
          
          <div className="user-balance">
            💰 Ваш баланс: <strong>{currentUserPoints.toLocaleString()} баллов</strong>
          </div>

          <div className="auction-info">
            <h4>ℹ️ Как проходят торги:</h4>
            <ul>
              <li>Ведущий объявляет лот</li>
              <li>Вы делаете ставки в приложении</li>
              <li>Баллы списываются сразу при ставке</li>
              <li>Если не выиграли - баллы вернутся</li>
              <li>Ведущий завершает торги и объявляет победителя</li>
            </ul>
          </div>
        </div>

        {/* Объявление победителя */}
        {showWinnerAnnouncement && (
          <AuctionWinnerAnnouncement
            winnerData={winnerData}
            onClose={() => {
              setShowWinnerAnnouncement(false);
              setWinnerData(null);
            }}
          />
        )}
      </div>
    );
  }

  const minBid = getMinBid();
  const quickBidOptions = getQuickBidOptions();

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
            
            <div className="price-display">
              <div className="price-row">
                <span className="price-label">Стартовая цена:</span>
                <span className="price-value">{activeLot.starting_price.toLocaleString()}</span>
              </div>
              
              <div className="price-row current">
                <span className="price-label">Текущая цена:</span>
                <span className="price-value highlight">
                  {(activeLot.current_price || activeLot.starting_price).toLocaleString()}
                </span>
              </div>
              
              {activeLot.leading_bidder && (
                <div className="leader-info">
                  👑 Лидирует: <strong>{activeLot.leading_bidder}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Статус торгов */}
        <div className="auction-status">
          <div className="status-indicator active">🔥 ТОРГИ ИДУТ</div>
          <div className="bid-count">Ставок: {activeLot.bid_count}</div>
        </div>

        {/* Поле для ставки */}
        <div className="bid-section">
          {/* Текущий баланс в секции ставки */}
          <div className="current-balance">
            💰 Ваш баланс: <strong>{currentUserPoints.toLocaleString()}</strong> баллов
          </div>
          
          <div className="bid-form">
            <div className="bid-input-container">
              <div className="bid-input-group">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Мин. ставка: ${minBid.toLocaleString()}`}
                  min={minBid}
                  max={currentUserPoints}
                  disabled={placingBid}
                  className="bid-input"
                />
                <span className="currency">баллов</span>
              </div>
              
              <button 
                className="bid-button"
                onClick={handlePlaceBid}
                disabled={placingBid || !bidAmount || parseInt(bidAmount) < minBid || parseInt(bidAmount) > currentUserPoints}
              >
                {placingBid ? '⏳ Делаю ставку...' : '🔥 Сделать ставку'}
              </button>
            </div>
            
            {/* Быстрые ставки */}
            {quickBidOptions.length > 0 && (
              <div className="quick-bids">
                <div className="quick-bids-label">Быстрые ставки:</div>
                <div className="quick-bids-buttons">
                  {quickBidOptions.map((amount, index) => (
                    <button 
                      key={index}
                      className="quick-bid"
                      onClick={() => setBidAmount(amount.toString())}
                      disabled={placingBid}
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Предупреждения */}
            <div className="bid-warnings">
              {currentUserPoints < minBid && (
                <div className="warning insufficient">
                  ⚠️ Недостаточно баллов для участия в торгах
                </div>
              )}
              
              <div className="info">
                💡 Баллы списываются сразу при ставке. Если не выиграете - вернутся.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Объявление победителя */}
      {showWinnerAnnouncement && (
        <AuctionWinnerAnnouncement
          winnerData={winnerData}
          onClose={() => {
            setShowWinnerAnnouncement(false);
            setWinnerData(null);
          }}
        />
      )}
    </div>
  );
};

export default AuctionRound;
