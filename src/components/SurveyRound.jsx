import React, { useState, useEffect } from 'react';

const SurveyRound = ({ questions, onComplete, onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [revealedAnswers, setRevealedAnswers] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePhase, setGamePhase] = useState('selecting'); // selecting, revealing, next

  useEffect(() => {
    if (!gameStarted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex) => {
    if (gamePhase !== 'selecting') return;
    
    if (selectedAnswers.includes(answerIndex)) {
      setSelectedAnswers(selectedAnswers.filter(index => index !== answerIndex));
    } else if (selectedAnswers.length < 3) {
      setSelectedAnswers([...selectedAnswers, answerIndex]);
    }
  };

  const submitAnswers = () => {
    setGamePhase('revealing');
    
    // Показываем правильные ответы один за другим
    const currentQ = questions[currentQuestion];
    let revealIndex = 0;
    let questionPoints = 0;
    
    const revealNext = () => {
      if (revealIndex < selectedAnswers.length) {
        const answerIndex = selectedAnswers[revealIndex];
        const points = currentQ.answers[answerIndex].points;
        questionPoints += points;
        
        setRevealedAnswers(prev => [...prev, {
          index: answerIndex,
          points: points,
          text: currentQ.answers[answerIndex].text
        }]);
        
        revealIndex++;
        setTimeout(revealNext, 1500);
      } else {
        setTotalPoints(prev => prev + questionPoints);
        setTimeout(() => {
          if (currentQuestion < questions.length - 1) {
            nextQuestion();
          } else {
            finishGame();
          }
        }, 2000);
      }
    };
    
    setTimeout(revealNext, 1000);
  };

  const nextQuestion = () => {
    setCurrentQuestion(currentQuestion + 1);
    setSelectedAnswers([]);
    setRevealedAnswers([]);
    setGamePhase('selecting');
  };

  const finishGame = () => {
    onComplete(totalPoints);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="survey-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="intro-content">
          <h2>📊 100 к 1</h2>
          <h3>Мнение большинства барменов!</h3>
          
          <div className="game-rules">
            <h4>Правила:</h4>
            <ul>
              <li>Выбери 3 самых популярных ответа</li>
              <li>Баллы = популярность ответа среди барменов</li>
              <li>Отвечай как большинство, а не как правильно!</li>
              <li>5 минут на все вопросы</li>
            </ul>
          </div>
          
          <button className="start-game-btn" onClick={startGame}>
            🚀 Начать игру!
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion) / questions.length) * 100;
  const currentQ = questions[currentQuestion];

  return (
    <div className="survey-round">
      <div className="survey-header">
        <div className="timer">⏱️ {formatTime(timeLeft)}</div>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{currentQuestion + 1}/{questions.length}</span>
        </div>
        <div className="total-points">💰 {totalPoints}</div>
      </div>

      <div className="question-container">
        <h3 className="question-text">
          {currentQ.question}
        </h3>
        
        <div className="instruction">
          {gamePhase === 'selecting' && `Выбери ${3 - selectedAnswers.length} ответ${3 - selectedAnswers.length === 1 ? '' : 'а'}`}
          {gamePhase === 'revealing' && 'Смотри результаты...'}
        </div>

        <div className="answers-board">
          {currentQ.answers.map((answer, index) => {
            const isSelected = selectedAnswers.includes(index);
            const isRevealed = revealedAnswers.find(r => r.index === index);
            
            return (
              <button
                key={index}
                className={`survey-answer ${isSelected ? 'selected' : ''} ${isRevealed ? 'revealed' : ''}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={gamePhase !== 'selecting'}
              >
                <span className="answer-text">{answer.text}</span>
                {isRevealed && (
                  <span className="answer-points">
                    {answer.points} очков
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {gamePhase === 'selecting' && (
          <button
            className={`submit-btn ${selectedAnswers.length === 3 ? 'active' : ''}`}
            onClick={submitAnswers}
            disabled={selectedAnswers.length !== 3}
          >
            Проверить ответы
          </button>
        )}

        {revealedAnswers.length > 0 && (
          <div className="revealed-summary">
            <h4>Твои результаты:</h4>
            {revealedAnswers.map((revealed, index) => (
              <div key={index} className="revealed-item">
                {revealed.text}: +{revealed.points} очков
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyRound;
