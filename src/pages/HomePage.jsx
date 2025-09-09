import React, { useEffect, useState } from 'react';

const HomePage = ({ user }) => {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Получаем данные пользователя из Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      setUserInfo(tg.initDataUnsafe?.user || {
        first_name: 'Тестовый',
        username: 'testuser'
      });
    }
  }, []);

  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img 
          src="https://via.placeholder.com/100x40/4a90e2/white?text=BEAT" 
          alt="Pernod Ricard" 
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ 
          background: 'rgba(74, 144, 226, 0.1)', 
          padding: '15px', 
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3>{userInfo?.first_name || 'Участник события'}</h3>
          <p style={{ opacity: 0.7 }}>Участник события</p>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#4a90e2' 
          }}>
            Баланс: 0
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>
            Фаза: lobby
          </div>
          <div style={{ fontSize: '12px', opacity: 0.5 }}>
            Обновлено: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary card">
          <div>
            <h4>Квиз</h4>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              Раунды с вопросами и вариантами ответов
            </p>
          </div>
        </button>

        <button className="btn btn-secondary card">
          <div>
            <h4>Где логика?</h4>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              Угадай, что объединяет картинки
            </p>
          </div>
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary card">
          <div>
            <h4>Есть контакт!</h4>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              Командные ассоциации — найдите слово
            </p>
          </div>
        </button>

        <button className="btn btn-secondary card">
          <div>
            <h4>100 к 1</h4>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              Популярные ответы на необычные вопросы
            </p>
          </div>
        </button>
      </div>

      <button className="btn btn-primary card" style={{ width: '100%' }}>
        <div>
          <h4>Аукцион</h4>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            Ставь баллы — забирай призы
          </p>
        </div>
      </button>
    </div>
  );
};

export default HomePage;
