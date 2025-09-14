import { useState, useEffect, useRef } from 'react';

export const useUserPoints = (userId, initialPoints = 0, isTelegramUser = false) => {
  const [userPoints, setUserPoints] = useState(initialPoints);
  const [isUpdating, setIsUpdating] = useState(false);
  const intervalRef = useRef(null);

  // Функция для получения баллов с сервера
  const fetchUserPoints = async () => {
    if (!userId || !isTelegramUser) return;
    
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/users?action=profile&user_id=${userId}&_t=${Date.now()}`);
      if (response.ok) {
        const userData = await response.json();
        const newPoints = userData.total_points || 0;
        
        // Обновляем только если баллы изменились
        if (newPoints !== userPoints) {
          console.log(`💰 Points updated: ${userPoints} → ${newPoints}`);
          setUserPoints(newPoints);
        }
      }
    } catch (error) {
      console.error('Ошибка обновления баллов:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Запускаем live обновления для Telegram пользователей
  useEffect(() => {
    if (!userId || !isTelegramUser) {
      setUserPoints(initialPoints);
      return;
    }

    // Сразу устанавливаем начальные баллы
    setUserPoints(initialPoints);

    // Запускаем периодическое обновление каждые 3 секунды
    intervalRef.current = setInterval(fetchUserPoints, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, isTelegramUser, initialPoints]);

  // Обновляем баллы извне (после завершения игры, ставки и т.д.)
  const updatePoints = (newPoints) => {
    console.log(`🎯 Manual points update: ${userPoints} → ${newPoints}`);
    setUserPoints(newPoints);
    
    // Для веб-пользователей сохраняем в localStorage
    if (!isTelegramUser && userId) {
      localStorage.setItem(`sothebeat_points_${userId}`, newPoints.toString());
    }
  };

  // Принудительное обновление
  const refreshPoints = async () => {
    await fetchUserPoints();
  };

  return {
    userPoints,
    isUpdating,
    updatePoints,
    refreshPoints
  };
};
