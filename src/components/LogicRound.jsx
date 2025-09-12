import React, { useState, useEffect } from 'react';

const LogicRound = ({ questions, onComplete, onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState('');

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

  const checkAnswer = (userInput, correctAnswers) => {
    const normalizedInput = userInput.toLowerCase().trim();
    return correctAnswers.some(answer => 
      answer.toLowerCase().includes(normalizedInput) || 
      normalizedInput.includes(answer.toLowerCase())
    );
  };

  const handleSubmitAnswer = () => {
    const questionStartTime = Date.now();
    const isCorrect = checkAnswer(userAnswer, questions[currentQuestion].alternatives);
    
    let points = 0;
    if (isCorrect) {
      const basePoints = 15;
      const timeBonus = Math.max(0, Math.floor((60 - (300 - timeLeft)) / 5));
      points = basePoints + timeBonus;
    }

    const newAnswer = {
      questionId: questions[currentQuestion].id,
      userAnswer,
      correctAnswer: questions[currentQuestion].answer,
      isCorrect,
      points,
      timeSpent: 300 - timeLeft
    };

    setAnswers([...answers, newAnswer]);
    
    // Показываем фидбек
    if (isCorrect) {
      setFeedback(`✅ Правильно! +${points} баллов`);
    } else {
      setFeedback(`❌ Неверно. Правильный ответ: ${questions[currentQuestion].answer}`);
    }

    setTimeout(() => {
      setFeedback('');
      setUserAnswer('');
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        finishGame();
      }
    }, 2000);
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
      <div className="logic-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="intro-content">
          <h2>🧩 Где логика?</h2>
          <h3>Угадай, что объединяет картинки!</h3>
          
          <div className="game-rules">
            <h4>Правила:</h4>
            <ul>
              <li>Смотри на 4 картинки и угадывай связь</li>
              <li>5 минут на все вопросы</li>
              <li>15 баллов за правильный ответ + бонус за скорость</li>
              <li>Пиши ответы латинскими буквами</li>
            </ul>
          </div>
          
          <div className="example">
            <h4>Пример:</h4>
            <div className="example-images">
              🌴 🌅 🍍 🍸
            </div>
            <p>Ответ: pina colada</p>
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
    <div className="logic-round">
      <div className="logic-header">
        <div className="timer">⏱️ {formatTime(timeLeft)}</div>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{currentQuestion + 1}/{questions.length}</span>
        </div>
      </div>

      <div className="question-container">
        <div className="images-grid">
          {questions[currentQuestion].images.map((image, index) => (
            <div key={index} className="image-card">
              <div className="image-placeholder">
                {image}
              </div>
            </div>
          ))}
        </div>

        <h3 className="question-text">
          {questions[currentQuestion].question}
        </h3>

        {feedback && (
          <div className={`feedback ${feedback.includes('✅') ? 'correct' : 'incorrect'}`}>
            {feedback}
          </div>
        )}

        <div className="answer-input">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Введи ответ латинскими буквами..."
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            disabled={feedback !== ''}
          />
          <button
            className="submit-btn"
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim() || feedback !== ''}
          >
            Ответить
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogicRound;
