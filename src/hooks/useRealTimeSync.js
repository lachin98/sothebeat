import { useState, useEffect, useCallback } from 'react';

export const useRealTimeSync = () => {
  const [gameState, setGameState] = useState({
    currentPhase: 'lobby',
    phases: { quiz: false, logic: false, contact: false, survey: false, auction: false },
    onlineUsers: 0,
    lastUpdated: null,
    connected: false
  });

  const [eventSource, setEventSource] = useState(null);

  useEffect(() => {
    // Создаем SSE соединение
    const es = new EventSource('/api/websocket');
    setEventSource(es);

    es.onopen = () => {
      console.log('🔗 Подключение к реальному времени установлено');
      setGameState(prev => ({ ...prev, connected: true }));
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'initial_state':
            console.log('📡 Получено начальное состояние:', data);
            setGameState(prev => ({
              ...prev,
              currentPhase: data.currentPhase,
              phases: data.phases,
              onlineUsers: data.onlineUsers,
              lastUpdated: data.lastUpdated,
              connected: true
            }));
            break;

          case 'phase_changed':
            console.log('🔄 Фаза изменена на:', data.phase);
            setGameState(prev => ({
              ...prev,
              currentPhase: data.phase,
              lastUpdated: new Date(data.timestamp).toISOString()
            }));
            break;

          case 'phases_updated':
            console.log('⚙️ Доступные фазы обновлены:', data.phases);
            setGameState(prev => ({
              ...prev,
              phases: data.phases,
              lastUpdated: new Date(data.timestamp).toISOString()
            }));
            break;

          case 'heartbeat':
            // Просто подтверждаем, что соединение живо
            break;

          default:
            console.log('📨 Неизвестное сообщение:', data);
        }
      } catch (error) {
        console.error('Ошибка парсинга SSE сообщения:', error);
      }
    };

    es.onerror = (error) => {
      console.error('❌ Ошибка SSE соединения:', error);
      setGameState(prev => ({ ...prev, connected: false }));
    };

    // Очищаем соединение при размонтировании
    return () => {
      es.close();
    };
  }, []);

  // Функция для отправки обновлений (только для админов)
  const updatePhase = useCallback(async (phase, adminToken) => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'phase_update',
          data: { phase },
          admin_token: adminToken
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления фазы');
      }

      console.log('✅ Фаза обновлена:', phase);
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления фазы:', error);
      return false;
    }
  }, []);

  const togglePhase = useCallback(async (phase, adminToken) => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'phase_toggle',
          data: { phase },
          admin_token: adminToken
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка переключения фазы');
      }

      console.log('✅ Фаза переключена:', phase);
      return true;
    } catch (error) {
      console.error('❌ Ошибка переключения фазы:', error);
      return false;
    }
  }, []);

  return {
    gameState,
    updatePhase,
    togglePhase
  };
};
