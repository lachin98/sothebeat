import React, { useState, useEffect } from 'react';

const StatusTab = ({ adminToken }) => {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (autoUpdate) {
      interval = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [autoUpdate]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/admin?action=status&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading">Загрузка статуса...</div>;
  }

  return (
    <div className="status-tab">
      <div className="status-indicator">
        <div className="status-dot online"></div>
        <span>Текущий статус</span>
        <span className="status-value">{gameState?.currentPhase || 'lobby'}</span>
        <span className="last-updated">
          updated_at: {gameState?.lastUpdated ? new Date(gameState.lastUpdated).toLocaleString() : 'Invalid Date'}
        </span>
      </div>

      <div className="current-phase">
        <span>Фаза: {gameState?.currentPhase || 'lobby'}</span>
      </div>

      <div className="phases-status">
        <div className={`phase-item ${gameState?.phases?.quiz ? 'active' : 'inactive'}`}>
          ● Квиз
        </div>
        <div className={`phase-item ${gameState?.phases?.logic ? 'active' : 'inactive'}`}>
          ● Где логика?
        </div>
        <div className={`phase-item ${gameState?.phases?.contact ? 'active' : 'inactive'}`}>
          ● Есть контакт!
        </div>
        <div className={`phase-item ${gameState?.phases?.survey ? 'active' : 'inactive'}`}>
          ● 100 к 1
        </div>
        <div className={`phase-item ${gameState?.phases?.auction ? 'active' : 'inactive'}`}>
          ● Аукцион
        </div>
      </div>

      <div className="online-stats">
        <h3>📊 Онлайн статистика</h3>
        <p><strong>Сейчас онлайн:</strong> {gameState?.onlineUsers || 0}</p>
        <p><strong>Всего зарегистрировано:</strong> {gameState?.totalRegistered || 0}</p>
        
        <div className="admin-controls">
          <button className="btn btn-primary" onClick={fetchStatus}>
            🔄 Обновить
          </button>
          <label className="auto-update">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
            />
            <span>🔄 Авто-обновление</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default StatusTab;
