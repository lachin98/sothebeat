import React, { useState, useEffect, useRef } from "react";
import firstImg from "../../images/1.jpg";
import secondImg from "../../images/2.jpg";
import thirdImg from "../../images/3.jpg";
import fourthImg from "../../images/4.jpg";
import fifthImg from "../../images/5.jpg";
import sixImg from "../../images/6.jpg";
import seventhImg from "../../images/7.jpg";

const AuctionTab = ({ adminToken }) => {
  const [lots, setLots] = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [liveBids, setLiveBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLot, setNewLot] = useState({
    title: "",
    description: "",
    starting_price: 200,
    image_url: "",
  });
  const [winnerMessage, setWinnerMessage] = useState("");
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedLotForWinner, setSelectedLotForWinner] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const bidsEndRef = useRef(null);

  useEffect(() => {
    fetchLots();
    fetchActiveLot();
    fetchLiveBids();

    // Обновляем данные каждые 2 секунды
    const interval = setInterval(() => {
      fetchActiveLot();
      fetchLiveBids();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Автоскролл чата вниз при новых ставках
  useEffect(() => {
    scrollToBottom();
  }, [liveBids]);

  const scrollToBottom = () => {
    bidsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchLots = async () => {
    try {
      const response = await fetch("/api/auction?action=lots");
      if (response.ok) {
        const data = await response.json();
        setLots(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки лотов:", error);
    }
    setLoading(false);
  };

  const fetchActiveLot = async () => {
    try {
      const response = await fetch("/api/auction?action=active");
      if (response.ok) {
        const data = await response.json();
        setActiveLot(data.lot);
      }
    } catch (error) {
      console.error("Ошибка загрузки активного лота:", error);
    }
  };

  const fetchLiveBids = async () => {
    try {
      const response = await fetch(
        `/api/auction?action=live_bids&admin_token=${adminToken}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setLiveBids(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки чата ставок:", error);
    }
  };

  const handleResetLot = async (lotId, lotTitle) => {
    if (
      !confirm(
        `Сбросить лот "${lotTitle}"?\n\n⚠️ Это вернет все баллы участникам и очистит все ставки по этому лоту.`
      )
    )
      return;

    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_lot",
          lot_id: lotId,
          admin_token: adminToken,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `✅ ${result.message}\n\nВозвращено: ${result.stats.points_returned} баллов\nПользователей: ${result.stats.users_affected}\nСтавок очищено: ${result.stats.bids_cleared}`
        );

        // Обновляем все данные
        fetchLots();
        fetchActiveLot();
        fetchLiveBids();
      } else {
        const error = await response.json();
        alert(`❌ Ошибка сброса лота: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка сброса лота:", error);
      alert("❌ Ошибка сети");
    }
  };

  const handleResetAuction = async () => {
    if (resetting) return;

    setResetting(true);
    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_auction",
          admin_token: adminToken,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `✅ ${result.message}\n\nВозвращено: ${result.stats.points_returned} баллов\nПользователей: ${result.stats.users_affected}\nСтавок очищено: ${result.stats.bids_cleared}`
        );
        setShowResetModal(false);

        // Обновляем все данные
        fetchLots();
        fetchActiveLot();
        fetchLiveBids();
      } else {
        const error = await response.json();
        alert(`❌ Ошибка сброса: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка сброса аукциона:", error);
      alert("❌ Ошибка сети");
    }
    setResetting(false);
  };

  const handleStartLot = async (lotId) => {
    const lot = lots.find((l) => l.id === lotId);
    if (
      !confirm(
        `Запустить аукцион по лоту:\n"${lot?.title}"\n\nЗавершение только вручную!`
      )
    )
      return;

    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_lot",
          lot_id: lotId,
          admin_token: adminToken,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        fetchLots();
        fetchActiveLot();
      } else {
        alert("❌ Ошибка запуска аукциона");
      }
    } catch (error) {
      console.error("Ошибка запуска лота:", error);
      alert("❌ Ошибка сети");
    }
  };

  const handleEndLot = async (lotId) => {
    const lot = activeLot;
    if (
      !confirm(
        `Завершить аукцион по лоту:\n"${lot?.title}"\n\nОпределить победителя и списать баллы?`
      )
    )
      return;

    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end_lot",
          lot_id: lotId,
          admin_token: adminToken,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Показываем модал для объявления победителя
        setSelectedLotForWinner(lotId);
        if (result.winner) {
          const winnerDisplay = `${result.winner.user_name}${
            result.winner.winner_username
              ? ` (@${result.winner.winner_username})`
              : ""
          }`;
          setWinnerMessage(
            `🎪 Внимание! Торги завершены!\n\n🏆 Лот "${result.winner.lot_title}" продан!\n\nПобедитель: ${winnerDisplay}\nИтоговая цена: ${result.final_price} баллов\n\n📣 Продано раз, продано два, продано три!\nПоздравляем победителя! 🎉`
          );
        } else {
          setWinnerMessage(
            `🎪 Торги по лоту "${result.lot_title}" завершены.\n\nК сожалению, никто не сделал ставку.\nЛот снят с торгов.`
          );
        }
        setShowWinnerModal(true);

        fetchLots();
        fetchActiveLot();
      } else {
        alert("❌ Ошибка завершения аукциона");
      }
    } catch (error) {
      console.error("Ошибка завершения лота:", error);
      alert("❌ Ошибка сети");
    }
  };

  const handleAnnounceWinner = async () => {
    if (!winnerMessage.trim()) {
      alert("Введите сообщение для объявления");
      return;
    }

    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce_winner",
          lot_id: selectedLotForWinner,
          winner_message: winnerMessage,
          admin_token: adminToken,
        }),
      });

      if (response.ok) {
        alert("📢 Объявление готово!\nТекст можно зачитать гостям.");
        setShowWinnerModal(false);
        setWinnerMessage("");
        setSelectedLotForWinner(null);
      } else {
        alert("❌ Ошибка объявления");
      }
    } catch (error) {
      console.error("Ошибка объявления:", error);
      alert("❌ Ошибка сети");
    }
  };

  const handleAddLot = async () => {
    if (!newLot.title.trim()) {
      alert("Введите название лота");
      return;
    }

    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_lot",
          admin_token: adminToken,
          ...newLot,
        }),
      });

      if (response.ok) {
        alert("✅ Лот добавлен!");
        setNewLot({
          title: "",
          description: "",
          starting_price: 200,
          image_url: "",
        });
        fetchLots();
      } else {
        alert("❌ Ошибка добавления лота");
      }
    } catch (error) {
      console.error("Ошибка добавления лота:", error);
      alert("❌ Ошибка сети");
    }
  };

  const formatBidTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  };

  const getLotStatus = (lot) => {
    if (lot.is_completed)
      return { text: "Завершен", color: "#888", icon: "✅" };
    if (lot.is_active) return { text: "АКТИВЕН", color: "#4caf50", icon: "🔥" };
    return { text: "Ожидает", color: "#2196f3", icon: "⏳" };
  };

  const formatUserDisplay = (bid) => {
    return `${bid.user_name}${
      bid.user_username ? ` (@${bid.user_username})` : ""
    }`;
  };

  if (loading) {
    return <div className="loading">Загрузка лотов...</div>;
  }

  return (
    <div className="auction-tab">
      <div className="tab-header">
        <h2>🏛️ Управление аукционом</h2>
        <div className="tab-controls">
          <button
            className="btn btn-danger"
            onClick={() => setShowResetModal(true)}
            title="Сбросить весь аукцион"
          >
            🔄 Сброс аукциона
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchLots();
              fetchActiveLot();
              fetchLiveBids();
            }}
          >
            🔄 Обновить все
          </button>
        </div>
      </div>

      <div className="auction-admin-layout">
        {/* Левая панель - управление */}
        <div className="auction-control-panel">
          {/* Текущий аукцион */}
          {activeLot ? (
            <div className="current-auction">
              <h3>🔥 АКТИВНЫЙ АУКЦИОН</h3>
              <div className="active-lot-card">
                <div className="lot-image">
                  <img
                    src={
                      activeLot.order_num === 1
                        ? secondImg
                        : activeLot.order_num === 2
                        ? sixImg
                        : activeLot.order_num === 3
                        ? firstImg
                        : activeLot.order_num === 4
                        ? seventhImg
                        : activeLot.order_num === 5
                        ? thirdImg
                        : activeLot.order_num === 6
                        ? fourthImg
                        : activeLot.order_num === 7
                        ? fifthImg
                        : ""
                    }
                    alt={activeLot.title}
                  />
                </div>
                <div className="lot-details">
                  <h4>{activeLot.title}</h4>
                  <p className="lot-description">{activeLot.description}</p>

                  <div className="lot-stats">
                    <div className="stat">
                      <span className="label">Стартовая цена:</span>
                      <span className="value">{activeLot.starting_price}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Текущая цена:</span>
                      <span className="value highlight">
                        {activeLot.current_price}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="label">Всего ставок:</span>
                      <span className="value">{activeLot.bid_count}</span>
                    </div>
                    {activeLot.leading_bidder && (
                      <div className="stat leading-stat">
                        <span className="label">👑 Лидирует:</span>
                        <span className="value winner">
                          {activeLot.leading_bidder}
                          {activeLot.leading_username && (
                            <span className="username">
                              @{activeLot.leading_username}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="auction-controls">
                    <div className="status-indicator active">⚡ ТОРГИ ИДУТ</div>
                    <button
                      className="btn btn-danger btn-large"
                      onClick={() => handleEndLot(activeLot.id)}
                    >
                      🛑 ЗАВЕРШИТЬ ТОРГИ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-active-auction">
              <h3>⏳ Нет активных торгов</h3>
              <p>Выберите лот для запуска аукциона</p>
            </div>
          )}

          {/* Список лотов */}
          <div className="lots-list-compact">
            <h3>📋 Все лоты ({lots.length})</h3>
            {lots.map((lot) => {
              const status = getLotStatus(lot);
              return (
                <div
                  key={lot.id}
                  className={`lot-item-compact ${
                    lot.is_active ? "active" : ""
                  }`}
                >
                  <div className="lot-info">
                    <span className="lot-number">#{lot.order_num}</span>
                    <span className="lot-title">{lot.title}</span>
                    <span
                      className={`lot-status`}
                      style={{ color: status.color }}
                    >
                      {status.icon} {status.text}
                    </span>
                  </div>

                  <div className="lot-actions">
                    {!lot.is_completed && !lot.is_active && (
                      <button
                        className="btn btn-small btn-success"
                        onClick={() => handleStartLot(lot.id)}
                        title={`Запустить аукцион: ${lot.title}`}
                      >
                        ▶️ Запуск
                      </button>
                    )}

                    {lot.is_completed && (
                      <button
                        className="btn btn-small btn-warning"
                        onClick={() => handleResetLot(lot.id, lot.title)}
                        title="Сбросить этот лот для повторных торгов"
                      >
                        🔄 Сброс
                      </button>
                    )}

                    {lot.winner_name && (
                      <span className="winner-badge">
                        👑 {lot.winner_name}
                        {lot.winner_username && (
                          <span className="winner-username">
                            @{lot.winner_username}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Правая панель - живой чат ставок */}
        <div className="live-bids-panel">
          <h3>💬 Живой чат ставок</h3>
          <div className="bids-chat">
            {liveBids.length === 0 ? (
              <div className="no-bids-yet">
                <div className="empty-icon">💭</div>
                <p>Пока никто не делал ставок...</p>
                <p className="hint">Ставки появятся здесь в реальном времени</p>
              </div>
            ) : (
              liveBids.map((bid) => (
                <div
                  key={bid.id}
                  className={`bid-message ${bid.is_leading ? "leading" : ""} ${
                    bid.lot_is_active ? "active-lot" : "inactive-lot"
                  }`}
                >
                  <div className="bid-header">
                    <span className="bid-user">
                      {bid.is_leading && "👑"}
                      <strong>{formatUserDisplay(bid)}</strong>
                      {bid.team_id && (
                        <span className="team-tag">👥{bid.team_id}</span>
                      )}
                    </span>
                    <span className="bid-time">
                      {formatBidTime(bid.created_at)}
                    </span>
                  </div>

                  <div className="bid-content">
                    <div className="bid-amount">
                      💰 {bid.bid_amount.toLocaleString()} баллов
                    </div>
                    <div className="bid-lot">на лот: "{bid.lot_title}"</div>
                  </div>

                  {bid.is_leading && bid.lot_is_active && (
                    <div className="leading-indicator">🔥 ЛИДИРУЕТ</div>
                  )}
                </div>
              ))
            )}
            <div ref={bidsEndRef} />
          </div>

          <div className="chat-stats">
            📊 Всего ставок сегодня: <strong>{liveBids.length}</strong>
            {activeLot && (
              <div>
                🔥 Активный лот: <strong>{activeLot.title}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модал сброса всего аукциона */}
      {showResetModal && (
        <div className="winner-modal">
          <div className="modal-content">
            <h3>�� Сброс всего аукциона</h3>
            <p className="modal-description warning">
              ⚠️ <strong>Внимание!</strong> Это действие:
            </p>
            <ul className="reset-warning-list">
              <li>🔄 Вернет ВСЕ потраченные баллы всем участникам</li>
              <li>🗑️ Очистит все ставки по всем лотам</li>
              <li>📋 Сбросит все лоты в исходное состояние</li>
              <li>❌ Отменит всех победителей</li>
            </ul>
            <p className="modal-description">
              Используйте только для полного перезапуска аукциона!
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-danger btn-large"
                onClick={handleResetAuction}
                disabled={resetting}
              >
                {resetting ? "⏳ Сбрасываю..." : "🔄 СБРОСИТЬ АУКЦИОН"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал объявления победителя */}
      {showWinnerModal && (
        <div className="winner-modal">
          <div className="modal-content">
            <h3>📢 Текст объявления результатов</h3>
            <p className="modal-description">
              Зачитайте этот текст гостям или отредактируйте по желанию:
            </p>
            <textarea
              value={winnerMessage}
              onChange={(e) => setWinnerMessage(e.target.value)}
              rows={8}
            />
            <div className="modal-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handleAnnounceWinner}
              >
                ✅ Готово
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowWinnerModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionTab;
