import React, { useState, useEffect } from 'react';

const ParticipantsTab = ({ adminToken }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('points');

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/admin?action=participants&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
    }
    setLoading(false);
  };

  const updateUserPoints = async (userId, pointsChange) => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUserPoints',
          user_id: userId,
          points: pointsChange,
          token: adminToken
        })
      });

      if (response.ok) {
        // Обновляем локально
        setParticipants(prev => 
          prev.map(p => 
            p.id === userId 
              ? { ...p, points: p.points + pointsChange }
              : p
          )
        );
        alert(`${pointsChange > 0 ? 'Начислено' : 'Списано'} ${Math.abs(pointsChange)} баллов`);
      }
    } catch (error) {
      console.error('Ошибка обновления баллов:', error);
    }
  };

  const bulkUpdatePoints = async (pointsChange) => {
    const confirmed = confirm(
      `${pointsChange > 0 ? 'Начислить' : 'Списать'} ${Math.abs(pointsChange)} баллов всем участникам?`
    );
    
    if (confirmed) {
      for (const participant of participants) {
        await updateUserPoints(participant.id, pointsChange);
        // Небольшая задержка чтобы не перегрузить API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const resetUserPoints = async (userId) => {
    const confirmed = confirm('Обнулить баллы пользователя?');
    if (confirmed) {
      const user = participants.find(p => p.id === userId);
      if (user) {
        await updateUserPoints(userId, -user.points);
      }
    }
  };

  // Фильтрация и сортировка
  const filteredParticipants = participants
    .filter(p => {
      const searchLower = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(searchLower) ||
        p.username?.toLowerCase().includes(searchLower) ||
        p.id.toString().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'points') {
        return b.points - a.points;
      } else if (sortBy === 'name') {
        return (a.name || a.username || '').localeCompare(b.name || b.username || '');
      } else if (sortBy === 'date') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

  if (loading) {
    return <div>Загрузка участников...</div>;
  }

  return (
    <div className="participants-tab">
      <div className="participants-header">
        <h2>👥 Участники события</h2>
        <div className="participants-count">
          Всего: {participants.length} | Показано: {filteredParticipants.length}
        </div>
      </div>

      <div className="participants-controls">
        <input
          type="text"
          placeholder="Поиск по имени, нику или ID..."
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
          <option value="date">По дате регистрации ↓</option>
        </select>
        
        <button 
          className="btn btn-secondary" 
          onClick={fetchParticipants}
        >
          🔄 Обновить
        </button>
      </div>

      <div className="bulk-actions">
        <h3>Массовые операции</h3>
        <div className="bulk-buttons">
          <button 
            className="btn btn-success"
            onClick={() => bulkUpdatePoints(10)}
          >
            +10 баллов всем
          </button>
          <button 
            className="btn btn-success"
            onClick={() => bulkUpdatePoints(50)}
          >
            +50 баллов всем
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => bulkUpdatePoints(-10)}
          >
            -10 баллов всем
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => bulkUpdatePoints(-50)}
          >
            -50 баллов всем
          </button>
        </div>
      </div>

      <div className="participants-list">
        {filteredParticipants.map((participant) => (
          <div key={participant.id} className="participant-item">
            <div className="participant-info">
              <div className="participant-main">
                <span className="participant-name">
                  {participant.name || participant.username || 'Без имени'}
                </span>
                <span className="participant-id">ID: {participant.id}</span>
              </div>
              {participant.username && (
                <div className="participant-username">@{participant.username}</div>
              )}
              {participant.team_id && (
                <div className="participant-team">👥 Команда: {participant.team_id}</div>
              )}
              <div className="participant-meta">
                <span className="participant-phase">Фаза: {participant.current_phase}</span>
                <span className="participant-date">
                  Регистрация: {new Date(participant.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="participant-actions">
              <div className="participant-points">
                <span className="points-value">{participant.points}</span>
                <span className="points-label">баллов</span>
              </div>
              
              <div className="points-controls">
                <button 
                  className="btn btn-small btn-success"
                  onClick={() => updateUserPoints(participant.id, 10)}
                  title="Добавить 10 баллов"
                >
                  +10
                </button>
                <button 
                  className="btn btn-small btn-success"
                  onClick={() => updateUserPoints(participant.id, 50)}
                  title="Добавить 50 баллов"
                >
                  +50
                </button>
                <button 
                  className="btn btn-small btn-warning"
                  onClick={() => updateUserPoints(participant.id, -10)}
                  title="Убрать 10 баллов"
                >
                  -10
                </button>
                <button 
                  className="btn btn-small btn-warning"
                  onClick={() => updateUserPoints(participant.id, -50)}
                  title="Убрать 50 баллов"
                >
                  -50
                </button>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => resetUserPoints(participant.id)}
                  title="Обнулить баллы"
                >
                  0️⃣
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredParticipants.length === 0 && (
        <div className="no-participants">
          {searchQuery ? 'Участники не найдены по запросу' : 'Пока нет участников'}
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;
