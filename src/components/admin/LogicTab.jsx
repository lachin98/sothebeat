import React, { useState, useEffect } from 'react';

const LogicTab = ({ adminToken }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    images: ['', '', '', ''],
    correct_answer: '',
    alternatives: ['']
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions?action=logic');
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
          action: 'add_logic_question',
          admin_token: adminToken,
          round_id: 2, // ID логика раунда
          question_text: newQuestion.question_text,
          images: newQuestion.images.filter(img => img.trim()),
          correct_answer: newQuestion.correct_answer,
          alternatives: newQuestion.alternatives.filter(alt => alt.trim()),
          points: 15,
          order_num: questions.length + 1
        })
      });

      if (response.ok) {
        setNewQuestion({
          question_text: '',
          images: ['', '', '', ''],
          correct_answer: '',
          alternatives: ['']
        });
        fetchQuestions();
        alert('Вопрос добавлен!');
      }
    } catch (error) {
      console.error('Ошибка добавления вопроса:', error);
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...newQuestion.images];
    newImages[index] = value;
    setNewQuestion({...newQuestion, images: newImages});
  };

  const handleAlternativeChange = (index, value) => {
    const newAlternatives = [...newQuestion.alternatives];
    newAlternatives[index] = value;
    setNewQuestion({...newQuestion, alternatives: newAlternatives});
  };

  const addAlternative = () => {
    setNewQuestion({
      ...newQuestion,
      alternatives: [...newQuestion.alternatives, '']
    });
  };

  const removeAlternative = (index) => {
    const newAlternatives = newQuestion.alternatives.filter((_, i) => i !== index);
    setNewQuestion({...newQuestion, alternatives: newAlternatives});
  };

  if (loading) {
    return <div>Загрузка вопросов...</div>;
  }

  return (
    <div className="logic-tab">
      <div className="logic-header">
        <h2>🧩 Где логика?</h2>
        <div className="logic-stats">
          Всего вопросов: {questions.length}
        </div>
      </div>

      <div className="logic-content">
        <div className="questions-list">
          <h3>Существующие вопросы</h3>
          {questions.map((question, index) => (
            <div key={question.id} className="logic-question-item">
              <div className="question-header">
                <span className="question-number">#{index + 1}</span>
                <span className="question-points">15 баллов</span>
              </div>
              
              <div className="images-display">
                {Array.isArray(question.images) ? question.images.map((image, imgIndex) => (
                  <div key={imgIndex} className="image-emoji">
                    {image}
                  </div>
                )) : null}
              </div>
              
              <div className="question-text">
                {question.question_text}
              </div>
              
              <div className="correct-answer">
                <strong>Ответ:</strong> {question.correct_answer}
              </div>
              
              <div className="alternatives">
                <strong>Альтернативы:</strong> {
                  Array.isArray(question.alternatives) 
                    ? question.alternatives.join(', ')
                    : question.alternatives
                }
              </div>
            </div>
          ))}
        </div>

        <div className="add-question-form">
          <h3>Добавить новый вопрос</h3>
          
          <div className="form-group">
            <label>Изображения/Эмодзи (4 штуки):</label>
            <div className="images-grid">
              {newQuestion.images.map((image, index) => (
                <input
                  key={index}
                  type="text"
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder={`Изображение ${index + 1} (эмодзи или URL)`}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Текст вопроса:</label>
            <input
              type="text"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
              placeholder="Что объединяет эти изображения?"
            />
          </div>

          <div className="form-group">
            <label>Правильный ответ:</label>
            <input
              type="text"
              value={newQuestion.correct_answer}
              onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
              placeholder="Основной правильный ответ"
            />
          </div>

          <div className="form-group">
            <label>Альтернативные ответы:</label>
            {newQuestion.alternatives.map((alt, index) => (
              <div key={index} className="alternative-input">
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => handleAlternativeChange(index, e.target.value)}
                  placeholder={`Альтернативный ответ ${index + 1}`}
                />
                {newQuestion.alternatives.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeAlternative(index)}
                    className="remove-alt-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={addAlternative}
              className="add-alt-btn"
            >
              + Добавить альтернативу
            </button>
          </div>

          <button 
            className="add-question-btn"
            onClick={handleAddQuestion}
            disabled={!newQuestion.question_text || !newQuestion.correct_answer}
          >
            Добавить вопрос
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogicTab;
