import React, { useState } from 'react';

const AuctionRound = ({ lots, userPoints, onBack }) => {
  const [currentLot, setCurrentLot] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [userBids, setUserBids] = useState([]);
  const [teamCode, setTeamCode] = useState('');

  const handlePlaceBid = () => {
    const bid = parseInt(bidAmount);
    if (bid < lots[currentLot].startPrice) {
      alert(`Минимальная ставка: ${lots[currentLot].startPrice} баллов`);
      return;
    }
    if (bid > userPoints) {
      alert('Недостаточно баллов!');
      return;
    }

    const newBid = {
      lotId: lots[currentLot].id,
      amount: bid,
      timestamp: new Date(),
      teamCode: teamCode || null
    };

    setUserBids([...userBids, newBid]);
    alert(`Ставка ${bid} баллов размещена на лот "${lots[currentLot].name}"`);
    setBidAmount('');
  };

  const joinTeam = () => {
    const code = prompt('Введите код команды для объединения баллов:');
    if (code) {
      setTeamCode(code);
      alert(`Вы присоединились к команде: ${code}`);
    }
  };

  return (
    <div className="auction-round">
      <button className="back-btn" onClick={onBack}>← Назад</button>
      
      <div className="auction-header">
        <h2>🔥 Аукцион SotheBEAT</h2>
        <div className="user-balance">
          💰 Ваши баллы: {userPoints}
          {teamCode && <div className="team-info">👥 Команда: {teamCode}</div>}
        </div>
      </div>

      {!teamCode && (
        <button className="join-team-btn" onClick={joinTeam}>
          🤝 Объединиться в команду
        </button>
      )}

      <div className="lots-navigation">
        {lots.map((lot, index) => (
          <button
            key={lot.id}
            className={`lot-nav-btn ${currentLot === index ? 'active' : ''}`}
            onClick={() => setCurrentLot(index)}
          >
            Лот {lot.id}
          </button>
        ))}
      </div>

      <div className="current-lot">
        <div className="lot-card">
          <div className="lot-image">
            {lots[currentLot].image}
          </div>
          <div className="lot-info">
            <h3>Лот {lots[currentLot].id}</h3>
            <h4>{lots[currentLot].name}</h4>
            <div className="start-price">
              Стартовая цена: {lots[currentLot].startPrice} баллов
            </div>
          </div>
        </div>

        <div className="bidding-section">
          <div className="bid-input">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Ваша ставка"
              min={lots[currentLot].startPrice}
              max={userPoints}
            />
            <button 
              className="bid-btn"
              onClick={handlePlaceBid}
              disabled={!bidAmount || parseInt(bidAmount) < lots[currentLot].startPrice}
            >
              Сделать ставку
            </button>
          </div>

          <div className="quick-bids">
            <h4>Быстрые ставки:</h4>
            {[200, 250, 300, 400, 500].map(amount => (
              <button
                key={amount}
                className="quick-bid-btn"
                onClick={() => setBidAmount(amount.toString())}
                disabled={amount > userPoints}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {userBids.length > 0 && (
          <div className="user-bids">
            <h4>Ваши ставки:</h4>
            {userBids.map((bid, index) => {
              const lot = lots.find(l => l.id === bid.lotId);
              return (
                <div key={index} className="bid-item">
                  Лот {bid.lotId} ({lot?.name}): {bid.amount} баллов
                  {bid.teamCode && <span className="team-bid"> (команда: {bid.teamCode})</span>}
                </div>
              );
            })}
          </div>
        )}

        <div className="auction-info">
          <h4>ℹ️ Информация об аукционе:</h4>
          <ul>
            <li>Ставки принимаются в режиме реального времени</li>
            <li>Можно объединяться в команды для совместных ставок</li>
            <li>Победитель определяется в конце аукциона</li>
            <li>При победе баллы списываются с вашего счета</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuctionRound;
