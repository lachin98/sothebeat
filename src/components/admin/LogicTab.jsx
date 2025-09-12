import React, { useState, useEffect } from 'react';

const LogicTab = ({ adminToken }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
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
          round_id: 2,
          question_text: newQuestion.question_text,
          images: newQuestion.images.filter(img => img.trim()),
          correct_answer: newQuestion.correct_answer,
          alternatives: newQuestion.alternatives.filter(alt => alt.trim()),
          points: 15,
          order_num: questions.length + 1
        })
      });

      if (response.ok) {
        resetForm();
        fetchQuestions();
        alert('✅ Вопрос добавлен!');
      } else {
        alert('❌ Ошибка добавления');
      }
    } catch (error) {
      console.error('Ошибка добавления вопроса:', error);
      alert('❌ Ошибка сети');
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question.id);
    setNewQuestion({
      question_text: question.question_text,
      images: Array.isArray(question.images) ? [...question.images, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correct_answer: question.correct_answer,
      alternatives: Array.isArray(question.alternatives) ? [...question.alternatives] : [question.alternatives || '']
    });
  };

  const handleUpdateQuestion = async () => {
    try {
      const response = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_logic_question',
          admin_token: adminToken,
          question_id: editingQuestion,
          question_text: newQuestion.question_text,
          images: newQuestion.images.filter(img => img.trim()),
          correct_answer: newQuestion.correct_answer,
          alternatives: newQuestion.alternatives.filter(alt => alt.trim()),
          points: 15
        })
      });

      if (response.ok) {
        resetForm();
        fetchQuestions();
        alert('✅ Вопрос обновлен!');
      } else {
        alert('❌ Ошибка обновления');
      }
    } catch (error) {
      console.error('Ошибка обновления вопроса:', error);
      alert('❌ Ошибка сети');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('🗑️ Удалить этот вопрос навсегда?')) return;

    try {
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_logic_question',
          admin_token: adminToken,
          question_id: questionId
        })
      });

      if (response.ok) {
        fetchQuestions();
        alert('✅ Вопрос удален!');
      } else {
        alert('❌ Ошибка удаления');
      }
    } catch (error) {
      console.error('Ошибка удаления вопроса:', error);
      alert('❌ Ошибка сети');
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

  const resetForm = () => {
    setEditingQuestion(null);
    setNewQuestion({
      question_text: '',
      images: ['', '', '', ''],
      correct_answer: '',
      alternatives: ['']
    });
  };

  if (loading) {
    return <div className="loading">Загрузка вопросов...</div>;
  }

  return (
    <div className="logic-tab">
      <div className="tab-header">
        <h2>🧩 Где логика?</h2>
        <div className="tab-stats">
          Всего вопросов: {questions.length}
        </div>
      </div>

      <div className="tab-content">
        <div className="questions-list">
          <h3>Существующие вопросы</h3>
          
          {questions.length === 0 ? (
            <div className="empty-state">
              <h4>Пока нет вопросов</h4>
              <p>Добавьте первый вопрос в форме справа →</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="logic-question-item">
                <div className="question-header">
                  <span className="question-number">#{index + 1}</span>
                  <span className="question-points">15 баллов</span>
                </div>
                
                <div className="question-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditQuestion(question)}
                    title="Редактировать вопрос"
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteQuestion(question.id)}
                    title="Удалить вопрос"
                  >
                    🗑️
                  </button>
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
            ))
          )}
        </div>

        <div className="add-question-form">
          <h3>{editingQuestion ? '✏️ Редактировать вопрос' : '➕ Добавить новый вопрос'}</h3>
          
          <div className="form-group">
            <label>Изображения/Эмодзи (до 4 штук):</label>
            <div className="images-grid">
              {newQuestion.images.map((image, index) => (
                <input
                  key={index}
                  type="text"
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder={`🖼️ Изображение ${index + 1}`}
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
              placeholder="❓ Что объединяет эти изображения?"
            />
          </div>

          <div className="form-group">
            <label>Правильный ответ:</label>
            <input
              type="text"
              value={newQuestion.correct_answer}
              onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
              placeholder="✅ Основной правильный ответ"
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
                  placeholder={`🔄 Альтернативный ответ ${index + 1}`}
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
              ➕ Добавить альтернативу
            </button>
          </div>

          <div className="form-buttons">
            {editingQuestion ? (
              <>
                <button 
                  className="add-question-btn"
                  onClick={handleUpdateQuestion}
                  disabled={!newQuestion.question_text || !newQuestion.correct_answer}
                >
                  💾 Сохранить изменения
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  ❌ Отмена
                </button>
              </>
            ) : (
              <button 
                className="add-question-btn"
                onClick={handleAddQuestion}
                disabled={!newQuestion.question_text || !newQuestion.correct_answer}
              >
                ➕ Добавить вопрос
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicTab;
