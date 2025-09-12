import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LeaderboardTab = ({ adminToken }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('/api/admin', {
        params: { action: 'leaderboard', token: adminToken }
      });
      setLeaderboard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки лидерборда:', error);
      setLoading(false);
    }
  };

  const openHallScreen = () => {
    window.open('/hall-screen', '_blank');
    alert('Экран зала открыт в новом окне');
  };

  const refreshLeaderboard = () => {
    setLoading(true);
    fetchLeaderboard();
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div>Загрузка лидерборда...</div>;
  }

  return (
    <div className="leaderboard-tab">
      <div className="leaderboard-header">
        <h3>Лидерборд (правило)</h3>
        <div className="leaderboard-controls">
          <button className="btn btn-primary" onClick={openHallScreen}>
            Открыть экран зала
          </button>
          <button className="btn btn-secondary" onClick={refreshLeaderboard}>
            Обновить
          </button>
        </div>
      </div>

      <div className="leaderboard-content">
        <div className="leaderboard-list">
          {leaderboard.map((participant, index) => (
            <div key={participant.name} className="leaderboard-item">
              <span className="rank">#{participant.rank} — {participant.name}</span>
              <span className="points">{participant.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTab;
