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
  const [loading, setLoading] = useState(true);
  const [isTelegramUser, setIsTelegramUser] = useState(false);

  // Используем хук для отслеживания фазы игры
  const { currentPhase, phases, isLoading: phaseLoading, lastUpdate } = useGamePhase();

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
        setUserPoints(parseInt(savedPoints));
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

  // Проверяем доступность игр на основе текущей фазы
  const isGameAvailable = (gameType) => {
    if (currentPhase === gameType) return true; // Активная фаза
    return phases[gameType] || false; // Или разрешенная фаза
  };

  const getPhaseStatus = () => {
    switch (currentPhase) {
      case 'lobby': return { emoji: '🏠', text: 'Ожидание', color: '#888' };
      case 'quiz': return { emoji: '🎯', text: 'Квиз активен', color: '#4a90e2' };
      case 'logic': return { emoji: '🧩', text: 'Где логика активна', color: '#9c27b0' };
      case 'survey': return { emoji: '📊', text: '100 к 1 активен', color: '#ff9800' };
      case 'auction': return { emoji: '🔥', text: 'Аукцион идет', color: '#f44336' };
      default: return { emoji: '❓', text: currentPhase, color: '#888' };
    }
  };

  if (loading) {
    return (
      <div className="mobile-loading">
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
            userName={userName}
            onBack={() => setCurrentView('lobby')}
          />
        );
      default:
        return (
          <div className="mobile-lobby">
            {/* Логотип и заголовок */}
            <div className="mobile-header">
              <div className="logo">
                <img 
                  src="https://via.placeholder.com/120x50/4a90e2/white?text=SotheBEAT" 
                  alt="SotheBEAT" 
                />
              </div>
              <h1>SotheBEAT 2025</h1>
              <p>Барный аукцион как у Сотбис</p>
            </div>

            {/* Профиль пользователя */}
            <div className="mobile-user-card">
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h3>{userName}</h3>
                <div className="user-type">
                  {isTelegramUser ? '📱 Telegram' : '🌐 Веб'}
                </div>
              </div>
              <div className="user-points">
                <div className="points-label">Баланс</div>
                <div className="points-value">{userPoints.toLocaleString()}</div>
              </div>
            </div>

            {/* Статус игры */}
            <div className="game-status-card" style={{ borderColor: getPhaseStatus().color }}>
              <div className="status-icon">{getPhaseStatus().emoji}</div>
              <div className="status-info">
                <div className="status-text">{getPhaseStatus().text}</div>
                <div className="last-update">
                  �� Live {lastUpdate && `(${lastUpdate})`}
                </div>
              </div>
            </div>

            {/* Игры */}
            <div className="mobile-games">
              <div className="games-grid">
                <button 
                  className={`game-btn quiz-btn ${!isGameAvailable('quiz') ? 'disabled' : ''}`}
                  onClick={() => isGameAvailable('quiz') && setCurrentView('quiz')}
                  disabled={!isGameAvailable('quiz')}
                >
                  <div className="game-icon">🎯</div>
                  <div className="game-title">Квиз</div>
                  <div className="game-subtitle">Ballantine's</div>
                  <div className="game-points">до 200 баллов</div>
                  {currentPhase === 'quiz' && <div className="active-indicator">АКТИВНО</div>}
                  {!isGameAvailable('quiz') && <div className="disabled-indicator">НЕДОСТУПНО</div>}
                </button>

                <button 
                  className={`game-btn logic-btn ${!isGameAvailable('logic') ? 'disabled' : ''}`}
                  onClick={() => isGameAvailable('logic') && setCurrentView('logic')}
                  disabled={!isGameAvailable('logic')}
                >
                  <div className="game-icon">🧩</div>
                  <div className="game-title">Где логика?</div>
                  <div className="game-subtitle">Угадай связь</div>
                  <div className="game-points">до 200 баллов</div>
                  {currentPhase === 'logic' && <div className="active-indicator">АКТИВНО</div>}
                  {!isGameAvailable('logic') && <div className="disabled-indicator">НЕДОСТУПНО</div>}
                </button>

                <button 
                  className={`game-btn survey-btn ${!isGameAvailable('survey') ? 'disabled' : ''}`}
                  onClick={() => isGameAvailable('survey') && setCurrentView('survey')}
                  disabled={!isGameAvailable('survey')}
                >
                  <div className="game-icon">📊</div>
                  <div className="game-title">100 к 1</div>
                  <div className="game-subtitle">Мнение барменов</div>
                  <div className="game-points">до 200 баллов</div>
                  {currentPhase === 'survey' && <div className="active-indicator">АКТИВНО</div>}
                  {!isGameAvailable('survey') && <div className="disabled-indicator">НЕДОСТУПНО</div>}
                </button>

                <button 
                  className={`game-btn auction-btn ${!isGameAvailable('auction') ? 'disabled' : ''}`}
                  onClick={() => isGameAvailable('auction') && setCurrentView('auction')}
                  disabled={!isGameAvailable('auction')}
                >
                  <div className="game-icon">🔥</div>
                  <div className="game-title">Аукцион</div>
                  <div className="game-subtitle">Ставь и выигрывай</div>
                  <div className="game-points">Призы!</div>
                  {currentPhase === 'auction' && <div className="active-indicator">АКТИВНО</div>}
                  {!isGameAvailable('auction') && <div className="disabled-indicator">НЕДОСТУПНО</div>}
                </button>
              </div>
            </div>

            {/* Правила */}
            <div className="mobile-rules">
              <h3>🎮 Правила игры</h3>
              <div className="rules-list">
                <div className="rule-item">
                  <span className="rule-icon">🎯</span>
                  <span className="rule-text">3 раунда викторин по 5 минут</span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">⚡</span>
                  <span className="rule-text">Баллы за правильность + скорость</span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">🏆</span>
                  <span className="rule-text">Максимум 600 баллов всего</span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">🔥</span>
                  <span className="rule-text">Финал — аукцион призов!</span>
                </div>
              </div>
            </div>

            {/* Промо Telegram бота для веб-пользователей */}
            {!isTelegramUser && (
              <div className="telegram-promo">
                <h4>🤖 Играй в Telegram!</h4>
                <p>Для лучшего опыта используй наш бот</p>
                <a 
                  href="https://t.me/sothebeatbot" 
                  className="bot-link"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Открыть @sothebeatbot
                </a>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mobile-app">
      {renderCurrentView()}
    </div>
  );
};

export default HomePage;
