import React, { useState, useEffect } from 'react';

const ResultsScreen = ({ 
  roundType, 
  earnedPoints, 
  answers, 
  totalQuestions, 
  timeSpent,
  onContinue 
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    // Анимация появления статистики
    const timer = setTimeout(() => {
      setShowAnimation(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showAnimation && currentStat < 4) {
      const timer = setTimeout(() => {
        setCurrentStat(prev => prev + 1);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [showAnimation, currentStat]);

  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const avgTime = totalQuestions > 0 ? Math.round(timeSpent / totalQuestions) : 0;

  const getRank = () => {
    if (accuracy >= 90) return { emoji: '🏆', title: 'МАСТЕР', color: '#FFD700' };
    if (accuracy >= 75) return { emoji: '🥇', title: 'ЭКСПЕРТ', color: '#4CAF50' };
    if (accuracy >= 60) return { emoji: '🥈', title: 'ЗНАТОК', color: '#2196F3' };
    if (accuracy >= 40) return { emoji: '🥉', title: 'НОВИЧОК', color: '#FF9800' };
    return { emoji: '📚', title: 'УЧЕНИК', color: '#9E9E9E' };
  };

  const rank = getRank();

  const getRoundTitle = () => {
    switch(roundType) {
      case 'quiz': return 'Квиз про Ballantine\'s';
      case 'logic': return 'Где логика?';
      case 'survey': return '100 к 1';
      default: return 'Игра';
    }
  };

  const getEncouragement = () => {
    if (accuracy >= 90) return 'Невероятно! Ты настоящий барный гуру! 🎯';
    if (accuracy >= 75) return 'Отлично! Ты знаешь толк в барном деле! 🍸';
    if (accuracy >= 60) return 'Хорошо! Продолжай изучать мир коктейлей! 🥃';
    if (accuracy >= 40) return 'Неплохо! Есть к чему стремиться! 📈';
    return 'Не расстраивайся, опыт приходит с практикой! 💪';
  };

  return (
    <div className="results-screen">
      <div className="results-container">
        {/* Заголовок */}
        <div className="results-header">
          <h2>🎉 Раунд завершен!</h2>
          <h3>{getRoundTitle()}</h3>
        </div>

        {/* Главный счет */}
        <div className={`main-score ${showAnimation ? 'animate-in' : ''}`}>
          <div className="score-circle">
            <div className="score-number">{earnedPoints}</div>
            <div className="score-label">БАЛЛОВ</div>
          </div>
          
          <div className="rank-badge" style={{ borderColor: rank.color }}>
            <div className="rank-emoji">{rank.emoji}</div>
            <div className="rank-title" style={{ color: rank.color }}>{rank.title}</div>
          </div>
        </div>

        {/* Детальная статистика */}
        <div className="stats-grid">
          <div className={`stat-item ${currentStat >= 0 ? 'show' : ''}`}>
            <div className="stat-icon">✅</div>
            <div className="stat-value">{correctAnswers}</div>
            <div className="stat-label">Правильных ответов</div>
          </div>
          
          <div className={`stat-item ${currentStat >= 1 ? 'show' : ''}`}>
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">Точность</div>
          </div>
          
          <div className={`stat-item ${currentStat >= 2 ? 'show' : ''}`}>
            <div className="stat-icon">⚡</div>
            <div className="stat-value">{avgTime}с</div>
            <div className="stat-label">Среднее время</div>
          </div>
          
          <div className={`stat-item ${currentStat >= 3 ? 'show' : ''}`}>
            <div className="stat-icon">🏁</div>
            <div className="stat-value">{Math.round(timeSpent / 60)}:{String(Math.round(timeSpent % 60)).padStart(2, '0')}</div>
            <div className="stat-label">Общее время</div>
          </div>
        </div>

        {/* Мотивационное сообщение */}
        <div className={`encouragement ${currentStat >= 4 ? 'show' : ''}`}>
          <p>{getEncouragement()}</p>
        </div>

        {/* Детали по вопросам (только для квиза и логики) */}
        {(roundType === 'quiz' || roundType === 'logic') && (
          <div className={`answers-breakdown ${currentStat >= 4 ? 'show' : ''}`}>
            <h4>📋 Детали по вопросам:</h4>
            <div className="answers-list">
              {answers.slice(0, 5).map((answer, index) => (
                <div key={index} className={`answer-detail ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                  <span className="question-num">#{index + 1}</span>
                  <span className="answer-status">
                    {answer.isCorrect ? '✅' : '❌'}
                  </span>
                  <span className="answer-points">+{answer.points}</span>
                </div>
              ))}
              {answers.length > 5 && (
                <div className="more-answers">
                  ... и еще {answers.length - 5} вопросов
                </div>
              )}
            </div>
          </div>
        )}

        {/* Кнопка продолжить */}
        <button 
          className={`continue-btn ${currentStat >= 4 ? 'show' : ''}`}
          onClick={onContinue}
        >
          🚀 Продолжить игру
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
