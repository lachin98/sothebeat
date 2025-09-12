cat > (src / pages / HomePage.jsx) << "EOF";
import React, { useState, useEffect } from "react";
import QuizRound from "../components/QuizRound";
import LogicRound from "../components/LogicRound";
import SurveyRound from "../components/SurveyRound";
import AuctionRound from "../components/AuctionRound";

const HomePage = ({ user }) => {
  const [currentView, setCurrentView] = useState("lobby");
  const [userPoints, setUserPoints] = useState(0);
  const [userName, setUserName] = useState("Участник");
  const [userId, setUserId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTelegramUser, setIsTelegramUser] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      // Есть пользователь - может быть Telegram или гостевой
      setUserName(user.first_name || user.username || "Участник");
      setUserId(user.id);

      // Определяем тип пользователя по ID
      const isTgUser = user.id < 999999999999; // Telegram ID обычно меньше
      setIsTelegramUser(isTgUser);

      if (isTgUser) {
        // Реальный Telegram пользователь - загружаем из БД
        fetchUserProfile(user.id);
      } else {
        // Гостевой пользователь - используем localStorage
        const savedPoints =
          localStorage.getItem(`sothebeat_points_${user.id}`) || "0";
        const savedTeam = localStorage.getItem(`sothebeat_team_${user.id}`);
        setUserPoints(parseInt(savedPoints));
        setTeamId(savedTeam);
        setLoading(false);
      }
    } else {
      // Нет пользователя - создаем гостевого
      const guestId = Date.now();
      const guestUser = {
        id: guestId,
        first_name: "Гость",
        username: "guest",
      };

      setUserName("Гость");
      setUserId(guestId);
      setIsTelegramUser(false);
      setUserPoints(0);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async (uid) => {
    try {
      const response = await fetch(`/api/users?action=profile&user_id=${uid}`);
      if (response.ok) {
        const userData = await response.json();
        setUserPoints(userData.total_points || 0);
        setTeamId(userData.team_id);
      } else {
        // Пользователь не найден - создаем с 0 баллами
        setUserPoints(0);
      }
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
      setUserPoints(0);
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

    // Обновляем баллы локально
    const newTotal = userPoints + earnedPoints;
    setUserPoints(newTotal);

    if (isTelegramUser) {
      // Telegram пользователь - сохраняем в БД
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
      } catch (error) {
        console.error("Ошибка сохранения в БД:", error);
        // Fallback к localStorage
        localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
      }
    } else {
      // Гостевой пользователь - сохраняем в localStorage
      localStorage.setItem(`sothebeat_points_${userId}`, newTotal.toString());
    }

    alert(`Раунд завершен! Заработано: ${earnedPoints} баллов`);
    setCurrentView("lobby");
  };

  const handleJoinTeam = async () => {
    if (!userId) return;

    const teamCode = prompt("Введите код команды:");
    if (!teamCode) return;

    if (isTelegramUser) {
      // Telegram пользователь - сохраняем в БД
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join_team",
            user_id: userId,
            team_id: teamCode,
          }),
        });

        if (response.ok) {
          setTeamId(teamCode);
          alert(`Вы присоединились к команде: ${teamCode}`);
        } else {
          throw new Error("Ошибка API");
        }
      } catch (error) {
        console.error("Ошибка присоединения к команде:", error);
        // Fallback к localStorage
        localStorage.setItem(`sothebeat_team_${userId}`, teamCode);
        setTeamId(teamCode);
        alert(`Команда сохранена локально: ${teamCode}`);
      }
    } else {
      // Гостевой пользователь - сохраняем в localStorage
      localStorage.setItem(`sothebeat_team_${userId}`, teamCode);
      setTeamId(teamCode);
      alert(`Вы присоединились к команде: ${teamCode} (локально)`);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader">
          <div className="spinner"></div>
        </div>
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
            teamId={teamId}
            onBack={() => setCurrentView("lobby")}
          />
        );
      default:
        return (
          <div className="lobby">
            <div className="header">
              <img
                src="https://via.placeholder.com/120x50/4a90e2/white?text=SotheBEAT"
                alt="SotheBEAT"
                className="logo"
              />
            </div>

            <div className="user-info">
              <div className="user-card">
                <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                  <h3>{userName}</h3>
                  <p>
                    {isTelegramUser
                      ? "Telegram пользователь"
                      : "Веб пользователь"}
                  </p>
                  <div className="points">
                    Баланс: <span className="points-value">{userPoints}</span>
                  </div>
                  <div className="phase">
                    Фаза: <span className="phase-value">lobby</span>
                  </div>
                  {teamId && (
                    <div className="team-info">👥 Команда: {teamId}</div>
                  )}
                  {!isTelegramUser && (
                    <div className="web-user-notice">
                      🌐 Веб-версия (данные в браузере)
                    </div>
                  )}
                  <div className="updated">
                    Обновлено: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="games-grid">
              <button
                className="game-card quiz-card"
                onClick={() => setCurrentView("quiz")}
              >
                <div className="game-icon">🎯</div>
                <div className="game-info">
                  <h4>Квиз</h4>
                  <p>Раунды с вопросами и вариантами ответов</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button
                className="game-card logic-card"
                onClick={() => setCurrentView("logic")}
              >
                <div className="game-icon">🧩</div>
                <div className="game-info">
                  <h4>Где логика?</h4>
                  <p>Угадай, что объединяет картинки</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button
                className="game-card survey-card"
                onClick={() => setCurrentView("survey")}
              >
                <div className="game-icon">📊</div>
                <div className="game-info">
                  <h4>100 к 1</h4>
                  <p>Популярные ответы на необычные вопросы</p>
                  <div className="max-points">Макс: 200 баллов</div>
                </div>
              </button>

              <button className="game-card team-card" onClick={handleJoinTeam}>
                <div className="game-icon">🤝</div>
                <div className="game-info">
                  <h4>Есть контакт!</h4>
                  <p>Командные ассоциации — найдите слово</p>
                  <div className="max-points">Объединяй баллы</div>
                </div>
              </button>
            </div>

            <button
              className="auction-button"
              onClick={() => setCurrentView("auction")}
            >
              <div className="auction-icon">🔥</div>
              <div className="auction-info">
                <h4>Аукцион</h4>
                <p>Ставь баллы — забирай призы</p>
              </div>
            </button>

            <div className="rules">
              <h3>Правила игры</h3>
              <ul>
                <li>3 раунда викторин по 5 минут каждый</li>
                <li>За правильные ответы и скорость получаешь баллы</li>
                <li>Максимум 200 баллов за раунд = 600 всего</li>
                <li>В финале - аукцион призов за баллы!</li>
                <li>Можно объединяться в команды</li>
              </ul>
            </div>

            {!isTelegramUser && (
              <div className="telegram-promo">
                <h4>🤖 Лучший опыт в Telegram!</h4>
                <p>Для сохранения прогресса используй бот:</p>
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

  return <div className="home-page">{renderCurrentView()}</div>;
};

export default HomePage;
EOF;
