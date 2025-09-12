import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ParticipantsTab = ({ adminToken }) => {
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('points');
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    try {
      const response = await axios.get('/api/admin', {
        params: { action: 'participants', token: adminToken }
      });
      setParticipants(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
      setLoading(false);
    }
  };

  const updatePoints = async (participantName, pointsChange) => {
    try {
      await axios.post('/api/admin', {
        action: 'updatePoints',
        name: participantName,
        points: pointsChange,
        token: adminToken
      });
      
      // Обновляем локально
      setParticipants(prev => 
        prev.map(p => 
          p.name === participantName 
            ? { ...p, points: p.points + pointsChange }
            : p
        )
      );
      
      alert(`${pointsChange > 0 ? 'Начислено' : 'Списано'} ${Math.abs(pointsChange)} баллов пользователю ${participantName}`);
    } catch (error) {
      console.error('Ошибка обновления баллов:', error);
    }
  };

  const refreshParticipants = () => {
    setLoading(true);
    fetchParticipants();
  };

  // Фильтрация и сортировка
  const filteredParticipants = participants
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'points') {
        return b.points - a.points;
      }
      return a.name.localeCompare(b.name);
    });

  useEffect(() => {
    fetchParticipants();
  }, []);

  if (loading) {
    return <div>Загрузка участников...</div>;
  }

  return (
    <div className="participants-tab">
      <h3>Участники события</h3>
      
      <div className="participants-controls">
        <input
          type="text"
          placeholder="Поиск по имени/нику"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="points">По баллам ↓</option>
          <option value="name">По имени ↑</option>
        </select>
        
        <button className="btn btn-secondary" onClick={refreshParticipants}>
          Обновить
        </button>
      </div>

      <div className="participants-actions">
        <button 
          className="btn btn-primary"
          onClick={() => {
            const amount = prompt('Количество баллов для начисления всем:');
            if (amount) {
              participants.forEach(p => updatePoints(p.name, parseInt(amount)));
            }
          }}
        >
          Больше +10 всем
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => {
            const amount = prompt('Количество баллов для списания всем:');
            if (amount) {
              participants.forEach(p => updatePoints(p.name, -parseInt(amount)));
            }
          }}
        >
          Обрезать на 50
        </button>
      </div>

      <div className="participants-list">
        {filteredParticipants.map((participant, index) => (
          <div key={participant.id} className="participant-item">
            <div className="participant-info">
              <span className="participant-name">{participant.name}</span>
              {participant.username && (
                <span className="participant-username">@{participant.username}</span>
              )}
            </div>
            
            <div className="participant-points">
              <span className="points-value">{participant.points}</span>
              <div className="points-controls">
                <button 
                  className="btn btn-small btn-success"
                  onClick={() => updatePoints(participant.name, 10)}
                >
                  +10
                </button>
                <button 
                  className="btn btn-small btn-success"
                  onClick={() => updatePoints(participant.name, 50)}
                >
                  +50
                </button>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => updatePoints(participant.name, -10)}
                >
                  -10
                </button>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => updatePoints(participant.name, -50)}
                >
                  -50
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredParticipants.length === 0 && (
        <div className="no-participants">
          Участники не найдены
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;
