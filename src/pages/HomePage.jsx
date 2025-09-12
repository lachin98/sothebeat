import React, { useState, useEffect } from 'react';
import { round1Questions, round2Questions, round3Questions, auctionLots } from '../data/gameData';
import QuizRound from '../components/QuizRound';
import LogicRound from '../components/LogicRound';
import SurveyRound from '../components/SurveyRound';
import AuctionRound from '../components/AuctionRound';

const HomePage = ({ user }) => {
  const [currentView, setCurrentView] = useState('lobby');
  const [userPoints, setUserPoints] = useState(0);
  const [userName, setUserName] = useState('Участник');
  const [teamId, setTeamId] = useState(null);

  useEffect(() => {
    if (user) {
      setUserName(user.first_name || user.username || 'Участник');
    }
  }, [user]);

  const handleRoundComplete = (roundNumber, earnedPoints) => {
    setUserPoints(prev => prev + earnedPoints);
    // Здесь отправляем результаты на сервер
    console.log(`Раунд ${roundNumber} завершен. Заработано: ${earnedPoints} баллов`);
    setCurrentView('lobby');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'quiz':
        return (
          <QuizRound
            questions={round1Questions}
            onComplete={(points) => handleRoundComplete(1, points)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'logic':
        return (
          <LogicRound
            questions={round2Questions}
            onComplete={(points) => handleRoundComplete(2, points)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'survey':
        return (
          <SurveyRound
            questions={round3Questions}
            onComplete={(points) => handleRoundComplete(3, points)}
            onBack={() => setCurrentView('lobby')}
          />
        );
      case 'auction':
        return (
          <AuctionRound
            lots={auctionLots}
            userPoints={userPoints}
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
                <div className="game-icon">��</div>
                <div className="game-info">
                  <h4>100 к 1</h4>
                  <p>Популярные ответы на необычные вопросы</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button 
                className="game-card team-card"
                onClick={() => {
                  const teamCode = prompt('Введите код команды:');
                  if (teamCode) {
                    setTeamId(teamCode);
                    alert(`Вы присоединились к команде: ${teamCode}`);
                  }
                }}
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
