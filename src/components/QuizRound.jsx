import React, { useState, useEffect } from 'react';

const QuizRound = ({ userId, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
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
      const response = await fetch('/api/questions?action=quiz');
      if (response.ok) {
        const data = await response.json();
        // Преобразуем данные из БД в формат компонента
        const formattedQuestions = data.map(q => ({
          id: q.id,
          question: q.question_text,
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          correct: q.correct_answer
        }));
        setQuestions(formattedQuestions);
      } else {
        // Fallback к моковым данным если БД недоступна
        console.warn('Не удалось загрузить вопросы из БД, используем моковые данные');
        setQuestions([
          {
            id: 1,
            question: "Тестовый вопрос",
            options: ["A", "B", "C", "D"],
            correct: 0
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
      // Fallback к моковым данным
      setQuestions([
        {
          id: 1,
          question: "Тестовый вопрос",
          options: ["A", "B", "C", "D"],
          correct: 0
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
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    const questionStartTime = Date.now();
    const isCorrect = selectedAnswer === questions[currentQuestion].correct;
    
    let points = 0;
    if (isCorrect) {
      const basePoints = 10;
      const timeBonus = Math.max(0, Math.floor((30 - (300 - timeLeft)) / 3));
      points = basePoints + timeBonus;
    }

    const newAnswer = {
      questionId: questions[currentQuestion].id,
      selectedAnswer,
      correct: questions[currentQuestion].correct,
      isCorrect,
      points,
      timeSpent: 300 - timeLeft
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishGameWithAnswers(newAnswers);
    }
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
  };

  if (loading) {
    return (
      <div className="quiz-intro">
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
      <div className="quiz-intro">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        
        <div className="intro-content">
          <h2>�� Квиз про Ballantine's</h2>
          <h3>Виски, достойный короны!</h3>
          
          <div className="game-rules">
            <h4>Правила:</h4>
            <ul>
              <li>{questions.length} вопросов с вариантами ответов</li>
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

  if (questions.length === 0) {
    return (
      <div className="quiz-intro">
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
