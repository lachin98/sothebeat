import React, { useState, useEffect } from 'react';

const QuizRound = ({ questions, onComplete, onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут
  const [startTime] = useState(Date.now());
  const [gameStarted, setGameStarted] = useState(false);

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
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    const questionTime = Date.now() - startTime - (answers.length * 30000);
    const isCorrect = selectedAnswer === questions[currentQuestion].correct;
    
    // Подсчет баллов: базовые + бонус за скорость
    let points = 0;
    if (isCorrect) {
      const basePoints = 10; // 10 баллов за правильный ответ
      const timeBonus = Math.max(0, Math.floor((30 - questionTime/1000) / 3)); // бонус за скорость
      points = basePoints + timeBonus;
    }

    const newAnswer = {
      questionId: questions[currentQuestion].id,
      selectedAnswer,
      correct: questions[currentQuestion].correct,
      isCorrect,
      points,
      timeSpent: questionTime
    };

    setAnswers([...answers, newAnswer]);
    setSelectedAnswer(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0);
    onComplete(totalPoints);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="quiz-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="intro-content">
          <h2>🎯 Квиз про Ballantine's</h2>
          <h3>Виски, достойный короны!</h3>
          
          <div className="game-rules">
            <h4>Правила:</h4>
            <ul>
              <li>10 вопросов с вариантами ответов</li>
              <li>5 минут на все вопросы</li>
              <li>10 баллов за правильный ответ + бонус за скорость</li>
              <li>Максимум 200 баллов за раунд</li>
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

  return (
    <div className="quiz-round">
      <div className="quiz-header">
        <div className="timer">⏱️ {formatTime(timeLeft)}</div>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{currentQuestion + 1}/{questions.length}</span>
        </div>
      </div>

      <div className="question-container">
        <h3 className="question-text">
          {questions[currentQuestion].question}
        </h3>

        <div className="answers-grid">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(index)}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        <button
          className={`next-btn ${selectedAnswer !== null ? 'active' : ''}`}
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null}
        >
          {currentQuestion === questions.length - 1 ? 'Завершить' : 'Следующий вопрос'}
        </button>
      </div>
    </div>
  );
};

export default QuizRound;
