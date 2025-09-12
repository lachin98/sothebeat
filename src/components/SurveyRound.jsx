import React, { useState, useEffect } from 'react';

const SurveyRound = ({ userId, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [revealedAnswers, setRevealedAnswers] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePhase, setGamePhase] = useState('selecting'); // selecting, revealing, next
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

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

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions?action=survey');
      if (response.ok) {
        const data = await response.json();
        // Преобразуем данные из БД в формат компонента
        const formattedQuestions = data.map(q => ({
          id: q.id,
          question: q.question_text,
          answers: Array.isArray(q.answers) ? q.answers.sort((a, b) => b.points - a.points) : []
        }));
        setQuestions(formattedQuestions);
      } else {
        console.warn('Не удалось загрузить вопросы из БД');
        setQuestions([
          {
            id: 1,
            question: "Тестовый вопрос (данные не загружены)",
            answers: [
              { text: "Тестовый ответ 1", points: 50 },
              { text: "Тестовый ответ 2", points: 30 },
              { text: "Тестовый ответ 3", points: 20 }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
      setQuestions([
        {
          id: 1,
          question: "Тестовый вопрос (ошибка сети)",
          answers: [
            { text: "Ошибка загрузки", points: 100 }
          ]
        }
      ]);
    }
    setLoading(false);
  };

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
            finishGameWithPoints(totalPoints + questionPoints);
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
    finishGameWithPoints(totalPoints);
  };

  const finishGameWithPoints = (finalPoints) => {
    const allAnswers = questions.slice(0, currentQuestion + 1).map((q, index) => ({
      questionId: q.id,
      selectedAnswers: index === currentQuestion ? selectedAnswers : [],
      points: index === currentQuestion ? (totalPoints - (questions.slice(0, index).reduce((sum, _, i) => sum + 0, 0))) : 0
    }));
    onComplete(finalPoints, allAnswers);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (loading) {
    return (
      <div className="survey-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Загрузка вопросов...</p>
        </div>
      </div>
    );
  }

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

  if (questions.length === 0) {
    return (
      <div className="survey-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="error-screen">
          <h2>⚠️ Вопросы не загружены</h2>
          <p>Попробуйте обновить страницу или обратитесь к администратору</p>
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
          {gamePhase === 'selecting' && (
            selectedAnswers.length < 3 ? 
            `Выбери ${3 - selectedAnswers.length} ответ${3 - selectedAnswers.length === 1 ? '' : 'а'}` :
            'Готов? Проверь свои ответы!'
          )}
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
