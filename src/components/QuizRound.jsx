import React, { useState, useEffect } from 'react';
import ResultsScreen from './ResultsScreen';

const QuizRound = ({ userId, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!gameStarted || gameCompleted) return;
    
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
  }, [gameStarted, gameCompleted]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions?action=quiz');
      if (response.ok) {
        const data = await response.json();
        const formattedQuestions = data.map(q => ({
          id: q.id,
          question: q.question_text,
          options: [q.option_a, q.option_b, q.option_c, q.option_d],
          correct: q.correct_answer,
          points: q.points || 10
        }));
        setQuestions(formattedQuestions);
      } else {
        setQuestions([
          {
            id: 1,
            question: "Тестовый вопрос (данные не загружены)",
            options: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
            correct: 0,
            points: 10
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
      setQuestions([{
        id: 1,
        question: "Тестовый вопрос (ошибка сети)",
        options: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
        correct: 0,
        points: 10
      }]);
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
    const currentTime = Date.now();
    const questionTime = startTime ? (currentTime - startTime) / 1000 : 30;
    const isCorrect = selectedAnswer === questions[currentQuestion].correct;
    
    let points = 0;
    if (isCorrect) {
      const basePoints = questions[currentQuestion].points || 10;
      const timeBonus = Math.max(0, Math.floor((30 - Math.min(questionTime, 30)) / 6));
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

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setStartTime(Date.now());

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const totalTime = 300 - timeLeft;
      setTotalTimeSpent(totalTime);
      setGameCompleted(true);
    }
  };

  const finishGame = () => {
    const totalTime = 300 - timeLeft;
    setTotalTimeSpent(totalTime);
    setGameCompleted(true);
  };

  const handleResultsContinue = () => {
    const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0);
    onComplete(totalPoints, answers);
  };

  const startGame = () => {
    setGameStarted(true);
    setStartTime(Date.now());
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

  if (gameCompleted) {
    const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0);
    return (
      <ResultsScreen
        roundType="quiz"
        earnedPoints={totalPoints}
        answers={answers}
        totalQuestions={questions.length}
        timeSpent={totalTimeSpent}
        onContinue={handleResultsContinue}
      />
    );
  }

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
              <li>{questions.length} вопросов с вариантами ответов</li>
              <li>5 минут на все вопросы</li>
              <li>10+ баллов за правильный ответ + бонус за скорость</li>
              <li>Максимум ~{questions.length * 15} баллов за раунд</li>
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
