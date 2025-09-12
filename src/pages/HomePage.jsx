import React, { useState, useEffect } from 'react';
import QuizRound from '../components/QuizRound';
import LogicRound from '../components/LogicRound';
import SurveyRound from '../components/SurveyRound';
import AuctionRound from '../components/AuctionRound';

const HomePage = ({ user }) => {
  const [currentView, setCurrentView] = useState('lobby');
  const [userPoints, setUserPoints] = useState(0);
  const [userName, setUserName] = useState('Участник');
  const [userId, setUserId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.id) {
      // Реальный пользователь из Telegram
      setUserName(user.first_name || user.username || 'Участник');
      setUserId(user.id);
      fetchUserProfile(user.id);
    } else {
      // Если нет пользователя Telegram - показываем сообщение
      setError('Пожалуйста, откройте приложение через Telegram бот');
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async (uid) => {
    try {
      const response = await fetch(`/api/users?action=profile&user_id=${uid}`);
      if (response.ok) {
        const userData = await response.json();
        setUserPoints(userData.total_points || 0);
        setTeamId(userData.team_id);
      } else if (response.status === 404) {
        // Пользователь не найден - это нормально, он будет создан при первом взаимодействии
        setUserPoints(0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setError('Ошибка загрузки данных пользователя');
      setLoading(false);
    }
  };

  const handleRoundComplete = async (roundNumber, earnedPoints, roundType, answers) => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_round_result',
          user_id: userId,
          round_id: roundNumber,
          round_type: roundType,
          points_earned: earnedPoints,
          total_time: 300,
          answers: answers
        })
      });

      if (response.ok) {
        setUserPoints(prev => prev + earnedPoints);
        alert(`Раунд завершен! Заработано: ${earnedPoints} баллов`);
      }
    } catch (error) {
      console.error('Ошибка сохранения результатов:', error);
    }
    
    setCurrentView('lobby');
  };

  const handleJoinTeam = async () => {
    if (!userId) {
      alert('Ошибка: пользователь не определен');
      return;
    }
    
    const teamCode = prompt('Введите код команды:');
    if (teamCode) {
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join_team',
            user_id: userId,
            team_id: teamCode
          })
        });

        if (response.ok) {
          setTeamId(teamCode);
          alert(`Вы присоединились к команде: ${teamCode}`);
        }
      } catch (error) {
        console.error('Ошибка присоединения к команде:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠️ Ошибка</h2>
        <p>{error}</p>
        <p>Для игры нужно зайти через Telegram бот:</p>
        <a href="https://t.me/your_bot_username" className="bot-link">
          Открыть бот
        </a>
      </div>
    );
  }

  // Остальной код остается прежним...
  const renderCurrentView = () => {
    switch (currentView) {
      case 'quiz':
        return (
          <QuizRound
            userId={userId}
            onComplete={(points, answers) => handleRoundComplete(1, points, 'quiz', answers)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'logic':
        return (
          <LogicRound
            userId={userId}
            onComplete={(points, answers) => handleRoundComplete(2, points, 'logic', answers)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'survey':
        return (
          <SurveyRound
            userId={userId}
            onComplete={(points, answers) => handleRoundComplete(3, points, 'survey', answers)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'auction':
        return (
          <AuctionRound
            userId={userId}
            userPoints={userPoints}
            teamId={teamId}
            onBack={() => setCurrentView('lobby')}
          />
        );
      default:
        return (
          <div className="lobby">
            <div className="header">
              <img 
                src="https://via.placeholder.com/120x50/4a90e2/white?text=SotheBEAT" 
                alt="SotheBEAT" 
                className="logo"
              />
            </div>

            <div className="user-info">
              <div className="user-card">
                <div className="avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <h3>{userName}</h3>
                  <p>Участник события</p>
                  <div className="points">
                    Баланс: <span className="points-value">{userPoints}</span>
                  </div>
                  <div className="phase">
                    Фаза: <span className="phase-value">lobby</span>
                  </div>
                  {teamId && (
                    <div className="team-info">
                      👥 Команда: {teamId}
                    </div>
                  )}
                  <div className="updated">
                    Обновлено: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="games-grid">
              <button 
                className="game-card quiz-card"
                onClick={() => setCurrentView('quiz')}
              >
                <div className="game-icon">🎯</div>
                <div className="game-info">
                  <h4>Квиз</h4>
                  <p>Раунды с вопросами и вариантами ответов</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button 
                className="game-card logic-card"
                onClick={() => setCurrentView('logic')}
              >
                <div className="game-icon">🧩</div>
                <div className="game-info">
                  <h4>Где логика?</h4>
                  <p>Угадай, что объединяет картинки</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button 
                className="game-card survey-card"
                onClick={() => setCurrentView('survey')}
              >
                <div className="game-icon">📊</div>
                <div className="game-info">
                  <h4>100 к 1</h4>
                  <p>Популярные ответы на необычные вопросы</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button 
                className="game-card team-card"
                onClick={handleJoinTeam}
              >
                <div className="game-icon">🤝</div>
                <div className="game-info">
                  <h4>Есть контакт!</h4>
                  <p>Командные ассоциации — найдите слово</p>
                  <div className="max-points">Объединяй баллы</div>
                </div>
              </button>
            </div>

            <button 
              className="auction-button"
              onClick={() => setCurrentView('auction')}
            >
              <div className="auction-icon">🔥</div>
              <div className="auction-info">
                <h4>Аукцион</h4>
                <p>Ставь баллы — забирай призы</p>
              </div>
            </button>

            <div className="rules">
              <h3>Правила игры</h3>
              <ul>
                <li>3 раунда викторин по 5 минут каждый</li>
                <li>За правильные ответы и скорость получаешь баллы</li>
                <li>Максимум 200 баллов за раунд = 600 всего</li>
                <li>В финале - аукцион призов за баллы!</li>
                <li>Можно объединяться в команды</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="home-page">
      {renderCurrentView()}
    </div>
  );
};

export default HomePage;
