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

  const phaseLabels = {
    quiz: 'Квиз',
    logic: 'Где логика?',
    contact: 'Есть контакт!',
    survey: '100 к 1',
    auction: 'Аукцион'
  };

  useEffect(() => {
    fetchGameState();
    fetchRounds();
  }, []);

  const fetchGameState = async () => {
    try {
      const response = await fetch(`/api/admin?action=status&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPhase(data.currentPhase);
        setPhases(data.phases);
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
  };

  const togglePhase = async (phaseName) => {
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'togglePhase',
          phase: phaseName,
          token: adminToken
        })
      });
      
      setPhases(prev => ({
        ...prev,
        [phaseName]: !prev[phaseName]
      }));
    } catch (error) {
      console.error('Ошибка переключения фазы:', error);
    }
  };

  const startRound = async (roundId) => {
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_round',
          round_id: roundId,
          token: adminToken
        })
      });
      alert('Раунд запущен!');
      fetchRounds();
    } catch (error) {
      console.error('Ошибка запуска раунда:', error);
    }
  };

  const stopRound = async (roundId) => {
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop_round',
          round_id: roundId,
          token: adminToken
        })
      });
      alert('Раунд остановлен!');
      fetchRounds();
    } catch (error) {
      console.error('Ошибка остановки раунда:', error);
    }
  };

  const saveSettings = async () => {
    alert('Настройки сохранены!');
  };

  const openHallScreen = () => {
    window.open('/hall-screen', '_blank');
  };

  return (
    <div className="conference-tab">
      <div className="conference-header">
        <h2>🎪 Управление конференцией</h2>
      </div>

      <div className="rounds-management">
        <h3>Управление раундами</h3>
        <div className="rounds-list">
          {rounds.map(round => (
            <div key={round.id} className="round-item">
              <div className="round-info">
                <div className="round-title">{round.title}</div>
                <div className="round-meta">
                  <span className="round-type">{round.round_type}</span>
                  <span className="round-questions">
                    Вопросов: {round.quiz_count || round.logic_count || round.survey_count || 0}
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
                  >
                    ⏹️ Остановить
                  </button>
                ) : (
                  <button 
                    className="btn btn-success"
                    onClick={() => startRound(round.id)}
                  >
                    ▶️ Запустить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="phase-management">
        <h3>Управление фазами</h3>
        
        <div className="phase-selector">
          <label>Текущая фаза:</label>
          <select 
            value={currentPhase} 
            onChange={(e) => setCurrentPhase(e.target.value)}
          >
            <option value="lobby">lobby</option>
            <option value="quiz">quiz</option>
            <option value="logic">logic</option>
            <option value="contact">contact</option>
            <option value="survey">survey</option>
            <option value="auction">auction</option>
          </select>
        </div>

        <div className="phase-controls">
          <h4>Доступные фазы:</h4>
          {Object.entries(phases).map(([phase, isActive]) => (
            <label key={phase} className="phase-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => togglePhase(phase)}
              />
              <span className={`phase-status ${isActive ? 'enabled' : 'disabled'}`}>
                {isActive ? '✅' : '❌'}
              </span>
              {phaseLabels[phase]}
            </label>
          ))}
        </div>

        <div className="control-buttons">
          <button className="btn btn-secondary">Загрузить</button>
          <button className="btn btn-primary" onClick={saveSettings}>
            Сохранить
          </button>
          <button className="btn btn-primary" onClick={openHallScreen}>
            📺 Открыть экран зала
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceTab;
