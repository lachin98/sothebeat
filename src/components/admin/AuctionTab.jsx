import React, { useState, useEffect } from 'react';

const AuctionTab = ({ adminToken }) => {
  const [lots, setLots] = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingLot, setEditingLot] = useState(null);
  const [newLot, setNewLot] = useState({
    title: '',
    description: '',
    starting_price: 200,
    image_url: ''
  });

  useEffect(() => {
    fetchLots();
    fetchActiveLot();
    
    // Обновляем активный лот каждую секунду
    const interval = setInterval(fetchActiveLot, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/auction?action=lots');
      if (response.ok) {
        const data = await response.json();
        setLots(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки лотов:', error);
    }
    setLoading(false);
  };

  const fetchActiveLot = async () => {
    try {
      const response = await fetch('/api/auction?action=active');
      if (response.ok) {
        const data = await response.json();
        setActiveLot(data.lot);
        setTimeLeft(data.timeLeft || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки активного лота:', error);
    }
  };

  const startLotAuction = async (lotId) => {
    if (!confirm('🔥 Запустить аукцион этого лота?')) return;
    
    try {
      const response = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_lot',
          lot_id: lotId,
          admin_token: adminToken
        })
      });
      
      if (response.ok) {
        alert('✅ Аукцион запущен!');
        fetchLots();
        fetchActiveLot();
      } else {
        alert('❌ Ошибка запуска');
      }
    } catch (error) {
      console.error('Ошибка запуска лота:', error);
      alert('❌ Ошибка сети');
    }
  };

  const endLotAuction = async (lotId) => {
    if (!confirm('⏹️ Завершить аукцион досрочно?')) return;
    
    try {
      const response = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_lot',
          lot_id: lotId,
          admin_token: adminToken
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.winner) {
          alert(`✅ Лот продан!\nПобедитель: ${result.winner.user_name}\nЦена: ${result.final_price} баллов`);
        } else {
          alert('✅ Лот снят с торгов (нет ставок)');
        }
        fetchLots();
        fetchActiveLot();
      } else {
        alert('❌ Ошибка завершения');
      }
    } catch (error) {
      console.error('Ошибка завершения лота:', error);
      alert('❌ Ошибка сети');
    }
  };

  const handleAddLot = async () => {
    if (!newLot.title.trim()) {
      alert('Введите название лота');
      return;
    }
    
    try {
      const response = await fetch('/api/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_lot',
          admin_token: adminToken,
          ...newLot
        })
      });
      
      if (response.ok) {
        resetForm();
        fetchLots();
        alert('✅ Лот добавлен!');
      } else {
        alert('❌ Ошибка добавления');
      }
    } catch (error) {
      console.error('Ошибка добавления лота:', error);
      alert('❌ Ошибка сети');
    }
  };

  const resetForm = () => {
    setEditingLot(null);
    setNewLot({
      title: '',
      description: '',
      starting_price: 200,
      image_url: ''
    });
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Завершен';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLotStatus = (lot) => {
    if (lot.is_active) return { text: '🔥 Активный торг', color: '#f44336' };
    if (lot.is_completed) return { text: '✅ Продан', color: '#4caf50' };
    return { text: '⏳ Ожидает', color: '#888' };
  };

  if (loading) {
    return <div className="loading">Загрузка аукциона...</div>;
  }

  return (
    <div className="auction-tab">
      <div className="tab-header">
        <h2>🏛️ Управление аукционом</h2>
        <div className="tab-stats">
          Всего лотов: {lots.length}
        </div>
      </div>

      {/* Активный лот */}
      {activeLot && (
        <div className="active-lot-panel">
          <h3>🔥 Активный лот</h3>
          <div className="active-lot-card">
            <div className="lot-image-preview">
              <img src={activeLot.image_url} alt={activeLot.title} />
            </div>
            <div className="lot-details">
              <h4>{activeLot.title}</h4>
              <p>{activeLot.description}</p>
              <div className="lot-stats">
                <span>Стартовая цена: {activeLot.starting_price} баллов</span>
                <span>Текущая цена: {activeLot.current_price || activeLot.starting_price} баллов</span>
                <span>Ставок: {activeLot.bid_count || 0}</span>
                {activeLot.leading_bidder && (
                  <span>Лидер: {activeLot.leading_bidder}</span>
                )}
              </div>
            </div>
            <div className="lot-controls">
              <div className={`timer ${timeLeft <= 10 ? 'urgent' : ''}`}>
                {formatTime(timeLeft)}
              </div>
              <button 
                className="btn btn-warning"
                onClick={() => endLotAuction(activeLot.id)}
              >
                ⏹️ Завершить досрочно
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tab-content">
        <div className="lots-list">
          <h3>Все лоты</h3>
          
          {lots.length === 0 ? (
            <div className="empty-state">
              <h4>Пока нет лотов</h4>
              <p>Добавьте первый лот в форме справа →</p>
            </div>
          ) : (
            lots.map((lot, index) => {
              const status = getLotStatus(lot);
              return (
                <div key={lot.id} className="lot-item">
                  <div className="lot-header">
                    <span className="lot-number">#{index + 1}</span>
                    <span className="lot-status" style={{ color: status.color }}>
                      {status.text}
                    </span>
                  </div>
                  
                  <div className="lot-preview">
                    <div className="lot-image-small">
                      <img src={lot.image_url} alt={lot.title} />
                    </div>
                    
                    <div className="lot-info">
                      <h4 className="lot-title">{lot.title}</h4>
                      <p className="lot-description">{lot.description}</p>
                      
                      <div className="lot-meta">
                        <span>Стартовая цена: {lot.starting_price} баллов</span>
                        {lot.current_price > 0 && (
                          <span>Продано за: {lot.current_price} баллов</span>
                        )}
                        {lot.bid_count > 0 && (
                          <span>Ставок: {lot.bid_count}</span>
                        )}
                        {lot.winner_name && (
                          <span>Победитель: {lot.winner_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="lot-actions">
                    {!lot.is_active && !lot.is_completed && (
                      <button 
                        className="btn btn-success"
                        onClick={() => startLotAuction(lot.id)}
                      >
                        🔥 Запустить торги
                      </button>
                    )}
                    
                    {lot.is_active && (
                      <button 
                        className="btn btn-warning"
                        onClick={() => endLotAuction(lot.id)}
                      >
                        ⏹️ Завершить
                      </button>
                    )}
                    
                    {lot.is_completed && lot.winner_name && (
                      <div className="completed-badge">
                        ✅ Продан
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="add-lot-form">
          <h3>➕ Добавить новый лот</h3>
          
          <div className="form-group">
            <label>Название лота:</label>
            <input
              type="text"
              value={newLot.title}
              onChange={(e) => setNewLot({...newLot, title: e.target.value})}
              placeholder="Название приза"
            />
          </div>

          <div className="form-group">
            <label>Описание:</label>
            <textarea
              value={newLot.description}
              onChange={(e) => setNewLot({...newLot, description: e.target.value})}
              placeholder="Подробное описание лота"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Стартовая цена (баллы):</label>
            <input
              type="number"
              value={newLot.starting_price}
              onChange={(e) => setNewLot({...newLot, starting_price: parseInt(e.target.value) || 200})}
              min="50"
              max="1000"
            />
          </div>

          <div className="form-group">
            <label>URL изображения:</label>
            <input
              type="url"
              value={newLot.image_url}
              onChange={(e) => setNewLot({...newLot, image_url: e.target.value})}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {newLot.image_url && (
            <div className="image-preview">
              <label>Предпросмотр:</label>
              <img src={newLot.image_url} alt="Предпросмотр" />
            </div>
          )}

          <div className="form-buttons">
            <button 
              className="add-question-btn"
              onClick={handleAddLot}
              disabled={!newLot.title.trim()}
            >
              ➕ Добавить лот
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionTab;
