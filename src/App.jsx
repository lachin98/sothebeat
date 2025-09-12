import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import './styles/globals.css';
import './styles/admin.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Проверяем, находимся ли мы на админке
    const isAdminRoute = window.location.pathname.includes('/admin');
    setIsAdmin(isAdminRoute);

    // Инициализация Telegram WebApp только если НЕ админка
    if (!isAdminRoute) {
      // Загружаем Telegram WebApp скрипт динамически
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.onload = () => {
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();
          
          if (tg.initDataUnsafe?.user) {
            setUser(tg.initDataUnsafe.user);
          }
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
