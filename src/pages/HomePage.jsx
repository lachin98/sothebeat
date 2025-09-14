import React, { useState, useEffect } from "react";
import { useGamePhase } from "../hooks/useGamePhase";
import { useUserPoints } from "../hooks/useUserPoints";
import QuizRound from "../components/QuizRound";
import LogicRound from "../components/LogicRound";
import SurveyRound from "../components/SurveyRound";
import AuctionRound from "../components/AuctionRound";

const HomePage = ({ user }) => {
  const [currentView, setCurrentView] = useState("lobby");
  const [userName, setUserName] = useState("Участник");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTelegramUser, setIsTelegramUser] = useState(false);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [initialPoints, setInitialPoints] = useState(0);

  // Используем хук для отслеживания фазы игры
  const {
    currentPhase,
    phases,
    isLoading: phaseLoading,
    lastUpdate,
  } = useGamePhase();

  // Используем хук для live обновления баллов
  const { userPoints, isUpdating, updatePoints, refreshPoints } = useUserPoints(
    userId,
    initialPoints,
    isTelegramUser
  );

  useEffect(() => {
    if (user && user.id) {
      setUserName(user.first_name || user.username || "Участник");
      setUserId(user.id);

      const isTgUser = user.id < 999999999999;
      setIsTelegramUser(isTgUser);

      if (isTgUser) {
        fetchUserProfile(user.id);
      } else {
        const savedPoints =
          localStorage.getItem(`sothebeat_points_${user.id}`) || "0";
        const savedCompleted = localStorage.getItem(
          `sothebeat_completed_${user.id}`
        );
        const points = parseInt(savedPoints);
        setInitialPoints(points);
        setCompletedRounds(savedCompleted ? JSON.parse(savedCompleted) : []);
        setLoading(false);
      }
    } else {
      const guestId = Date.now();
      setUserName("Гость");
      setUserId(guestId);
      setIsTelegramUser(false);
      setInitialPoints(0);
      setCompletedRounds([]);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async (uid) => {
    try {
      const response = await fetch(`/api/users?action=profile&user_id=${uid}`);
      if (response.ok) {
        const userData = await response.json();
        const points = userData.total_points || 0;
        setInitialPoints(points);

        // Получаем завершенные раунды
        const resultsResponse = await fetch(
          `/api/results?action=user_results&user_id=${uid}`
        );
        if (resultsResponse.ok) {
          const results = await resultsResponse.json();
          const completed = results.map((r) => r.round_type);
          setCompletedRounds(completed);
        }
      } else {
        setInitialPoints(0);
        setCompletedRounds([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
      setInitialPoints(0);
      setCompletedRounds([]);
    }
    setLoading(false);
  };

  const handleRoundComplete = async (
    roundNumber,
    earnedPoints,
    roundType,
    answers
  ) => {
    if (!userId) return;

    const newTotal = userPoints + earnedPoints;
    updatePoints(newTotal);

    // Добавляем раунд к завершенным
    const newCompleted = [...completedRounds, roundType];
    setCompletedRounds(newCompleted);

    if (isTelegramUser) {
      try {
        await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_round_result",
            user_id: userId,
            round_id: roundNumber,
            round_type: roundType,
            points_earned: earnedPoints,
            total_time: 300,
            answers: answers,
          }),
        });

        // Принудительно обновляем баллы после сохранения
        setTimeout(() => refreshPoints(), 1000);
      } catch (error) {
        console.error("Ошибка сохранения в БД:", error);
        localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
        localStorage.setItem(
          `sothebeat_completed_${userId}`,
          JSON.stringify(newCompleted)
        );
      }
    } else {
      localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
      localStorage.setItem(
        `sothebeat_completed_${userId}`,
        JSON.stringify(newCompleted)
      );
    }

    setCurrentView("lobby");
  };

  // Проверяем доступность игр на основе текущей фазы
  const isGameAvailable = (gameType) => {
    if (currentPhase === gameType) return true; // Активная фаза
    return phases[gameType] || false; // Или разрешенная фаза
  };

  // Проверяем завершенность игр
  const isGameCompleted = (gameType) => {
    return completedRounds.includes(gameType);
  };

  const handleGameStart = (gameType, viewName) => {
    if (isGameCompleted(gameType)) {
      alert(
        `🎯 Вы уже прошли этот раунд!\n\nВы получили за него баллы и не можете пройти повторно.\nВсего раундов завершено: ${completedRounds.length}/3`
      );
      return;
    }

    if (isGameAvailable(gameType)) {
      setCurrentView(viewName);
    }
  };

  const getPhaseStatus = () => {
    switch (currentPhase) {
      case "lobby":
        return { emoji: "🏠", text: "Ожидание", color: "#FFC72C" };
      case "quiz":
        return { emoji: "🎯", text: "Квиз активен", color: "#FFC72C" };
      case "logic":
        return { emoji: "🧩", text: "Где логика активна", color: "#FFC72C" };
      case "survey":
        return { emoji: "📊", text: "100 к 1 активен", color: "#FFC72C" };
      case "auction":
        return { emoji: "🔥", text: "Аукцион идет", color: "#FFC72C" };
      default:
        return { emoji: "❓", text: currentPhase, color: "#FFC72C" };
    }
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "quiz":
        return (
          <QuizRound
            userId={userId}
            onComplete={(points, answers) =>
              handleRoundComplete(1, points, "quiz", answers)
            }
            onBack={() => setCurrentView("lobby")}
          />
        );
      case "logic":
        return (
          <LogicRound
            userId={userId}
            onComplete={(points, answers) =>
              handleRoundComplete(2, points, "logic", answers)
            }
            onBack={() => setCurrentView("lobby")}
          />
        );
      case "survey":
        return (
          <SurveyRound
            userId={userId}
            onComplete={(points, answers) =>
              handleRoundComplete(3, points, "survey", answers)
            }
            onBack={() => setCurrentView("lobby")}
          />
        );
      case "auction":
        return (
          <AuctionRound
            userId={userId}
            userPoints={userPoints}
            userName={userName}
            onBack={() => {
              setCurrentView("lobby");
              // Обновляем баллы при возврате из аукциона
              setTimeout(() => refreshPoints(), 500);
            }}
          />
        );
      default:
        return (
          <div className="mobile-lobby">
            {/* Логотип */}
            <div className="mobile-header">
              <div className="main-logo">
                <img
                  //src="https://www.pernod-ricard.com/themes/custom/pr2021_front/assets/images/logo50/logo-white-50.svg"
                  src="https://mystc.kz/_ASSETS/Images/Logos/mainPage1.svg"
                  alt="Pernod Ricard"
                  className="pernod-logo"
                  onError={(e) => {
                    // Fallback если логотип не загрузится
                    e.target.src =
                      "https://via.placeholder.com/200x80/ffffff/000000?text=PERNOD+RICARD";
                  }}
                />
              </div>
            </div>

            {/* Профиль пользователя */}
            <div className="mobile-user-card">
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h3>
                  {userName} <span className="user-id">({userId})</span>
                </h3>
                <div className="user-type">
                  {isTelegramUser ? "📱 Telegram" : "🌐 Веб"}
                </div>
                {completedRounds.length > 0 && (
                  <div className="completed-rounds">
                    ✅ Завершено: {completedRounds.length}/3 раундов
                  </div>
                )}
              </div>

              <div className="user-points">
                <div className="points-label">
                  Баллы{" "}
                  {isUpdating && <span className="updating-indicator">🔄</span>}
                </div>
                <div className={`points-value ${isUpdating ? "updating" : ""}`}>
                  {userPoints.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Статус игры */}
            <div
              className="game-status-card"
              style={{ borderColor: getPhaseStatus().color }}
            >
              <div className="status-icon">{getPhaseStatus().emoji}</div>
              <div className="status-info">
                <div className="status-text">{getPhaseStatus().text}</div>
                <div className="last-update">
                  🟢 Live {lastUpdate && `(${lastUpdate})`}
                </div>
              </div>
            </div>

            {/* Игры */}
            <div className="mobile-games">
              <div className="games-grid">
                <button
                  className={`game-btn quiz-btn ${
                    !isGameAvailable("quiz") ? "disabled" : ""
                  } ${isGameCompleted("quiz") ? "completed" : ""}`}
                  onClick={() => handleGameStart("quiz", "quiz")}
                  disabled={!isGameAvailable("quiz")}
                >
                  <div className="game-icon">🎯</div>
                  <div className="game-title">Квиз</div>
                  <div className="game-subtitle">Ballantine's</div>
                  <div className="game-points">до 200 баллов</div>
                  {isGameCompleted("quiz") && (
                    <div className="completed-indicator">ПРОЙДЕНО</div>
                  )}
                  {currentPhase === "quiz" && !isGameCompleted("quiz") && (
                    <div className="active-indicator">АКТИВНО</div>
                  )}
                  {!isGameAvailable("quiz") && !isGameCompleted("quiz") && (
                    <div className="disabled-indicator">НЕДОСТУПНО</div>
                  )}
                </button>

                <button
                  className={`game-btn logic-btn ${
                    !isGameAvailable("logic") ? "disabled" : ""
                  } ${isGameCompleted("logic") ? "completed" : ""}`}
                  onClick={() => handleGameStart("logic", "logic")}
                  disabled={!isGameAvailable("logic")}
                >
                  <div className="game-icon">🧩</div>
                  <div className="game-title">Где логика?</div>
                  <div className="game-subtitle">Угадай связь</div>
                  <div className="game-points">до 200 баллов</div>
                  {isGameCompleted("logic") && (
                    <div className="completed-indicator">ПРОЙДЕНО</div>
                  )}
                  {currentPhase === "logic" && !isGameCompleted("logic") && (
                    <div className="active-indicator">АКТИВНО</div>
                  )}
                  {!isGameAvailable("logic") && !isGameCompleted("logic") && (
                    <div className="disabled-indicator">НЕДОСТУПНО</div>
                  )}
                </button>

                <button
                  className={`game-btn survey-btn ${
                    !isGameAvailable("survey") ? "disabled" : ""
                  } ${isGameCompleted("survey") ? "completed" : ""}`}
                  onClick={() => handleGameStart("survey", "survey")}
                  disabled={!isGameAvailable("survey")}
                >
                  <div className="game-icon">📊</div>
                  <div className="game-title">100 к 1</div>
                  <div className="game-subtitle">Мнение барменов</div>
                  <div className="game-points">до 200 баллов</div>
                  {isGameCompleted("survey") && (
                    <div className="completed-indicator">ПРОЙДЕНО</div>
                  )}
                  {currentPhase === "survey" && !isGameCompleted("survey") && (
                    <div className="active-indicator">АКТИВНО</div>
                  )}
                  {!isGameAvailable("survey") && !isGameCompleted("survey") && (
                    <div className="disabled-indicator">НЕДОСТУПНО</div>
                  )}
                </button>

                <button
                  className={`game-btn auction-btn ${
                    !isGameAvailable("auction") ? "disabled" : ""
                  }`}
                  onClick={() =>
                    isGameAvailable("auction") && setCurrentView("auction")
                  }
                  disabled={!isGameAvailable("auction")}
                >
                  <div className="game-icon">🔥</div>
                  <div className="game-title">Аукцион</div>
                  <div className="game-subtitle">Ставь и выигрывай</div>
                  <div className="game-points">Призы!</div>
                  {currentPhase === "auction" && (
                    <div className="active-indicator">АКТИВНО</div>
                  )}
                  {!isGameAvailable("auction") && (
                    <div className="disabled-indicator">НЕДОСТУПНО</div>
                  )}
                </button>
              </div>
            </div>

            {/* Правила */}
            <div className="mobile-rules">
              <h3>🎮 Правила игры</h3>
              <div className="rules-list">
                <div className="rule-item">
                  <span className="rule-icon">🎯</span>
                  <span className="rule-text">
                    3 раунда викторин по 5 минут
                  </span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">⚡</span>
                  <span className="rule-text">
                    Баллы за правильность + скорость
                  </span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">🏆</span>
                  <span className="rule-text">Максимум 600 баллов всего</span>
                </div>
                <div className="rule-item">
                  <span className="rule-icon">🔥</span>
                  <span className="rule-text">Финал — аукцион призов!</span>
                </div>
              </div>
            </div>

            {/* Промо Telegram бота для веб-пользователей */}
            {!isTelegramUser && (
              <div className="telegram-promo">
                <h4>🤖 Играй в Telegram!</h4>
                <p>Для лучшего опыта используй наш бот</p>
                <a
                  href="https://t.me/sothebeatbot"
                  className="bot-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть @sothebeatbot
                </a>
              </div>
            )}
          </div>
        );
    }
  };

  return <div className="mobile-app">{renderCurrentView()}</div>;
};

export default HomePage;
