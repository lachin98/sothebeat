import { useState, useEffect } from 'react';

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

  const fetchGamePhase = async () => {
    try {
      const response = await fetch('/api/game-phase');
      if (response.ok) {
        const data = await response.json();
        setCurrentPhase(data.currentPhase || 'lobby');
        setPhases(data.phases || {});
        setError(null);
      } else {
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
    
    // Опрос каждые 3 секунды для реал-тайм обновлений
    const interval = setInterval(fetchGamePhase, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    currentPhase,
    phases,
    isLoading,
    error,
    refresh: fetchGamePhase
  };
};
