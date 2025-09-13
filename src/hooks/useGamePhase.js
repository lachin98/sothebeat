import { useState, useEffect, useRef } from 'react';

export const useGamePhase = () => {
  const [currentPhase, setCurrentPhase] = useState('lobby');
  const [phases, setPhases] = useState({
    quiz: false,
    logic: false,
    contact: false,
    survey: false,
    auction: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchGamePhase = async () => {
    try {
      console.log('Fetching game phase...');
      const response = await fetch('/api/game-phase?' + Date.now()); // Cache buster
      
      if (response.ok) {
        const data = await response.json();
        console.log('Game phase received:', data);
        
        setCurrentPhase(data.currentPhase || 'lobby');
        setPhases(data.phases || {});
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      } else {
        console.error('Failed to fetch game phase:', response.status);
        setError('Не удалось загрузить состояние игры');
      }
    } catch (error) {
      console.error('Ошибка получения фазы игры:', error);
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Первоначальная загрузка
    fetchGamePhase();
    
    // Опрос каждые 2 секунды для реал-тайм обновлений
    intervalRef.current = setInterval(fetchGamePhase, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Функция для принудительного обновления
  const refresh = () => {
    setIsLoading(true);
    fetchGamePhase();
  };

  return {
    currentPhase,
    phases,
    isLoading,
    error,
    lastUpdate,
    refresh
  };
};
