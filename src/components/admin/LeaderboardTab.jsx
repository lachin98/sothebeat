import React, { useState, useEffect } from 'react';

const LeaderboardTab = ({ adminToken }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/admin?action=leaderboard&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки лидерборда:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin?action=stats&token=${adminToken}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
    setLoading(false);
  };

  const refreshData = () => {
    setLoading(true);
    fetchLeaderboard();
    fetchStats();
  };

  const openHallScreen = () => {
    const hallUrl = `/hall-screen?token=${adminToken}`;
    window.open(hallUrl, '_blank', 'width=1200,height=800');
  };

  if (loading) {
    return <div className="loading">Загрузка лидерборда...</div>;
  }

  return (
    <div className="leaderboard-tab">
      <div className="leaderboard-header">
        <h2>🏆 Лидерборд</h2>
        <div className="leaderboard-controls">
          {/* <button className="btn btn-primary" onClick={openHallScreen}>
            📺 Экран зала
          </button> */}
          <button className="btn btn-secondary" onClick={refreshData}>
            🔄 Обновить
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.total_users || 0}</div>
          <div className="stat-label">👥 Всего участников</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_results || 0}</div>
          <div className="stat-label">✅ Завершенных раундов</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_teams || 0}</div>
          <div className="stat-label">🤝 Активных команд</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{parseFloat(stats.avg_points || 0).toFixed(1)}</div>
          <div className="stat-label">💰 Средние баллы</div>
        </div>
      </div>

      <div className="leaderboard-content">
        <div className="top-players">
          <h3>🥇 Топ-10 игроков</h3>
          <div className="leaderboard-list">
            {leaderboard.map((participant, index) => (
              <div key={index} className="leaderboard-item">
                <div className="player-rank">
                  {index === 0 && <span className="medal">🥇</span>}
                  {index === 1 && <span className="medal">🥈</span>}
                  {index === 2 && <span className="medal">🥉</span>}
                  {index > 2 && <span className="rank-number">#{index + 1}</span>}
                </div>
                <div className="player-info">
                  <div className="player-name">{participant.name}</div>
                  {participant.team && (
                    <div className="player-team">👥 {participant.team}</div>
                  )}
                </div>
                <div className="player-points">{participant.points}</div>
              </div>
            ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="empty-state">
              <h4>🏆 Пока нет лидеров</h4>
              <p>Участники появятся после завершения первого раунда</p>
            </div>
          )}
        </div>

        {stats.round_stats && stats.round_stats.length > 0 && (
          <div className="rounds-stats">
            <h3>📊 Статистика по раундам</h3>
            <div className="rounds-list">
              {stats.round_stats.map((round, index) => (
                <div key={index} className="round-stat-item">
                  <div className="round-info">
                    <div className="round-title">{round.title}</div>
                    <div className="round-type">{round.round_type}</div>
                  </div>
                  <div className="round-numbers">
                    <div className="stat-item">
                      <span className="stat-value">{round.participants || 0}</span>
                      <span className="stat-name">участников</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{parseFloat(round.avg_points || 0).toFixed(1)}</span>
                      <span className="stat-name">ср. баллов</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardTab;
