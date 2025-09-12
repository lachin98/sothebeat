import React, { useState, useEffect } from 'react';
import StatusTab from '../components/admin/StatusTab';
import ConferenceTab from '../components/admin/ConferenceTab';
import InteractivesTab from '../components/admin/InteractivesTab';
import LeaderboardTab from '../components/admin/LeaderboardTab';
import ParticipantsTab from '../components/admin/ParticipantsTab';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [adminToken] = useState('a'); // В реальности будет из формы входа
  const [eventSlug] = useState('pr-demo');

  const tabs = [
    { id: 'status', name: 'Статус' },
    { id: 'conference', name: 'Конференция' },
    { id: 'interactives', name: 'Интерактивы' },
    { id: 'leaderboard', name: 'Лидерборд' },
    { id: 'participants', name: 'Участники' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'status':
        return <StatusTab adminToken={adminToken} />;
      case 'conference':
        return <ConferenceTab adminToken={adminToken} />;
      case 'interactives':
        return <InteractivesTab adminToken={adminToken} />;
      case 'leaderboard':
        return <LeaderboardTab adminToken={adminToken} />;
      case 'participants':
        return <ParticipantsTab adminToken={adminToken} />;
      default:
        return <StatusTab adminToken={adminToken} />;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Админка события</h1>
        <div className="admin-info">
          <div className="info-item">
            <span>Event slug</span>
            <span>{eventSlug}</span>
          </div>
          <div className="info-item">
            <span>Admin token</span>
            <span>{adminToken}</span>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
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
