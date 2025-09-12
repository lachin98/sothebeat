import React, { useState, useEffect } from 'react';

const LogicRound = ({ userId, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);

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
      const response = await fetch('/api/questions?action=logic');
      if (response.ok) {
        const data = await response.json();
        // Преобразуем данные из БД в формат компонента
        const formattedQuestions = data.map(q => ({
          id: q.id,
          images: Array.isArray(q.images) ? q.images : [],
          question: q.question_text,
          answer: q.correct_answer,
          alternatives: Array.isArray(q.alternatives) ? q.alternatives : [q.alternatives].filter(Boolean),
          points: q.points || 15
        }));
        setQuestions(formattedQuestions);
      } else {
        console.warn('Не удалось загрузить вопросы из БД');
        setQuestions([
          {
            id: 1,
            images: ["🎯", "❓", "📱", "⚠️"],
            question: "Что за проблема? (тестовый вопрос)",
            answer: "ошибка загрузки",
            alternatives: ["ошибка загрузки", "сеть"],
            points: 15
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
      setQuestions([
        {
          id: 1,
          images: ["🌐", "❌", "📡", "💻"],
          question: "Что за проблема? (ошибка сети)",
          answer: "нет сети",
          alternatives: ["нет сети", "ошибка"],
          points: 15
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

  const checkAnswer = (userInput, correctAnswers) => {
    const normalizedInput = userInput.toLowerCase().trim();
    return correctAnswers.some(answer => {
      const normalizedAnswer = answer.toLowerCase().trim();
      return normalizedAnswer.includes(normalizedInput) || 
             normalizedInput.includes(normalizedAnswer) ||
             normalizedAnswer === normalizedInput;
    });
  };

  const handleSubmitAnswer = () => {
    const currentTime = Date.now();
    const questionTime = startTime ? (currentTime - startTime) / 1000 : 60;
    const isCorrect = checkAnswer(userAnswer, [questions[currentQuestion].answer, ...questions[currentQuestion].alternatives]);
    
    let points = 0;
    if (isCorrect) {
      const basePoints = questions[currentQuestion].points || 15;
      // Бонус за скорость: чем быстрее ответ, тем больше бонус (макс +10 баллов)
      const timeBonus = Math.max(0, Math.floor((60 - Math.min(questionTime, 60)) / 6));
      points = basePoints + timeBonus;
    }

    const newAnswer = {
      questionId: questions[currentQuestion].id,
      userAnswer,
      correctAnswer: questions[currentQuestion].answer,
      isCorrect,
      points,
      timeSpent: questionTime
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    
    // Показываем фидбек
    if (isCorrect) {
      setFeedback(`✅ Правильно! +${points} баллов`);
    } else {
      setFeedback(`❌ Неверно. Правильный ответ: ${questions[currentQuestion].answer}`);
    }

    setTimeout(() => {
      setFeedback('');
      setUserAnswer('');
      setStartTime(Date.now()); // Сбрасываем время для следующего вопроса
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        finishGameWithAnswers(newAnswers);
      }
    }, 2000);
  };

  const finishGame = () => {
    finishGameWithAnswers(answers);
  };

  const finishGameWithAnswers = (finalAnswers) => {
    const totalPoints = finalAnswers.reduce((sum, answer) => sum + answer.points, 0);
    onComplete(totalPoints, finalAnswers);
  };

  const startGame = () => {
    setGameStarted(true);
    setStartTime(Date.now());
  };

  if (loading) {
    return (
      <div className="logic-intro">
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
      <div className="logic-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="intro-content">
          <h2>🧩 Где логика?</h2>
          <h3>Угадай, что объединяет картинки!</h3>
          
          <div className="game-rules">
            <h4>Правила:</h4>
            <ul>
              <li>Смотри на картинки и угадывай связь</li>
              <li>5 минут на все вопросы</li>
              <li>15+ баллов за правильный ответ + бонус за скорость</li>
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

  if (questions.length === 0) {
    return (
      <div className="logic-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="error-screen">
          <h2>⚠️ Вопросы не загружены</h2>
          <p>Попробуйте обновить страницу или обратитесь к администратору</p>
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
            onKeyPress={(e) => e.key === 'Enter' && userAnswer.trim() && !feedback && handleSubmitAnswer()}
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
