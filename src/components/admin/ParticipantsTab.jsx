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
      } else {
        console.error('Ошибка загрузки участников');
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
              ? { ...p, points: (p.points || 0) + pointsChange }
              : p
          )
        );
        alert(`✅ ${pointsChange > 0 ? 'Начислено' : 'Списано'} ${Math.abs(pointsChange)} баллов`);
      } else {
        alert('❌ Ошибка обновления баллов');
      }
    } catch (error) {
      console.error('Ошибка обновления баллов:', error);
      alert('❌ Ошибка сети');
    }
  };

  const bulkUpdatePoints = async (pointsChange) => {
    const confirmed = confirm(
      `${pointsChange > 0 ? '💰 Начислить' : '💸 Списать'} ${Math.abs(pointsChange)} баллов всем ${participants.length} участникам?`
    );
    
    if (!confirmed) return;

    let successCount = 0;
    for (const participant of participants) {
      try {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateUserPoints',
            user_id: participant.id,
            points: pointsChange,
            token: adminToken
          })
        });

        if (response.ok) {
          successCount++;
        }
        
        // Небольшая задержка чтобы не перегрузить API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Ошибка для пользователя ${participant.id}:`, error);
      }
    }

    alert(`✅ Обновлено ${successCount} из ${participants.length} участников`);
    fetchParticipants(); // Перезагружаем данные
  };

  const resetUserPoints = async (userId) => {
    const user = participants.find(p => p.id === userId);
    if (!user) return;
    
    const confirmed = confirm(`🔄 Обнулить баллы пользователя ${user.name || user.username}?`);
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUserPoints',
          user_id: userId,
          points: -(user.points || 0),
          token: adminToken
        })
      });

      if (response.ok) {
        setParticipants(prev => 
          prev.map(p => 
            p.id === userId 
              ? { ...p, points: 0 }
              : p
          )
        );
        alert('✅ Баллы обнулены');
      } else {
        alert('❌ Ошибка обнуления баллов');
      }
    } catch (error) {
      console.error('Ошибка обнуления баллов:', error);
      alert('❌ Ошибка сети');
    }
  };

  const deleteUser = async (userId) => {
    const user = participants.find(p => p.id === userId);
    if (!user) return;
    
    const confirmed = confirm(`🗑️ УДАЛИТЬ пользователя ${user.name || user.username} НАВСЕГДА? Это действие нельзя отменить!`);
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteUser',
          user_id: userId,
          token: adminToken
        })
      });

      if (response.ok) {
        setParticipants(prev => prev.filter(p => p.id !== userId));
        alert('✅ Пользователь удален');
      } else {
        alert('❌ Ошибка удаления пользователя');
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      alert('❌ Ошибка сети');
    }
  };

  // Фильтрация и сортировка
  const filteredParticipants = participants
    .filter(p => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.username || '').toLowerCase().includes(searchLower) ||
        p.id.toString().includes(searchLower) ||
        (p.team_id || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'points') {
        return (b.points || 0) - (a.points || 0);
      } else if (sortBy === 'name') {
        return (a.name || a.username || '').localeCompare(b.name || b.username || '');
      } else if (sortBy === 'date') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

  if (loading) {
    return <div className="loading">Загрузка участников...</div>;
  }

  return (
    <div className="participants-tab">
      <div className="participants-header">
        <h2>👥 Участники события</h2>
        <div className="participants-count">
          <span className="total-count">Всего: {participants.length}</span>
          {searchQuery && (
            <span className="filtered-count">| Показано: {filteredParticipants.length}</span>
          )}
        </div>
      </div>

      <div className="participants-controls">
        <input
          type="text"
          placeholder="🔍 Поиск по имени, нику, ID или команде..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="points">💰 По баллам ↓</option>
          <option value="name">📝 По имени ↑</option>
          <option value="date">📅 По дате регистрации ↓</option>
        </select>
        
        <button 
          className="btn btn-secondary" 
          onClick={fetchParticipants}
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'} Обновить
        </button>
      </div>

      <div className="bulk-actions">
        <h3>⚡ Массовые операции</h3>
        <div className="bulk-buttons">
          <button 
            className="btn btn-success"
            onClick={() => bulkUpdatePoints(10)}
            disabled={participants.length === 0}
          >
            +10 💰 всем
          </button>
          <button 
            className="btn btn-success"
            onClick={() => bulkUpdatePoints(50)}
            disabled={participants.length === 0}
          >
            +50 💰 всем
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => bulkUpdatePoints(-10)}
            disabled={participants.length === 0}
          >
            -10 💸 всем
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => bulkUpdatePoints(-50)}
            disabled={participants.length === 0}
          >
            -50 💸 всем
          </button>
        </div>
      </div>

      <div className="participants-list">
        {filteredParticipants.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <h4>🔍 Участники не найдены</h4>
                <p>Попробуйте изменить поисковый запрос</p>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSearchQuery('')}
                >
                  ❌ Очистить поиск
                </button>
              </>
            ) : (
              <>
                <h4>👥 Пока нет участников</h4>
                <p>Участники появятся после регистрации через Telegram бот</p>
              </>
            )}
          </div>
        ) : (
          filteredParticipants.map((participant) => (
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
                  <span className="participant-phase">📍 Фаза: {participant.current_phase || 'lobby'}</span>
                  <span className="participant-date">
                    📅 Регистрация: {new Date(participant.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="participant-actions">
                <div className="participant-points">
                  <span className="points-value">{participant.points || 0}</span>
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
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => deleteUser(participant.id)}
                    title="Удалить пользователя"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParticipantsTab;
