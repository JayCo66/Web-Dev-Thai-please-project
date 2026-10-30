import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Coins,
  CreditCard,
  Gift,
  Grid2X2,
  HeartHandshake,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const money = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Home() {
  const { user, wallet, tokens, resetBalance } = useAuth();
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [donationTotal, setDonationTotal] = useState(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [topupError, setTopupError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setBoardError("");
    api
      .get("/quests/active-board", { signal: controller.signal })
      .then((response) => {
        if (!response.data.success) throw new Error(response.data.error);
        setBoard(response.data.data.currentBoard);
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED")
          setBoardError(error.response?.data?.error || "โหลดกระดานไม่สำเร็จ");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    api
      .get("/charities/my-donations", { signal: controller.signal })
      .then((response) => {
        if (response.data.success)
          setDonationTotal(
            response.data.data.reduce(
              (total, item) => total + Number(item.amount || 0),
              0,
            ),
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [retry]);

  const addDemoBalance = async () => {
    setTopupBusy(true);
    setTopupError("");
    setNotice("");
    try {
      const result = await resetBalance(500);
      if (result?.success === false)
        throw new Error(result.error || "เติมเงินทดลองไม่สำเร็จ");
      setNotice("เพิ่มเงินทดลอง 500 บาทแล้ว");
    } catch (error) {
      setTopupError(error.response?.data?.error || error.message);
    } finally {
      setTopupBusy(false);
    }
  };

  const completed =
    board?.cells?.filter((cell) =>
      ["COMPLETED", "CLAIMED"].includes(cell.status),
    ).length || 0;
  const nextMission = [...(board?.cells || [])]
    .filter(
      (cell) => cell.status === "IN_PROGRESS" && cell.family !== "DONATION",
    )
    .sort(
      (a, b) =>
        Number(b.quest_code === "TX_COUNT_ANY") -
          Number(a.quest_code === "TX_COUNT_ANY") ||
        b.progress / b.target_value - a.progress / a.target_value,
    )[0];
  const firstName = (user?.fullName || user?.name || "คุณ").split(" ")[0];
  const readyLines =
    board?.lines?.filter((line) => line.isCompleted && !line.isClaimed)
      .length || 0;

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">วันนี้เริ่มจากเรื่องเล็ก ๆ</span>
            <h1>สวัสดี {firstName}</h1>
            <p>ใช้จ่าย ทำภารกิจ แล้วเปลี่ยนโทเค็นเป็นรางวัล</p>
          </div>
          <Link to="/payment" className="button button--primary">
            <CreditCard size={18} />
            ชำระเงินทดลอง
          </Link>
        </div>

        <section className="xp-overview-grid" aria-label="ยอดของคุณ">
          <div className="xp-wallet-card">
            <div className="xp-wallet-label">
              กระเป๋าเงินทดลอง <span>THB</span>
            </div>
            <strong className="xp-wallet-amount">
              ฿{money(wallet?.balance)}
            </strong>
            <div className="xp-wallet-bottom">
              <span>ใช้กับร้านค้าและการบริจาคในเดโม</span>
              <button
                type="button"
                onClick={addDemoBalance}
                disabled={topupBusy}
                className="button xp-topup"
              >
                <Plus size={15} />
                {topupBusy ? "กำลังเติม…" : "เติม ฿500"}
              </button>
            </div>
          </div>
          <Link to="/rewards" className="stat-card xp-token-card">
            <span className="xp-stat-icon">
              <Coins size={23} />
            </span>
            <span className="text-muted">โทเค็นสะสม</span>
            <strong>{Number(tokens || 0).toLocaleString("th-TH")}</strong>
            <span className="xp-card-link">
              ดูรางวัลที่แลกได้ <ArrowRight size={15} />
            </span>
          </Link>
          <Link to="/charities" className="stat-card xp-impact-card">
            <span className="xp-stat-icon">
              <HeartHandshake size={23} />
            </span>
            <span className="text-muted">ยอดบริจาคทดลองของคุณ</span>
            <strong>
              {donationTotal === null ? "—" : `฿${money(donationTotal)}`}
            </strong>
            <span className="xp-card-link">
              ดูประวัติการให้ <ArrowRight size={15} />
            </span>
          </Link>
        </section>
        {notice && (
          <p className="notice notice--success" role="status">
            {notice}
          </p>
        )}
        {topupError && (
          <p className="notice notice--error" role="alert">
            {topupError}
          </p>
        )}

        <section
          className="xp-home-board panel"
          aria-label="กระดานบิงโกปัจจุบัน"
        >
          <div className="xp-home-board-copy">
            <span className="page-eyebrow">
              <Grid2X2 size={15} />
              บิงโกของคุณ
            </span>
            <h2>
              {board?.canAccept
                ? "พร้อมไปกระดานถัดไป"
                : readyLines
                  ? "มีเส้นบิงโกพร้อมรับโบนัส"
                  : completed === 0
                    ? "เริ่มภารกิจแรกของคุณ"
                    : "เติมอีกนิด ใกล้บิงโกแล้ว"}
            </h2>
            {loading ? (
              <p className="text-muted" role="status">
                กำลังเตรียมกระดานของคุณ…
              </p>
            ) : boardError ? (
              <div>
                <p className="text-muted">{boardError}</p>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  <RefreshCw size={15} />
                  ลองอีกครั้ง
                </button>
              </div>
            ) : (
              <>
                <p className="text-muted">
                  กระดานที่ {(board?.boardIndex ?? 0) + 1} จาก 4 · สำเร็จ{" "}
                  {completed}/25 ภารกิจ
                </p>
                <progress
                  className="xp-progress"
                  value={completed}
                  max={25}
                  aria-label={`สำเร็จ ${completed} จาก 25 ภารกิจ`}
                />
                {nextMission && !board?.canAccept && (
                  <p className="xp-next-mission">
                    <Sparkles size={16} />
                    <span>
                      ลองเริ่มที่{" "}
                      <strong>
                        {nextMission.short_title || nextMission.title}
                      </strong>
                    </span>
                  </p>
                )}
              </>
            )}
            <Link to="/bingo" className="button button--primary">
              {readyLines ? "เลือกเส้นรับโบนัส" : "ดูกระดานของฉัน"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="xp-home-board-art" aria-hidden="true">
            {Array.from({ length: 25 }, (_, index) => {
              const cell = board?.cells?.find(
                (item) => item.position === index,
              );
              const done = ["COMPLETED", "CLAIMED"].includes(cell?.status);
              return (
                <span
                  key={index}
                  className={`${index === 12 ? "is-heart" : ""} ${done ? "is-done" : ""}`}
                >
                  {index === 12 ? (
                    <HeartHandshake size={22} />
                  ) : done ? (
                    <Check size={22} />
                  ) : (
                    <span />
                  )}
                </span>
              );
            })}
          </div>
        </section>

        <section className="xp-action-grid" aria-label="เริ่มทำกิจกรรม">
          <Link to="/payment" className="xp-action-card">
            <span className="xp-action-icon">
              <CreditCard />
            </span>
            <div>
              <h3>ใช้จ่ายที่ร้านค้า</h3>
              <p>ธุรกรรมช่วยเติมภารกิจอัตโนมัติ</p>
            </div>
            <ArrowRight size={19} />
          </Link>
          <Link to="/charities" className="xp-action-card">
            <span className="xp-action-icon">
              <HeartHandshake />
            </span>
            <div>
              <h3>เลือกมูลนิธิที่อยากช่วย</h3>
              <p>ร่วมให้และทำภารกิจช่องกลาง</p>
            </div>
            <ArrowRight size={19} />
          </Link>
          <Link to="/rewards" className="xp-action-card">
            <span className="xp-action-icon">
              <Gift />
            </span>
            <div>
              <h3>ใช้โทเค็นที่สะสม</h3>
              <p>แลกรางวัลหรือเลือกสิทธิ์ลุ้นโชค</p>
            </div>
            <ArrowRight size={19} />
          </Link>
        </section>
      </main>
    </div>
  );
}
