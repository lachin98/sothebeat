import React, { useState, useEffect } from 'react';

const ConferenceTab = ({ adminToken }) => {
  const [currentPhase, setCurrentPhase] = useState('lobby');
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const phaseLabels = {
    lobby: 'Лобби',
    quiz: 'Квиз',
    logic: 'Где логика?',
    survey: '100 к 1',
    auction: 'Аукцион'
  };

  useEffect(() => {
    fetchGameState();
    fetchRounds();
  }, []);

  const fetchGameState = async () => {
    try {
      console.log('Fetching game state...');
      const response = await fetch(`/api/admin?action=status&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Game state received:', data);
        setCurrentPhase(data.currentPhase || 'lobby');
      } else {
        console.error('Failed to fetch game state:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки состояния:', error);
    }
  };

  const fetchRounds = async () => {
    try {
      const response = await fetch(`/api/admin?action=rounds&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setRounds(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки раундов:', error);
    }
    setLoading(false);
  };

  const updateCurrentPhase = async (newPhase) => {
    if (updating) return;
    
    setUpdating(true);
    try {
      console.log('Updating phase to:', newPhase);
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePhase',
          phase: newPhase,
          token: adminToken
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Phase update result:', result);
        setCurrentPhase(newPhase);
        alert(`✅ Фаза изменена на: ${phaseLabels[newPhase]}`);
      } else {
        const error = await response.text();
        console.error('Phase update failed:', error);
        alert('❌ Ошибка смены фазы');
      }
    } catch (error) {
      console.error('Ошибка смены фазы:', error);
      alert('❌ Ошибка сети');
    }
    setUpdating(false);
  };

  const startRound = async (roundId) => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_round',
          round_id: roundId,
          token: adminToken
        })
      });
      
      if (response.ok) {
        alert('✅ Раунд запущен!');
        fetchRounds();
      } else {
        alert('❌ Ошибка запуска раунда');
      }
    } catch (error) {
      console.error('Ошибка запуска раунда:', error);
      alert('❌ Ошибка сети');
    }
    setUpdating(false);
  };

  const stopRound = async (roundId) => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop_round',
          round_id: roundId,
          token: adminToken
        })
      });
      
      if (response.ok) {
        alert('✅ Раунд остановлен!');
        fetchRounds();
      } else {
        alert('❌ Ошибка остановки раунда');
      }
    } catch (error) {
      console.error('Ошибка остановки раунда:', error);
      alert('❌ Ошибка сети');
    }
    setUpdating(false);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="conference-tab">
      <div className="conference-header">
        <h2>🎪 Управление конференцией</h2>
        <button 
          className="btn btn-secondary" 
          onClick={fetchGameState}
          disabled={updating}
        >
          🔄 Обновить статус
        </button>
      </div>

      {/* Быстрое переключение фаз */}
      <div className="quick-phase-control">
        <h3>⚡ Переключение фаз</h3>
        <div className="phase-buttons">
          {Object.keys(phaseLabels).map(phase => (
            <button
              key={phase}
              className={`phase-btn ${currentPhase === phase ? 'active' : ''}`}
              onClick={() => updateCurrentPhase(phase)}
              disabled={updating}
            >
              {updating ? '⏳' : phaseLabels[phase]}
              {currentPhase === phase && <span className="current-indicator">●</span>}
            </button>
          ))}
        </div>
        <p className="phase-hint">
          Текущая фаза: <strong>{phaseLabels[currentPhase] || currentPhase}</strong>
        </p>
      </div>

      {/* Управление раундами */}
      <div className="rounds-management">
        <h3>🎮 Управление раундами</h3>
        <div className="rounds-list">
          {rounds.map(round => (
            <div key={round.id} className="round-item">
              <div className="round-info">
                <div className="round-title">{round.title}</div>
                <div className="round-meta">
                  <span className="round-type">{round.round_type}</span>
                  <span className="round-questions">
                    📝 Вопросов: {round.quiz_count || round.logic_count || round.survey_count || 0}
                  </span>
                  <span className={`round-status ${round.is_active ? 'active' : 'inactive'}`}>
                    {round.is_active ? '🟢 Активен' : '🔴 Остановлен'}
                  </span>
                </div>
              </div>
              
              <div className="round-controls">
                {round.is_active ? (
                  <button 
                    className="btn btn-warning"
                    onClick={() => stopRound(round.id)}
                    disabled={updating}
                  >
                    ⏹️ Остановить
                  </button>
                ) : (
                  <button 
                    className="btn btn-success"
                    onClick={() => startRound(round.id)}
                    disabled={updating}
                  >
                    ▶️ Запустить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConferenceTab;
