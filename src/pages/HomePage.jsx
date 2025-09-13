import React, { useState, useEffect } from 'react';
import { useGamePhase } from '../hooks/useGamePhase';
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
  const [isTelegramUser, setIsTelegramUser] = useState(false);

  // Используем хук для отслеживания фазы игры
  const { currentPhase, phases, isLoading: phaseLoading } = useGamePhase();

  useEffect(() => {
    if (user && user.id) {
      setUserName(user.first_name || user.username || 'Участник');
      setUserId(user.id);
      
      const isTgUser = user.id < 999999999999;
      setIsTelegramUser(isTgUser);
      
      if (isTgUser) {
        fetchUserProfile(user.id);
      } else {
        const savedPoints = localStorage.getItem(`sothebeat_points_${user.id}`) || '0';
        const savedTeam = localStorage.getItem(`sothebeat_team_${user.id}`);
        setUserPoints(parseInt(savedPoints));
        setTeamId(savedTeam);
        setLoading(false);
      }
    } else {
      const guestId = Date.now();
      setUserName('Гость');
      setUserId(guestId);
      setIsTelegramUser(false);
      setUserPoints(0);
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
      } else {
        setUserPoints(0);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setUserPoints(0);
    }
    setLoading(false);
  };

  const handleRoundComplete = async (roundNumber, earnedPoints, roundType, answers) => {
    if (!userId) return;
    
    const newTotal = userPoints + earnedPoints;
    setUserPoints(newTotal);
    
    if (isTelegramUser) {
      try {
        await fetch('/api/results', {
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
      } catch (error) {
        console.error('Ошибка сохранения в БД:', error);
        localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
      }
    } else {
      localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
    }
    
    setCurrentView('lobby');
  };

  const handleJoinTeam = async () => {
    if (!userId) return;
    
    const teamCode = prompt('Введите код команды:');
    if (!teamCode) return;
    
    if (isTelegramUser) {
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
        } else {
          throw new Error('Ошибка API');
        }
      } catch (error) {
        localStorage.setItem(`sothebeat_team_${userId}`, teamCode);
        setTeamId(teamCode);
        alert(`Команда сохранена локально: ${teamCode}`);
      }
    } else {
      localStorage.setItem(`sothebeat_team_${userId}`, teamCode);
      setTeamId(teamCode);
      alert(`Вы присоединились к команде: ${teamCode} (локально)`);
    }
  };

  // Проверяем доступность игр на основе текущей фазы
  const isGameAvailable = (gameType) => {
    if (currentPhase === gameType) return true; // Активная фаза
    return phases[gameType] || false; // Или разрешенная фаза
  };

  const getPhaseStatus = () => {
    switch (currentPhase) {
      case 'lobby': return { emoji: '🏠', text: 'Ожидание', color: '#888' };
      case 'quiz': return { emoji: '🎯', text: 'Квиз активен', color: '#4a90e2' };
      case 'logic': return { emoji: '��', text: 'Где логика активна', color: '#9c27b0' };
      case 'survey': return { emoji: '📊', text: '100 к 1 активен', color: '#ff9800' };
      case 'auction': return { emoji: '🔥', text: 'Аукцион идет', color: '#f44336' };
      default: return { emoji: '❓', text: currentPhase, color: '#888' };
    }
  };

  if (loading || phaseLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

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
                  <p>{isTelegramUser ? 'Telegram пользователь' : 'Веб пользователь'}</p>
                  
                  <div className="points">
                    Баланс: <span className="points-value">{userPoints}</span>
                  </div>
                  
                  {/* РЕАЛ-ТАЙМ СТАТУС ФАЗЫ */}
                  <div className="phase" style={{ color: getPhaseStatus().color }}>
                    {getPhaseStatus().emoji} Фаза: <span className="phase-value">{getPhaseStatus().text}</span>
                  </div>
                  
                  {teamId && (
                    <div className="team-info">
                      👥 Команда: {teamId}
                    </div>
                  )}
                  
                  {!isTelegramUser && (
                    <div className="web-user-notice">
                      🌐 Веб-версия (данные в браузере)
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
                className={`game-card quiz-card ${!isGameAvailable('quiz') ? 'disabled' : ''}`}
                onClick={() => isGameAvailable('quiz') && setCurrentView('quiz')}
                disabled={!isGameAvailable('quiz')}
              >
                <div className="game-icon">🎯</div>
                <div className="game-info">
                  <h4>Квиз</h4>
                  <p>Раунды с вопросами и вариантами ответов</p>
                  <div className="max-points">Макс: 200 баллов</div>
                  {!isGameAvailable('quiz') && <div className="game-status">Недоступно</div>}
                  {currentPhase === 'quiz' && <div className="game-status active">Активно сейчас!</div>}
                </div>
              </button>

              <button 
                className={`game-card logic-card ${!isGameAvailable('logic') ? 'disabled' : ''}`}
                onClick={() => isGameAvailable('logic') && setCurrentView('logic')}
                disabled={!isGameAvailable('logic')}
              >
                <div className="game-icon">🧩</div>
                <div className="game-info">
                  <h4>Где логика?</h4>
                  <p>Угадай, что объединяет картинки</p>
                  <div className="max-points">Макс: 200 баллов</div>
                  {!isGameAvailable('logic') && <div className="game-status">Недоступно</div>}
                  {currentPhase === 'logic' && <div className="game-status active">Активно сейчас!</div>}
                </div>
              </button>

              <button 
                className={`game-card survey-card ${!isGameAvailable('survey') ? 'disabled' : ''}`}
                onClick={() => isGameAvailable('survey') && setCurrentView('survey')}
                disabled={!isGameAvailable('survey')}
              >
                <div className="game-icon">📊</div>
                <div className="game-info">
                  <h4>100 к 1</h4>
                  <p>Популярные ответы на необычные вопросы</p>
                  <div className="max-points">Макс: 200 баллов</div>
                  {!isGameAvailable('survey') && <div className="game-status">Недоступно</div>}
                  {currentPhase === 'survey' && <div className="game-status active">Активно сейчас!</div>}
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
              className={`auction-button ${!isGameAvailable('auction') ? 'disabled' : ''}`}
              onClick={() => isGameAvailable('auction') && setCurrentView('auction')}
              disabled={!isGameAvailable('auction')}
            >
              <div className="auction-icon">🔥</div>
              <div className="auction-info">
                <h4>Аукцион</h4>
                <p>Ставь баллы — забирай призы</p>
                {!isGameAvailable('auction') && <div className="game-status">Недоступно</div>}
                {currentPhase === 'auction' && <div className="game-status active">Активно сейчас!</div>}
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

            {!isTelegramUser && (
              <div className="telegram-promo">
                <h4>🤖 Лучший опыт в Telegram!</h4>
                <p>Для сохранения прогресса используй бот:</p>
                <a href="https://t.me/sothebeatbot" className="bot-link" target="_blank" rel="noopener noreferrer">
                  Открыть @sothebeatbot
                </a>
              </div>
            )}
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
