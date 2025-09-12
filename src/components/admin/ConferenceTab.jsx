import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConferenceTab = ({ adminToken }) => {
  const [currentPhase, setCurrentPhase] = useState('lobby');
  const [phases, setPhases] = useState({
    quiz: false,
    logic: false,
    contact: false,
    survey: false,
    auction: false
  });

  const phaseLabels = {
    quiz: 'Квиз',
    logic: 'Где логика?',
    contact: 'Есть контакт!',
    survey: '100 к 1',
    auction: 'Аукцион'
  };

  const fetchGameState = async () => {
    try {
      const response = await axios.get('/api/admin', {
        params: { action: 'status', token: adminToken }
      });
      setCurrentPhase(response.data.currentPhase);
      setPhases(response.data.phases);
    } catch (error) {
      console.error('Ошибка загрузки состояния:', error);
    }
  };

  const togglePhase = async (phaseName) => {
    try {
      await axios.post('/api/admin', {
        action: 'togglePhase',
        phase: phaseName,
        token: adminToken
      });
      
      setPhases(prev => ({
        ...prev,
        [phaseName]: !prev[phaseName]
      }));
    } catch (error) {
      console.error('Ошибка переключения фазы:', error);
    }
  };

  const saveSettings = async () => {
    alert('Настройки сохранены!');
  };

  const openHallScreen = () => {
    window.open('/hall-screen', '_blank');
  };

  useEffect(() => {
    fetchGameState();
  }, []);

  return (
    <div className="conference-tab">
      <div className="management-section">
        <h3>Управление</h3>
        
        <div className="phase-selector">
          <label>Фаза</label>
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
          {Object.entries(phases).map(([phase, isActive]) => (
            <label key={phase} className="phase-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => togglePhase(phase)}
              />
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
            Открыть экран зала
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceTab;
