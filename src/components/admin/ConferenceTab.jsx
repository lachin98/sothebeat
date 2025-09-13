import React, { useState, useEffect } from 'react';

const ConferenceTab = ({ adminToken }) => {
  const [currentPhase, setCurrentPhase] = useState('lobby');
  const [phases, setPhases] = useState({
    quiz: false,
    logic: false,
    contact: false,
    survey: false,
    auction: false
  });
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const phaseLabels = {
    lobby: 'Лобби',
    quiz: 'Квиз',
    logic: 'Где логика?',
    contact: 'Есть контакт!',
    survey: '100 к 1',
    auction: 'Аукцион'
  };

  useEffect(() => {
    fetchGameState();
    fetchRounds();
    
    // Автообновление каждые 5 секунд
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchGameState = async () => {
    try {
      const response = await fetch(`/api/admin?action=status&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPhase(data.currentPhase || 'lobby');
        setPhases(data.phases || {});
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
        setCurrentPhase(newPhase);
        alert(`✅ Фаза изменена на: ${phaseLabels[newPhase]}`);
        
        // Немедленно обновляем состояние
        setTimeout(fetchGameState, 500);
      } else {
        alert('❌ Ошибка смены фазы');
      }
    } catch (error) {
      console.error('Ошибка смены фазы:', error);
      alert('❌ Ошибка сети');
    }
    setUpdating(false);
  };

  const togglePhase = async (phaseName) => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'togglePhase',
          phase: phaseName,
          token: adminToken
        })
      });
      
      if (response.ok) {
        const newPhases = {
          ...phases,
          [phaseName]: !phases[phaseName]
        };
        setPhases(newPhases);
        alert(`✅ Фаза "${phaseLabels[phaseName]}" ${phases[phaseName] ? 'отключена' : 'включена'}`);
        
        // Немедленно обновляем состояние
        setTimeout(fetchGameState, 500);
      } else {
        alert('❌ Ошибка переключения фазы');
      }
    } catch (error) {
      console.error('Ошибка переключения фазы:', error);
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

  const openHallScreen = () => {
    const hallUrl = `/hall-screen?token=${adminToken}`;
    window.open(hallUrl, '_blank', 'width=1200,height=800');
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="conference-tab">
      <div className="conference-header">
        <h2>🎪 Управление конференцией</h2>
        <div className="live-indicator">
          🟢 LIVE - обновляется каждые 5 сек
        </div>
      </div>

      {/* Быстрое переключение фаз */}
      <div className="quick-phase-control">
        <h3>⚡ Быстрое переключение фаз</h3>
        <div className="phase-buttons">
          {Object.keys(phaseLabels).map(phase => (
            <button
              key={phase}
              className={`phase-btn ${currentPhase === phase ? 'active' : ''}`}
              onClick={() => updateCurrentPhase(phase)}
              disabled={updating}
            >
              {phaseLabels[phase]}
              {currentPhase === phase && <span className="current-indicator">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Текущее состояние */}
      <div className="current-state">
        <h3>📊 Текущее состояние</h3>
        <div className="state-info">
          <div className="state-item">
            <span className="state-label">Текущая фаза:</span>
            <span className={`state-value phase-${currentPhase}`}>
              {phaseLabels[currentPhase] || currentPhase}
            </span>
          </div>
          <div className="state-item">
            <span className="state-label">Последнее обновление:</span>
            <span className="state-value">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
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

      {/* Детальные настройки фаз */}
      <div className="phase-management">
        <h3>⚙️ Детальные настройки фаз</h3>
        
        <div className="phase-controls">
          <h4>📋 Доступные фазы:</h4>
          {Object.entries(phases).map(([phase, isActive]) => (
            <label key={phase} className="phase-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => togglePhase(phase)}
                disabled={updating}
              />
              <span className={`phase-status ${isActive ? 'enabled' : 'disabled'}`}>
                {isActive ? '✅' : '❌'}
              </span>
              <span className="phase-label">{phaseLabels[phase]}</span>
            </label>
          ))}
        </div>

        <div className="control-buttons">
          <button 
            className="btn btn-secondary" 
            onClick={fetchGameState}
            disabled={updating}
          >
            🔄 Обновить состояние
          </button>
          <button 
            className="btn btn-primary" 
            onClick={openHallScreen}
          >
            📺 Открыть экран зала
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceTab;
