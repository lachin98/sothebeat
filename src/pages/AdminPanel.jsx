import React, { useState, useEffect } from 'react';
import ConferenceTab from '../components/admin/ConferenceTab';
import QuizTab from '../components/admin/QuizTab';
import LogicTab from '../components/admin/LogicTab';
import SurveyTab from '../components/admin/SurveyTab';
import AuctionTab from '../components/admin/AuctionTab';
import LeaderboardTab from '../components/admin/LeaderboardTab';
import ParticipantsTab from '../components/admin/ParticipantsTab';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('conference');
  const [adminToken] = useState('a');
  const [eventSlug] = useState('pr-demo');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (password === 'sothebeat2025') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_authenticated', 'true');
    } else {
      alert('Неверный пароль!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
    setActiveTab('conference');
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h1>🔐 Админ панель SotheBEAT</h1>
          <div className="login-form">
            <input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin}>Войти</button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'conference', name: 'Конференция', icon: '🎪' },
    { id: 'quiz', name: 'Квиз', icon: '🎯' },
    { id: 'logic', name: 'Где логика?', icon: '🧩' },
    { id: 'survey', name: '100 к 1', icon: '📋' },
    { id: 'auction', name: 'Аукцион', icon: '🏛️' },
    { id: 'leaderboard', name: 'Лидерборд', icon: '🏆' },
    { id: 'participants', name: 'Участники', icon: '👥' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'conference':
        return <ConferenceTab adminToken={adminToken} />;
      case 'quiz':
        return <QuizTab adminToken={adminToken} />;
      case 'logic':
        return <LogicTab adminToken={adminToken} />;
      case 'survey':
        return <SurveyTab adminToken={adminToken} />;
      case 'auction':
        return <AuctionTab adminToken={adminToken} />;
      case 'leaderboard':
        return <LeaderboardTab adminToken={adminToken} />;
      case 'participants':
        return <ParticipantsTab adminToken={adminToken} />;
      default:
        return <ConferenceTab adminToken={adminToken} />;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-title">
          <h1>Админка SotheBEAT 2025</h1>
          <div className="admin-info">
            <div className="info-item">
              <span>Event</span>
              <span>{eventSlug}</span>
            </div>
            <div className="info-item">
              <span>Token</span>
              <span>{adminToken}</span>
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Выход
        </button>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPanel;
