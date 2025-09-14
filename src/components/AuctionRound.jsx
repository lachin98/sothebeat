import React, { useState, useEffect } from "react";
import firstImg from "../images/1.jpg";
import secondImg from "../images/2.jpg";
import thirdImg from "../images/3.jpg";
import fourthImg from "../images/4.jpg";
import fifthImg from "../images/5.jpg";
import sixImg from "../images/6.jpg";
import seventhImg from "../images/7.jpg";

const imagesByOrder = {
  1: seventhImg, // как у тебя в исходнике
  2: sixImg,
  3: firstImg,
  4: secondImg,
  5: thirdImg,
  6: fourthImg,
  7: fifthImg,
};

const AuctionRound = ({ userId, userPoints, userName, onBack }) => {
  const [activeLot, setActiveLot] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  const [currentUserPoints, setCurrentUserPoints] = useState(userPoints);

  // инлайн-объявление
  const [announcedLotId, setAnnouncedLotId] = useState(null);
  const [winnerBanner, setWinnerBanner] = useState(null); // { lot_id, lot_title, user_name, bid_amount } | null

  useEffect(() => {
    setCurrentUserPoints(userPoints);
    fetchActiveLot();
    const interval = setInterval(fetchActiveLot, 2000);
    return () => clearInterval(interval);
  }, [userPoints]);

  const fetchActiveLot = async () => {
    try {
      const response = await fetch("/api/auction?action=active");
      if (response.ok) {
        const data = await response.json();
        const newActiveLot = data.lot;

        // если был активный лот и он пропал -> завершился -> узнаём победителя один раз
        if (!newActiveLot && activeLot && activeLot.is_active) {
          await checkForWinner(activeLot.id);
        }

        // если аукцион снова активен — скрываем баннер победителя
        if (newActiveLot) {
          setWinnerBanner(null);
        }

        setActiveLot(newActiveLot);
      }
    } catch (error) {
      console.error("Ошибка загрузки лота:", error);
    }
    setLoading(false);
  };

  const checkForWinner = async (lotId) => {
    try {
      const response = await fetch("/api/auction?action=lots");
      if (!response.ok) return;
      const lots = await response.json();
      const completedLot = lots.find((lot) => lot.id === lotId && lot.is_completed);
      if (!completedLot) return;

      // если уже показывали баннер для этого лота — не повторяем
      if (completedLot.id === announcedLotId) return;

      if (completedLot.winner_name) {
        setWinnerBanner({
          lot_id: completedLot.id,
          lot_title: completedLot.title,
          user_name: completedLot.winner_name,
          bid_amount: completedLot.current_price,
         user_id: completedLot.winner_user_id
           ?? completedLot.winner_id
           ?? completedLot.user_id
           ?? null,
        });
        setAnnouncedLotId(completedLot.id);
      } else {
        // лот завершился без ставок
        setWinnerBanner({
          lot_id: completedLot.id,
          lot_title: completedLot.title,
          user_name: null,
          bid_amount: null,
          user_id: null,
        });
        setAnnouncedLotId(completedLot.id);
      }
    } catch (e) {
      console.error("Ошибка получения победителя:", e);
    }
  };

  const fetchUserBalance = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/users?action=profile&user_id=${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserPoints(userData.total_points || 0);
      }
    } catch (error) {
      console.error("Ошибка обновления баланса:", error);
    }
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || placingBid) return;
    const amount = parseInt(bidAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      alert("Введите корректную сумму");
      return;
    }
    if (amount > currentUserPoints) {
      alert(`Недостаточно баллов!\nУ вас: ${currentUserPoints.toLocaleString()} баллов`);
      return;
    }

    setPlacingBid(true);
    try {
      const response = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "place_bid",
          user_id: userId,
          user_name: userName || "Участник",
          lot_id: activeLot.id,
          bid_amount: amount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setBidAmount("");
        setCurrentUserPoints((prev) => prev - amount);
        alert(`✅ Ставка принята!\n${result.message}\n\nВаш баланс: ${(currentUserPoints - amount).toLocaleString()} баллов`);
        fetchActiveLot();
        fetchUserBalance();
      } else {
        const error = await response.json();
        alert(`❌ ${error.error}`);
        fetchUserBalance();
      }
    } catch (e) {
      console.error("Ошибка ставки:", e);
      alert("❌ Ошибка сети");
      fetchUserBalance();
    }
    setPlacingBid(false);
  };

  const getMinBid = () => {
    if (!activeLot) return 200;
    return Math.max((activeLot.current_price ?? 0) + 10, activeLot.starting_price);
  };

  const getQuickBidOptions = () => {
    const minBid = getMinBid();
    const options = [minBid, minBid + 50, minBid + 100, minBid + 200];
    return options.filter((amount) => amount <= currentUserPoints);
  };

  if (loading) {
    return (
      <div className="auction-loading">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Загрузка аукциона...</p>
        </div>
      </div>
    );
  }

  if (!activeLot) {
    return (
      <div className="auction-waiting">
        <button className="back-btn" onClick={onBack}>← Назад</button>

        {/* Инлайн-объявление победителя, если только что завершился лот */}
        {winnerBanner && (
          <div className="winner-banner">
            {winnerBanner.user_name ? (
              <>
                <div className="wb-title">🏆 Лот «{winnerBanner.lot_title}» продан</div>
                <div className="wb-line">Победитель: <strong>{winnerBanner.user_name}</strong></div>
                {winnerBanner.user_id != null && (
                <div className="wb-line">ID победителя: <code>{winnerBanner.user_id}</code></div>
       )}
                <div className="wb-line">Итоговая цена: <strong>{winnerBanner.bid_amount?.toLocaleString()} баллов</strong></div>
              </>
            ) : (
              <>
                <div className="wb-title">ℹ️ Лот «{winnerBanner.lot_title}» снят с торгов</div>
                <div className="wb-line">Ставок не было</div>
              </>
            )}
          </div>
        )}

        <div className="waiting-content">
          <div className="auction-logo">🏛️</div>
          <h2>Аукцион SotheBEAT</h2>
          <p>В данный момент нет активных торгов</p>
          <p>Дождитесь начала следующего лота!</p>

          <div className="user-balance">
            💰 Ваш баланс: <strong>{currentUserPoints.toLocaleString()} баллов</strong>
          </div>

          <div className="auction-info">
            <h4>ℹ️ Как проходят торги:</h4>
            <ul>
              <li>Ведущий объявляет лот</li>
              <li>Вы делаете ставки в приложении</li>
              <li>Баллы списываются сразу при ставке</li>
              <li>Если не выиграли — баллы вернутся</li>
              <li>Ведущий завершает торги и объявляет победителя</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const minBid = getMinBid();
  const quickBidOptions = getQuickBidOptions();

  return (
    <div className="auction-round">
      <div className="auction-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>🏛️ Аукцион</h2>
      </div>

      <div className="auction-content">
        <div className="lot-display">
          <div className="lot-image">
            <img src={imagesByOrder[activeLot.order_num] || ""} alt={activeLot.title} />
          </div>
          <div className="lot-info">
            <h3 className="lot-title">{activeLot.title}</h3>
            <p className="lot-description">{activeLot.description}</p>

            <div className="price-display">
              <div className="price-row">
                <span className="price-label">Стартовая цена:</span>
                <span className="price-value">{activeLot.starting_price.toLocaleString()}</span>
              </div>
              <div className="price-row current">
                <span className="price-label">Текущая цена:</span>
                <span className="price-value highlight">{(activeLot.current_price || activeLot.starting_price).toLocaleString()}</span>
              </div>
              {activeLot.leading_bidder && (
                <div className="leader-info">👑 Лидирует: <strong>{activeLot.leading_bidder}</strong></div>
              )}
            </div>
          </div>
        </div>

        <div className="auction-status">
          <div className="status-indicator active">🔥 ТОРГИ ИДУТ</div>
          <div className="bid-count">Ставок: {activeLot.bid_count}</div>
        </div>

        <div className="bid-section">
          <div className="current-balance">
            💰 Ваш баланс: <strong>{currentUserPoints.toLocaleString()}</strong> баллов
          </div>

          <div className="bid-form">
            <div className="bid-input-container">
              <div className="bid-input-group">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Мин. ставка: ${minBid.toLocaleString()}`}
                  min={minBid}
                  max={currentUserPoints}
                  disabled={placingBid}
                  className="bid-input"
                />
                <span className="currency">баллов</span>
              </div>
              <button
                className="bid-button"
                onClick={handlePlaceBid}
                disabled={placingBid || !bidAmount || parseInt(bidAmount,10) < minBid || parseInt(bidAmount,10) > currentUserPoints}
              >
                {placingBid ? "⏳ Делаю ставку..." : "🔥 Сделать ставку"}
              </button>
            </div>

            {getQuickBidOptions().length > 0 && (
              <div className="quick-bids">
                <div className="quick-bids-label">Быстрые ставки:</div>
                <div className="quick-bids-buttons">
                  {getQuickBidOptions().map((amount, i) => (
                    <button key={i} className="quick-bid" onClick={() => setBidAmount(amount.toString())} disabled={placingBid}>
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bid-warnings">
              {currentUserPoints < minBid && (
                <div className="warning insufficient">⚠️ Недостаточно баллов для участия в торгах</div>
              )}
              <div className="info">💡 Баллы списываются сразу при ставке. Если не выиграете — вернутся.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionRound;
