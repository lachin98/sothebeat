import React, { useState, useEffect } from 'react';

const InteractivesTab = ({ adminToken }) => {
  const [rounds, setRounds] = useState([
    { id: 1, name: 'Квиз про Ballantine\'s', type: 'quiz', questions: 10, status: 'ready' },
    { id: 2, name: 'Где логика?', type: 'logic', questions: 10, status: 'ready' },
    { id: 3, name: '100 к 1', type: 'survey', questions: 10, status: 'ready' }
  ]);

  const [selectedRound, setSelectedRound] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState({
    text: '',
    variants: ['', '', '', ''],
    correctIndex: 0
  });

  const startRound = async (roundId) => {
    alert(`Запущен раунд ${roundId}`);
  };

  const nextQuestion = async (roundId) => {
    alert(`Следующий вопрос в раунде ${roundId}`);
  };

  const finishRound = async (roundId) => {
    alert(`Раунд ${roundId} завершен`);
  };

  const addQuestion = () => {
    // Логика добавления вопроса
    alert('Вопрос добавлен');
  };

  const updateSelected = () => {
    alert('Вопрос обновлен');
  };

  const deleteSelected = () => {
    alert('Вопрос удален');
  };

  return (
    <div className="interactives-tab">
      <h3>Квиз — раунды и вопросы</h3>
      
      <div className="rounds-section">
        <div className="rounds-list">
          <div className="rounds-header">
            <span>Название раунда</span>
            <div className="round-actions">
              <button className="btn btn-primary">Сохранить</button>
              <button className="btn btn-secondary">Открыть</button>
              <button className="btn btn-secondary">Закрыть</button>
            </div>
          </div>
          
          {rounds.map(round => (
            <div key={round.id} className="round-item">
              <span>{round.name}</span>
              <div className="round-controls">
                <button 
                  className="btn btn-small btn-primary"
                  onClick={() => startRound(round.id)}
                >
                  Старт раунда
                </button>
                <button 
                  className="btn btn-small btn-primary"
                  onClick={() => nextQuestion(round.id)}
                >
                  Следующий вопрос
                </button>
                <button 
                  className="btn btn-small btn-primary"
                  onClick={() => finishRound(round.id)}
                >
                  Начислить (+10)
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="question-editor">
          <div className="selected-round">
            <span>Выбранный раунд: —</span>
          </div>
          
          <div className="question-form">
            <textarea
              placeholder="Текст вопроса"
              value={editingQuestion.text}
              onChange={(e) => setEditingQuestion({
                ...editingQuestion,
                text: e.target.value
              })}
            />

            <div className="variants-grid">
              {editingQuestion.variants.map((variant, index) => (
                <input
                  key={index}
                  placeholder={`Вариант ${index + 1}`}
                  value={variant}
                  onChange={(e) => {
                    const newVariants = [...editingQuestion.variants];
                    newVariants[index] = e.target.value;
                    setEditingQuestion({
                      ...editingQuestion,
                      variants: newVariants
                    });
                  }}
                />
              ))}
            </div>

            <div className="correct-answer">
              <span>Правильный индекс:</span>
              <input
                type="number"
                min="0"
                max="3"
                value={editingQuestion.correctIndex}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  correctIndex: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="question-actions">
              <button className="btn btn-primary" onClick={addQuestion}>
                Добавить вопрос
              </button>
              <button className="btn btn-primary" onClick={updateSelected}>
                Обновить выбранный
              </button>
              <button className="btn btn-danger" onClick={deleteSelected}>
                Удалить выбранный
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractivesTab;
