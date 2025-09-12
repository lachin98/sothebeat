import React, { useState, useEffect } from 'react';

const QuizTab = ({ adminToken }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 0,
    points: 10
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions?action=quiz');
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
    }
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_quiz_question',
          admin_token: adminToken,
          round_id: 1, // ID квиз раунда
          ...newQuestion,
          order_num: questions.length + 1
        })
      });

      if (response.ok) {
        setNewQuestion({
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: 0,
          points: 10
        });
        fetchQuestions();
        alert('Вопрос добавлен!');
      }
    } catch (error) {
      console.error('Ошибка добавления вопроса:', error);
    }
  };

  if (loading) {
    return <div>Загрузка вопросов...</div>;
  }

  return (
    <div className="quiz-tab">
      <div className="quiz-header">
        <h2>🎯 Квиз про Ballantine's</h2>
        <div className="quiz-stats">
          Всего вопросов: {questions.length}
        </div>
      </div>

      <div className="quiz-content">
        <div className="questions-list">
          <h3>Существующие вопросы</h3>
          {questions.map((question, index) => (
            <div key={question.id} className="question-item">
              <div className="question-header">
                <span className="question-number">#{index + 1}</span>
                <span className="question-points">{question.points} баллов</span>
              </div>
              <div className="question-text">
                {question.question_text}
              </div>
              <div className="question-options">
                {[question.option_a, question.option_b, question.option_c, question.option_d].map((option, optIndex) => (
                  <div 
                    key={optIndex} 
                    className={`option ${question.correct_answer === optIndex ? 'correct' : ''}`}
                  >
                    {String.fromCharCode(65 + optIndex)}) {option}
                    {question.correct_answer === optIndex && <span className="correct-mark">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="add-question-form">
          <h3>Добавить новый вопрос</h3>
          <div className="form-group">
            <label>Текст вопроса:</label>
            <textarea
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
              placeholder="Введите текст вопроса"
            />
          </div>

          <div className="options-grid">
            <div className="form-group">
              <label>Вариант A:</label>
              <input
                type="text"
                value={newQuestion.option_a}
                onChange={(e) => setNewQuestion({...newQuestion, option_a: e.target.value})}
                placeholder="Первый вариант ответа"
              />
            </div>
            <div className="form-group">
              <label>Вариант B:</label>
              <input
                type="text"
                value={newQuestion.option_b}
                onChange={(e) => setNewQuestion({...newQuestion, option_b: e.target.value})}
                placeholder="Второй вариант ответа"
              />
            </div>
            <div className="form-group">
              <label>Вариант C:</label>
              <input
                type="text"
                value={newQuestion.option_c}
                onChange={(e) => setNewQuestion({...newQuestion, option_c: e.target.value})}
                placeholder="Третий вариант ответа"
              />
            </div>
            <div className="form-group">
              <label>Вариант D:</label>
              <input
                type="text"
                value={newQuestion.option_d}
                onChange={(e) => setNewQuestion({...newQuestion, option_d: e.target.value})}
                placeholder="Четвертый вариант ответа"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Правильный ответ:</label>
              <select
                value={newQuestion.correct_answer}
                onChange={(e) => setNewQuestion({...newQuestion, correct_answer: parseInt(e.target.value)})}
              >
                <option value={0}>A</option>
                <option value={1}>B</option>
                <option value={2}>C</option>
                <option value={3}>D</option>
              </select>
            </div>
            <div className="form-group">
              <label>Баллы за ответ:</label>
              <input
                type="number"
                value={newQuestion.points}
                onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})}
                min="1"
                max="50"
              />
            </div>
          </div>

          <button 
            className="add-question-btn"
            onClick={handleAddQuestion}
            disabled={!newQuestion.question_text || !newQuestion.option_a}
          >
            Добавить вопрос
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizTab;
