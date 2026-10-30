import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  CreditCard,
  Grid2X2,
  HeartHandshake,
  List,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Store,
  Trophy,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BingoRewardPlanner from "../components/BingoRewardPlanner";
import "../styles/bingo-reward-planner.css";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/home-discovery.css";

const isDone = (cell) => ["COMPLETED", "CLAIMED"].includes(cell.status);
const families = {
  ACTIVITY: { name: "การใช้จ่าย", icon: CreditCard },
  VARIETY: { name: "ร้านค้า", icon: Store },
  TIME: { name: "ช่วงเวลา", icon: Clock3 },
  SPEND: { name: "ยอดสะสม", icon: Coins },
  DONATION: { name: "การให้", icon: HeartHandshake },
};
const shortNames = {
  TX_COUNT_ANY: "ซื้อสินค้า",
  STREAK_DAYS_ANY: "ซื้อวันติดกัน",
  REPEAT_MERCHANT_ANY: "กลับไปร้านเดิม",
  REPEAT_MERCHANT_FD: "ร้านอาหารเดิม",
  REPEAT_MERCHANT_GD: "ร้านของใช้เดิม",
  REPEAT_MERCHANT_WEEKEND: "ร้านเดิมวันหยุด",
  DISTINCT_MERCHANTS_ANY: "อุดหนุนต่างร้าน",
  DISTINCT_MERCHANTS_FD: "อาหารต่างร้าน",
  DISTINCT_MERCHANTS_GD: "ของใช้ต่างร้าน",
  NEW_MERCHANTS_ANY: "ลองร้านใหม่",
  CATEGORY_COUNT_FD: "ซื้ออาหาร",
  CATEGORY_COUNT_GD: "ซื้อของใช้",
  CATEGORY_DAYS_FD: "วันซื้ออาหาร",
  CATEGORY_DAYS_GD: "วันซื้อของใช้",
  DAYPART_MORNING: "ซื้อช่วงเช้า",
  DAYPART_LUNCH: "ซื้อช่วงเที่ยง",
  DAYPART_AFTERNOON: "ซื้อช่วงบ่าย",
  WEEKEND_COUNT: "ซื้อวันหยุด",
  WEEKDAY_COUNT: "ซื้อวันธรรมดา",
  FRIDAY_COUNT: "ซื้อวันศุกร์",
  FD_MORNING: "อาหารเช้า",
  FD_LUNCH: "อาหารกลางวัน",
  FD_AFTERNOON: "อาหารช่วงบ่าย",
  GD_WEEKDAY: "ของใช้วันธรรมดา",
  SPEND_TOTAL_ANY: "ยอดใช้จ่าย",
  SPEND_TOTAL_FD: "ยอดซื้ออาหาร",
  SPEND_TOTAL_GD: "ยอดซื้อของใช้",
  SINGLE_TICKET_ANY: "ซื้อในบิลเดียว",
  SINGLE_TICKET_FD: "บิลอาหาร",
  SINGLE_TICKET_GD: "บิลของใช้",
  SPEND_SINGLE_MERCHANT: "ยอดร้านเดียว",
  DONATION: "ร่วมบริจาค",
};
const levelNames = { 1: "ง่าย", 2: "กลาง", 3: "ท้าทาย" };
const fmt = (value) => Number(value || 0).toLocaleString("th-TH");

export default function Bingo() {
  const { setTokensBalance } = useAuth();
  const [data, setData] = useState(null);
  const [requestedIndex, setRequestedIndex] = useState(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("grid");
  const [selectedCell, setSelectedCell] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [claimMode, setClaimMode] = useState("AUTO_MAX_TOKEN");
  const [lineId, setLineId] = useState("");
  const [hoverLine, setHoverLine] = useState(null);
  const cellDialog = useRef(null);
  const claimDialog = useRef(null);
  const acceptDialog = useRef(null);
  const syncTokens = useRef(setTokensBalance);
  useEffect(() => {
    syncTokens.current = setTokensBalance;
  }, [setTokensBalance]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query =
      requestedIndex === null ? "" : `?boardIndex=${requestedIndex}`;
    api
      .get(`/quests/active-board${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.data.success) throw new Error(response.data.error);
        const next = response.data.data;
        setData(next);
        if (next.userTokens !== undefined) syncTokens.current(next.userTokens);
      })
      .catch((failure) => {
        if (failure.code !== "ERR_CANCELED")
          setError(
            failure.response?.data?.error ||
              "โหลดกระดานไม่สำเร็จ กรุณาลองอีกครั้ง",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestedIndex, revision]);

  useEffect(() => {
    if (selectedCell) cellDialog.current?.showModal();
    else cellDialog.current?.close();
  }, [selectedCell]);
  useEffect(() => {
    if (claimOpen) claimDialog.current?.showModal();
    else claimDialog.current?.close();
  }, [claimOpen]);
  useEffect(() => {
    if (acceptOpen) acceptDialog.current?.showModal();
    else acceptDialog.current?.close();
  }, [acceptOpen]);

  const board = data?.currentBoard;
  const sourceLabel = board?.phase === "STARTER" ? "ชุดเริ่มต้นร่วมกัน" : board?.source === "AI" ? "AI ช่วยเลือกภารกิจ" : "เลือกภารกิจด้วยกติกาของระบบ";
  const sourceExplanation = board?.phase === "STARTER"
    ? "กระดานแรกใช้ชุดเริ่มต้นร่วมกัน ยังไม่ได้เรียก AI เพื่อเริ่มเก็บพฤติกรรม"
    : board?.source === "AI"
      ? "AI เลือกภารกิจจากคลังตามข้อมูลของคุณ แล้วระบบตรวจและจัดระดับก่อนแสดง"
      : board?.sourceReason === "NO_API_KEY"
        ? "ยังไม่ได้ตั้งค่าการเชื่อมต่อ AI ระบบจึงเลือกจากคลังภารกิจด้วยกติกาที่กำหนด"
        : board?.sourceReason === "POLICY_UPDATED"
          ? "กระดานเดิมได้รับการปรับตามกติกาปัจจุบัน โดยเก็บภารกิจที่สำเร็จไว้"
          : "AI ไม่พร้อมใช้งานสำหรับกระดานนี้ ระบบจึงเลือกจากคลังภารกิจด้วยกติกาที่กำหนด";

  const aiFailureMessage = {
    TIMEOUT: "AI ตอบกลับไม่ทันเวลาที่กำหนด",
    AUTH_FAILED: "การเชื่อมต่อ AI ไม่ผ่านการตรวจสิทธิ์ กรุณาตรวจคีย์และสิทธิ์ใช้งาน",
    RATE_LIMITED: "ผู้ให้บริการจำกัดจำนวนคำขอหรือโควตาการใช้งาน",
    MODEL_NOT_FOUND: "ผู้ให้บริการไม่พบโมเดลที่ตั้งค่าไว้",
    PROVIDER_ERROR: "ผู้ให้บริการ AI ขัดข้องชั่วคราว",
    REQUEST_REJECTED: "ผู้ให้บริการไม่รับรูปแบบคำขอ กรุณาตรวจการตั้งค่า",
    CONNECTION_FAILED: "เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ",
    INCOMPLETE_RESPONSE: "AI ส่งคำตอบไม่ครบตามที่กระดานต้องใช้",
    INVALID_RESPONSE: "คำตอบจาก AI ไม่ผ่านการตรวจรูปแบบหรือรหัสภารกิจ",
  }[board?.aiDiagnostics?.failureCode];
  const cells = board?.cells || [];
  const completed = cells.filter(isDone).length;
  const claimed = Boolean(
    board?.claimedLineId ||
    board?.selectedLine ||
    board?.lines?.some((line) => line.isClaimed),
  );
  const ready = (board?.lines || []).filter(
    (line) => line.isCompleted && !line.isClaimed,
  );
  const bestLine = [...ready].sort((a, b) => b.tokenReward - a.tokenReward)[0];
  const chosenLine =
    claimMode === "AUTO_MAX_TOKEN"
      ? bestLine
      : ready.find((line) => line.id === lineId);
  const currentIndex = board?.boardIndex ?? requestedIndex ?? 0;
  const accepted = Boolean(board?.acceptedAt || board?.status === "ACCEPTED");
  const nextLines = [...(board?.lines || [])]
    .filter((line) => !line.isCompleted)
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 3);
  const highlighted =
    board?.lines?.find((line) => line.id === hoverLine)?.positions || [];
  const month =
    data?.monthName ||
    new Intl.DateTimeFormat("th-TH", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(new Date());

  const action = async (kind, payload) => {
    setBusy(true);
    setError("");
    try {
      const response = await api.post(`/quests/${kind}`, payload);
      if (!response.data.success) throw new Error(response.data.error);
      const next = response.data.data;
      setData(next);
      if (next.userTokens !== undefined) syncTokens.current(next.userTokens);
      setClaimOpen(false);
      setAcceptOpen(false);
      setHoverLine(null);
      setSelectedCell(null);
      setNotice(
        kind === "demo-complete"
          ? "บันทึกผลทดสอบแล้ว เส้นที่สำเร็จจะถูกขีดบิงโก"
          : kind === "claim"
            ? "รับโบนัสแล้ว เก็บความสำเร็จนี้แล้วไปต่อได้เลย"
            : currentIndex < 3
              ? "กระดานถัดไปพร้อมแล้ว"
              : "ครบทั้ง 4 กระดานแล้ว พบกันเดือนหน้า",
      );
      if (kind === "accept") setRequestedIndex(null);
    } catch (failure) {
      setClaimOpen(false);
      setAcceptOpen(false);
      setError(
        failure.response?.data?.error || failure.message || "ทำรายการไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  };

  const openClaim = () => {
    setClaimMode("AUTO_MAX_TOKEN");
    setLineId(bestLine?.id || "");
    setClaimOpen(true);
  };
  const selectBoard = (index) => {
    setRequestedIndex(index);
    setSelectedCell(null);
    setHoverLine(null);
    setNotice("");
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ภารกิจประจำเดือน · {month}</span>
            <h1>บิงโกของฉัน</h1>
            {board && <span className={`xp-board-source ${board.source === "AI" && board.phase !== "STARTER" ? "is-ai" : ""}`}><Sparkles size={14}/>{sourceLabel}</span>}
            <p>ทำกิจกรรมให้ครบเส้น แล้วเลือกเส้นรับโบนัส</p>
          </div>
          <button
            type="button"
            className="button button--secondary"
            disabled={loading || busy}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={17} className={loading ? "xp-spin" : ""} />
            อัปเดตกระดาน
          </button>
        </div>
        {error && (
          <div className="notice notice--error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="notice notice--success" role="status">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        <nav className="xp-board-tabs" aria-label="กระดานประจำเดือน">
          {Array.from({ length: 4 }, (_, index) => {
            const summary = data?.boardsSummary?.find(
              (item) => item.boardIndex === index,
            );
            const locked = !summary || summary.status === "LOCKED";
            const selected = currentIndex === index;
            return (
              <button
                type="button"
                key={index}
                className={`xp-board-tab${selected ? " is-selected" : ""}`}
                disabled={locked || loading || busy}
                aria-current={selected ? "step" : undefined}
                onClick={() => selectBoard(index)}
              >
                <span className="xp-board-tab-number">
                  {locked ? (
                    <LockKeyhole size={15} />
                  ) : summary.acceptedAt || summary.status === "ACCEPTED" ? (
                    <Check size={16} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>
                  กระดาน {index + 1}
                  <small>
                    {locked
                      ? "ยังไม่เปิด"
                      : summary.acceptedAt || summary.status === "ACCEPTED"
                        ? "สำเร็จแล้ว"
                        : "กำลังทำ"}
                  </small>
                </span>
              </button>
            );
          })}
        </nav>

        {loading ? (
          <section
            className="panel xp-board-loading"
            aria-busy="true"
            aria-label="กำลังเตรียมภารกิจ"
          >
            <div className="xp-loading-heading">
              <RefreshCw size={21} className="xp-spin" />
              <h2>กำลังเตรียมภารกิจของคุณ</h2>
              <p className="text-muted">ครั้งแรกอาจใช้เวลาสักครู่</p>
            </div>
            <div className="xp-bingo-grid">
              {Array.from({ length: 25 }, (_, index) => (
                <div className="xp-cell-skeleton" key={index} />
              ))}
            </div>
          </section>
        ) : !board ? (
          <section className="panel empty-state">
            <Grid2X2 size={36} />
            <h2>ยังเปิดกระดานไม่ได้</h2>
            <p>ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setRevision((value) => value + 1)}
            >
              ลองอีกครั้ง
            </button>
          </section>
        ) : (
          <div className="xp-bingo-layout">
            <section
              className="panel xp-board-panel"
              aria-label={`กระดานที่ ${currentIndex + 1}`}
            >
              <div className="panel-head">
                <div>
                  <h2>
                    กระดาน {currentIndex + 1}
                    <span className="xp-count-label">
                      {completed}/25 สำเร็จ
                    </span>
                  </h2>
                  <p className="text-muted">แตะช่องเพื่อดูเป้าหมายและวิธีทำ</p>
                </div>
                <div className="segmented" aria-label="มุมมองกระดาน">
                  <button
                    type="button"
                    aria-label="มุมมองตาราง"
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    <Grid2X2 size={18} />
                    <span>ตาราง</span>
                  </button>
                  <button
                    type="button"
                    aria-label="มุมมองรายการ"
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    <List size={19} />
                    <span>รายการ</span>
                  </button>
                </div>
              </div>
              <div className="xp-board-progress">
                <progress
                  className="xp-progress"
                  value={completed}
                  max={25}
                  aria-label={`สำเร็จ ${completed} จาก 25 ช่อง`}
                />
              </div>
              <div className="xp-grid-stage">
                <div
                  className={
                    view === "grid" ? "xp-bingo-grid" : "xp-mission-list"
                  }
                >
                  {cells.map((cell) => {
                    const family = families[cell.family] || families.ACTIVITY;
                    const Icon = family.icon;
                    const done = isDone(cell);
                    const donation = cell.family === "DONATION";
                    return (
                      <button
                        key={cell.position}
                        type="button"
                        className={`xp-mission-cell${done ? " is-done" : ""}${donation ? " is-donation" : ""}${highlighted.includes(cell.position) ? " is-highlighted" : ""}`}
                        onClick={() => setSelectedCell(cell)}
                        aria-label={`${cell.title} ${done ? "สำเร็จแล้ว" : `${fmt(cell.progress)} จาก ${fmt(cell.target_value)} ${cell.unit || ""}`}`}
                      >
                        <span className="xp-cell-top">
                          <span className="xp-cell-icon">
                            {done ? <Check size={18} /> : <Icon size={18} />}
                          </span>
                          <span className="xp-cell-position">
                            {String(cell.position + 1).padStart(2, "0")}
                          </span>
                        </span>
                        <span className="xp-cell-name">
                          {view === "list"
                            ? cell.title
                            : shortNames[cell.quest_code] ||
                              cell.short_title ||
                              cell.title}
                        </span>
                        <span className="xp-cell-target">
                          {`${fmt(cell.progress)} / ${fmt(cell.target_value)} ${cell.unit || ""}`}
                        </span>
                        <span className="xp-cell-bottom">
                          <span
                            className={`xp-level xp-level--${donation ? "donation" : cell.level || 1}`}
                          >
                            {donation
                              ? "เพื่อสังคม"
                              : levelNames[cell.level] || "ง่าย"}
                          </span>
                          <span
                            className="xp-cell-tokens"
                            title={done ? "ได้รับแล้ว" : "ได้รับเมื่อสำเร็จ"}
                          >
                            <Coins size={12} />+{cell.token_reward}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {view === "grid" && (
                  <svg
                    className="xp-bingo-crosses"
                    viewBox="0 0 500 500"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="เส้นบิงโกที่สำเร็จ"
                  >
                    {(board.lines || [])
                      .filter((l) => l.isCompleted)
                      .map((line) => {
                        const first = line.positions[0],
                          last = line.positions[4];
                        return (
                          <line
                            key={line.id}
                            data-line={line.id}
                            x1={50 + (first % 5) * 100}
                            y1={50 + Math.floor(first / 5) * 100}
                            x2={50 + (last % 5) * 100}
                            y2={50 + Math.floor(last / 5) * 100}
                            className={line.isClaimed ? "is-claimed" : ""}
                          />
                        );
                      })}
                  </svg>
                )}
              </div>
              <div className="xp-board-legend">
                <span>
                  <i className="xp-dot xp-dot--done" />
                  สำเร็จ
                </span>
                <span>
                  <i className="xp-dot xp-dot--donation" />
                  ภารกิจบริจาค
                </span>
                <span>ครบแถว คอลัมน์ หรือแนวทแยง = บิงโก</span>
              </div>
              <BingoRewardPlanner lines={board.lines || []} cells={cells} selectedId={hoverLine} closed={claimed || accepted} onSelect={id=>{setHoverLine(hoverLine===id?null:id);setView("grid");}} />
            </section>

            <aside className="xp-bingo-aside">
              {board.lines?.some((l) => l.isCompleted) && (
                <section className="panel xp-bingo-achieved">
                  <span className="badge">
                    บิงโกแล้ว {board.bingoCount} เส้น
                  </span>
                  <div>
                    {board.lines
                      .filter((l) => l.isCompleted)
                      .map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            setHoverLine(l.id);
                            setView("grid");
                          }}
                        >
                          <span>{l.name}</span>
                          <strong>
                            +{l.tokenReward} แต้ม
                            {l.isClaimed ? " · รับแล้ว" : ""}
                          </strong>
                        </button>
                      ))}
                  </div>
                </section>
              )}
              <section className="panel xp-next-step">
                <div className="xp-step-icon">
                  <Trophy size={25} />
                </div>
                <span className="page-eyebrow">ก้าวต่อไปของคุณ</span>
                {accepted ? (
                  <>
                    <h2>กระดานนี้เสร็จแล้ว</h2>
                    <p className="text-muted">
                      รับโบนัสเรียบร้อยแล้ว ดูความสำเร็จของคุณได้ทุกเมื่อ
                    </p>
                    {data.activeBoardIndex !== currentIndex && (
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => selectBoard(data.activeBoardIndex)}
                      >
                        ไปกระดานที่กำลังทำ
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </>
                ) : claimed ? (
                  <>
                    <h2>รับโบนัสเรียบร้อย</h2>
                    <p className="text-muted">
                      {currentIndex < 3
                        ? "พร้อมเริ่มภารกิจชุดถัดไปแล้ว"
                        : "คุณมาถึงกระดานสุดท้ายของเดือนแล้ว"}
                    </p>
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={busy || !board.canAccept}
                      onClick={() => setAcceptOpen(true)}
                    >
                      {currentIndex < 3 ? "ไปกระดานถัดไป" : "จบกระดานเดือนนี้"}
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : ready.length ? (
                  <>
                    <h2>{ready.length} เส้นพร้อมรับโบนัส</h2>
                    <p className="text-muted">
                      เลือกหนึ่งเส้นรับรางวัล หรือทำภารกิจต่อก่อนได้
                    </p>
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={busy}
                      onClick={openClaim}
                    >
                      เลือกเส้นรับโบนัส
                      <ArrowRight size={16} />
                    </button>
                    <span className="xp-side-note">
                      รับโทเค็นรายช่องแยกจากโบนัสบิงโก
                    </span>
                  </>
                ) : (
                  <>
                    <h2>อีกนิดก็ครบเส้น</h2>
                    <p className="text-muted">
                      ใช้จ่ายหรือบริจาค ความคืบหน้าจะอัปเดตให้
                    </p>
                    <Link to="/payment" className="button button--primary">
                      <CreditCard size={17} />
                      ไปชำระเงินทดลอง
                    </Link>
                    <Link to="/charities" className="button button--secondary">
                      <HeartHandshake size={17} />
                      เลือกมูลนิธิ
                    </Link>
                  </>
                )}
              </section>
              {nextLines.length > 0 && !claimed && (
                <section className="panel xp-lines-card">
                  <h3>เส้นที่ใกล้สำเร็จ</h3>
                  <a className="brp-all-link" href="#bingo-line-rewards">เปรียบเทียบโบนัสทุกเส้น <Coins size={14}/></a>
                  {nextLines.map((line) => (
                    <button
                      type="button"
                      key={line.id}
                      className={`xp-near-line${hoverLine === line.id ? " is-selected" : ""}`}
                      onClick={() => {
                        setHoverLine(hoverLine === line.id ? null : line.id);
                        setView("grid");
                      }}
                    >
                      <span>
                        {line.name.replace(/\s*\(.*?\)/g, "")}
                        <small>
                          {line.completedCount}/5 ช่อง · โบนัส +
                          {line.tokenReward} แต้ม
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </section>
              )}
              {data.demoToolsEnabled && !claimed && !accepted && (
                <details className="panel xp-details xp-demo-tools">
                  <summary>เครื่องมือทดสอบ</summary>
                  <div>
                    <p>
                      จำลองให้ภารกิจครบ 1 แถว รับเฉพาะโทเค็นทดลอง
                      และไม่สร้างประวัติใช้จ่ายให้ AI
                    </p>
                    <button
                      className="button button--secondary"
                      disabled={busy}
                      onClick={() =>
                        action("demo-complete", {
                          boardIndex: currentIndex,
                          lineId: "R1",
                        })
                      }
                    >
                      ทดสอบบิงโกแถว 1
                    </button>
                  </div>
                </details>
              )}
              <details className="panel xp-details">
                <summary>
                  <CircleHelp size={17} />
                  วิธีเล่นแบบสั้น
                </summary>
                <div>
                  <ol>
                    <li>ทำกิจกรรมตามเงื่อนไขแต่ละช่อง</li>
                    <li>ครบ 5 ช่องในเส้นเดียวกัน เลือกรับโบนัส</li>
                    <li>ยืนยันเพื่อไปกระดานถัดไป สูงสุด 4 กระดานต่อเดือน</li>
                  </ol>
                  <p>
                    โบนัสเส้น = 20 + (ระดับความยากรวม × 4)
                    เส้นที่ยากกว่าได้โบนัสมากกว่า โดยไม่นับซ้ำกับโทเค็นรายช่อง
                  </p>
                </div>
              </details>
              <details className="panel xp-details xp-ai-explainer">
                <summary><Sparkles size={17}/>ที่มาของกระดาน</summary>
                <div>
                  <strong>{sourceLabel}</strong>
                  <p>{sourceExplanation}</p>
                  <p className="text-muted">กระดาน #{board.boardId} · บันทึกไว้ในบัญชีแล้ว</p>
                  {aiFailureMessage && <p role="status">{aiFailureMessage}</p>}
                  {board.aiDiagnostics?.attempted && <p className="text-muted">โมเดล {board.aiDiagnostics.model} · เรียก {board.aiDiagnostics.attempts} ครั้ง</p>}
                  {board.sourceReason === "AI_UNAVAILABLE" && !board.aiDiagnostics && <p className="text-muted">กระดานเดิมนี้ยังไม่ได้เก็บสาเหตุข้อผิดพลาดแบบละเอียด การโหลดซ้ำจะใช้กระดานที่บันทึกไว้</p>}
                  {board.phase !== "STARTER" && <p className="text-muted">ข้อมูลย้อนหลัง 30 วันรวมวันนี้: การใช้จ่าย ร้านค้า และประวัติภารกิจ</p>}
                  {board.period?.from && board.period?.to && <p className="text-muted">ช่วงข้อมูล {board.period.from} – {board.period.to}</p>}
                  {board.difficultyMix && <p>ง่าย {board.difficultyMix.easy} · กลาง {board.difficultyMix.medium} · ท้าทาย {board.difficultyMix.hard}</p>}
                  {board.source === "AI" && <details className="brp-ai-evidence"><summary>หลักฐานการเรียก AI</summary>{board.aiEvidence ? <div><p>ผู้ให้บริการ {board.aiEvidence.provider} · คำตอบผ่านการตรวจ {board.aiEvidence.validation.questCount} ภารกิจไม่ซ้ำ</p><p>กระดานนี้ใช้ภารกิจจากคำตอบ AI ไม่ได้ใช้ชุดเลือกสำรอง</p>{board.aiEvidence.responseId&&<p>รหัสคำตอบ <code>{board.aiEvidence.responseId}</code></p>}<p>สร้างเมื่อ {new Date(board.aiEvidence.generatedAt).toLocaleString("th-TH")}</p><p>รหัสตรวจเทียบรายการภารกิจ <code>{board.aiEvidence.selectionSha256}</code></p>{board.aiEvidence.usage?.totalTokens!=null&&<p>ใช้ {board.aiEvidence.usage.totalTokens} โทเค็นของโมเดล · เป็นหน่วยประมวลผล แยกจากโทเค็นรางวัล</p>}<details><summary>ดูภารกิจที่รับจาก AI ({board.aiEvidence.selectedQuests.length})</summary><ol className="brp-ai-picks">{board.aiEvidence.selectedQuests.map(q=><li key={q.quest_code}><code>{q.quest_code}</code><span>AI เสนอระดับ {q.level} · ระบบใช้ระดับ {cells.find(c=>c.quest_code===q.quest_code)?.level}</span></li>)}</ol></details><p className="text-muted">Backend ยังคงจัดระดับและตำแหน่งหลังรับคำตอบ AI</p></div>:<p>กระดานนี้สร้างก่อนเพิ่มการเก็บรหัสคำตอบ AI จึงมีเฉพาะสถานะและจำนวนครั้งที่เรียก กระดานใหม่จะเก็บหลักฐานเพิ่มเติม</p>}</details>}
                  {board.phase !== "STARTER" && <div className="xp-ai-examples"><span>ตัวอย่างข้อมูลประกอบ</span>{cells.filter(cell=>cell.family!=="DONATION"&&cell.reason).slice(0,3).map(cell=><div key={cell.position}><strong>{cell.short_title || cell.title}</strong><small>{cell.reason}</small></div>)}</div>}
                  <p className="text-muted">ระบบตรวจเป้าหมายและจัดระดับจากคลังภารกิจ ส่วนเหตุผลข้างต้นมาจากข้อมูลฝั่งระบบ</p>
                </div>
              </details>
            </aside>
          </div>
        )}
      </main>

      <dialog
        ref={cellDialog}
        className="dialog-sheet"
        onCancel={() => setSelectedCell(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedCell(null);
        }}
      >
        <div className="dialog-head">
          <span className="page-eyebrow">
            ภารกิจช่อง {(selectedCell?.position ?? 0) + 1}
          </span>
          <button
            type="button"
            className="button button--icon"
            aria-label="ปิดรายละเอียด"
            onClick={() => setSelectedCell(null)}
          >
            <X size={20} />
          </button>
        </div>
        {selectedCell && (
          <div className="dialog-body">
            <h2>{selectedCell.title}</h2>
            <div className="xp-mission-modal-tags">
              <span className="badge">
                {selectedCell.family === "DONATION"
                  ? "เพื่อสังคม"
                  : levelNames[selectedCell.level]}
              </span>
              <span className="badge">
                <Coins size={15} />+{selectedCell.token_reward} โทเค็น
              </span>
            </div>
            <div className="xp-mission-progress">
              <span>
                {isDone(selectedCell)
                  ? "สำเร็จแล้ว"
                  : `${fmt(selectedCell.progress)} / ${fmt(selectedCell.target_value)} ${selectedCell.unit || ""}`}
              </span>
              <progress
                className="xp-progress"
                value={Math.min(
                  selectedCell.progress || 0,
                  selectedCell.target_value,
                )}
                max={selectedCell.target_value}
              />
            </div>
            <p className="text-muted">
              {selectedCell.family === "DONATION"
                ? "เลือกมูลนิธิแล้วบันทึกการบริจาคทดลอง ระบบจะนับภารกิจนี้ให้"
                : "ระบบตรวจภารกิจนี้จากรายการชำระเงินที่สำเร็จบนกระดานนี้"}
            </p>
            {selectedCell.reason && (
              <details className="xp-inline-details">
                <summary>เหตุผลที่เลือกภารกิจนี้</summary>
                <p>{selectedCell.reason}</p>
              </details>
            )}
            {data.demoToolsEnabled &&
              !isDone(selectedCell) &&
              !claimed &&
              !accepted && (
                <button
                  className="button button--secondary xp-demo-complete"
                  disabled={busy}
                  onClick={() =>
                    action("demo-complete", {
                      boardIndex: currentIndex,
                      position: selectedCell.position,
                    })
                  }
                >
                  ทดสอบ: ทำภารกิจนี้สำเร็จ
                </button>
              )}
            <div className="dialog-actions">
              {isDone(selectedCell) || claimed || accepted ? (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => setSelectedCell(null)}
                >
                  เข้าใจแล้ว
                </button>
              ) : (
                <Link
                  className="button button--primary"
                  to={
                    selectedCell.family === "DONATION"
                      ? "/charities"
                      : "/payment"
                  }
                >
                  {selectedCell.family === "DONATION"
                    ? "เลือกมูลนิธิ"
                    : "ไปชำระเงินทดลอง"}
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={claimDialog}
        className="dialog-sheet"
        onCancel={() => {
          if (!busy) setClaimOpen(false);
        }}
      >
        <div className="dialog-head">
          <h2>เลือกเส้นรับโบนัส</h2>
          <button
            type="button"
            className="button button--icon"
            disabled={busy}
            aria-label="ปิด"
            onClick={() => setClaimOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">
          <div className="segmented xp-claim-mode">
            <button
              type="button"
              aria-pressed={claimMode === "AUTO_MAX_TOKEN"}
              onClick={() => setClaimMode("AUTO_MAX_TOKEN")}
            >
              เลือกให้ฉัน
            </button>
            <button
              type="button"
              aria-pressed={claimMode === "MANUAL"}
              onClick={() => setClaimMode("MANUAL")}
            >
              เลือกเอง
            </button>
          </div>
          {claimMode === "AUTO_MAX_TOKEN" ? (
            <div className="xp-claim-summary">
              <Trophy size={26} />
              <strong>{bestLine?.name}</strong>
              <span>
                โบนัสสูงสุดที่รับได้ +{bestLine?.tokenReward || 0} โทเค็น
              </span>
            </div>
          ) : (
            <fieldset className="xp-line-options">
              <legend className="xp-visually-hidden">เส้นที่สำเร็จ</legend>
              {ready.map((line) => (
                <label key={line.id}>
                  <input
                    type="radio"
                    name="bingo-line"
                    value={line.id}
                    checked={lineId === line.id}
                    onChange={() => setLineId(line.id)}
                  />
                  <span>{line.name}</span>
                  <strong>+{line.tokenReward}</strong>
                </label>
              ))}
            </fieldset>
          )}
          <p className="text-muted">
            รับโบนัสได้หนึ่งเส้นต่อกระดาน
            เมื่อยืนยันแล้วกระดานนี้จะหยุดนับภารกิจ
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={busy}
              onClick={() => setClaimOpen(false)}
            >
              ทำภารกิจต่อก่อน
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy || !chosenLine}
              onClick={() =>
                action("claim", {
                  boardIndex: currentIndex,
                  mode: claimMode,
                  ...(claimMode === "MANUAL" ? { lineId } : {}),
                })
              }
            >
              {busy
                ? "กำลังบันทึก…"
                : `ยืนยันรับ +${chosenLine?.tokenReward || 0}`}
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={acceptDialog}
        className="dialog-sheet"
        onCancel={() => {
          if (!busy) setAcceptOpen(false);
        }}
      >
        <div className="dialog-head">
          <h2>
            {currentIndex < 3 ? "เริ่มกระดานถัดไป?" : "จบกระดานเดือนนี้?"}
          </h2>
          <button
            type="button"
            className="button button--icon"
            disabled={busy}
            aria-label="ปิด"
            onClick={() => setAcceptOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">
          <p>
            {currentIndex < 3
              ? "กระดานใหม่จะเริ่มความคืบหน้าใหม่ โทเค็นที่ได้รับยังอยู่ครบ"
              : "ความสำเร็จและโทเค็นของคุณจะถูกเก็บไว้ กระดานชุดใหม่เปิดเดือนหน้า"}
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={busy}
              onClick={() => setAcceptOpen(false)}
            >
              ไว้ก่อน
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={busy}
              onClick={() => action("accept", { boardIndex: currentIndex })}
            >
              {busy ? "กำลังบันทึก…" : "ยืนยัน"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
