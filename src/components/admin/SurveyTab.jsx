import React, { useState, useEffect } from 'react';

const SurveyTab = ({ adminToken }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    answers: [{ text: '', points: 0 }]
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions?action=survey');
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
      const validAnswers = newQuestion.answers.filter(ans => ans.text.trim() && ans.points > 0);
      
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_survey_question',
          admin_token: adminToken,
          round_id: 3, // ID опрос раунда
          question_text: newQuestion.question_text,
          answers: validAnswers,
          order_num: questions.length + 1
        })
      });

      if (response.ok) {
        setNewQuestion({
          question_text: '',
          answers: [{ text: '', points: 0 }]
        });
        fetchQuestions();
        alert('Вопрос добавлен!');
      }
    } catch (error) {
      console.error('Ошибка добавления вопроса:', error);
    }
  };

  const handleAnswerChange = (index, field, value) => {
    const newAnswers = [...newQuestion.answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setNewQuestion({...newQuestion, answers: newAnswers});
  };

  const addAnswer = () => {
    setNewQuestion({
      ...newQuestion,
      answers: [...newQuestion.answers, { text: '', points: 0 }]
    });
  };

  const removeAnswer = (index) => {
    const newAnswers = newQuestion.answers.filter((_, i) => i !== index);
    setNewQuestion({...newQuestion, answers: newAnswers});
  };

  if (loading) {
    return <div>Загрузка вопросов...</div>;
  }

  return (
    <div className="survey-tab">
      <div className="survey-header">
        <h2>📋 100 к 1</h2>
        <div className="survey-stats">
          Всего вопросов: {questions.length}
        </div>
      </div>

      <div className="survey-content">
        <div className="questions-list">
          <h3>Существующие вопросы</h3>
          {questions.map((question, index) => (
            <div key={question.id} className="survey-question-item">
              <div className="question-header">
                <span className="question-number">#{index + 1}</span>
              </div>
              
              <div className="question-text">
                {question.question_text}
              </div>
              
              <div className="answers-list">
                {Array.isArray(question.answers) ? question.answers
                  .sort((a, b) => b.points - a.points)
                  .map((answer, ansIndex) => (
                  <div key={ansIndex} className="answer-item">
                    <span className="answer-text">{answer.text}</span>
                    <span className="answer-points">{answer.points} очков</span>
                  </div>
                )) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="add-question-form">
          <h3>Добавить новый вопрос</h3>
          
          <div className="form-group">
            <label>Текст вопроса:</label>
            <input
              type="text"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
              placeholder="Например: 'Что бармены ненавидят готовить?'"
            />
          </div>

          <div className="form-group">
            <label>Ответы (отсортированы по популярности):</label>
            {newQuestion.answers.map((answer, index) => (
              <div key={index} className="answer-input-row">
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
                  placeholder="Текст ответа"
                  className="answer-text-input"
                />
                <input
                  type="number"
                  value={answer.points}
                  onChange={(e) => handleAnswerChange(index, 'points', parseInt(e.target.value) || 0)}
                  placeholder="Очки"
                  min="1"
                  max="100"
                  className="answer-points-input"
                />
                {newQuestion.answers.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeAnswer(index)}
                    className="remove-answer-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button 
              type="button"
              onClick={addAnswer}
              className="add-answer-btn"
            >
              + Добавить ответ
            </button>
          </div>

          <div className="form-hint">
            💡 Совет: Добавляйте ответы в порядке убывания популярности (больше очков = популярнее)
          </div>

          <button 
            className="add-question-btn"
            onClick={handleAddQuestion}
            disabled={!newQuestion.question_text || newQuestion.answers.filter(a => a.text && a.points > 0).length < 2}
          >
            Добавить вопрос
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyTab;
