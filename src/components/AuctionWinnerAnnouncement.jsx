import React, { useState, useEffect } from 'react';

const AuctionWinnerAnnouncement = ({ winnerData, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Убираем конфетти через 3 секунды
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!winnerData) return null;

  return (
    <div className="winner-announcement-overlay">
      {showConfetti && <div className="confetti-animation">🎉🎊🎉🎊🎉</div>}
      
      <div className="winner-announcement">
        <div className="announcement-header">
          <h2>🎪 Внимание! Торги завершены!</h2>
        </div>
        
        <div className="winner-card">
          <div className="winner-icon">🏆</div>
          <h3>Лот "{winnerData.lot_title}" продан!</h3>
          
          <div className="winner-details">
            <div className="winner-name">
              <span className="label">Победитель:</span>
              <span className="name">{winnerData.user_name}</span>
            </div>
            
            <div className="final-price">
              <span className="label">Итоговая цена:</span>
              <span className="price">{winnerData.bid_amount?.toLocaleString()} баллов</span>
            </div>
          </div>
        </div>
        
        <div className="auction-gavel">
          <div className="gavel-text">📣 Продано раз, продано два, продано три!</div>
          <div className="congratulations">Поздравляем победителя! 🎉</div>
        </div>
        
        <button className="close-announcement-btn" onClick={onClose}>
          Продолжить
        </button>
      </div>
    </div>
  );
};

export default AuctionWinnerAnnouncement;
