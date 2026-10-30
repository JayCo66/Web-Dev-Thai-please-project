import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Gift,
  Ticket,
  Coins,
  ArrowRight,
  X,
  Check,
  Copy,
  Package,
  History,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
const date = (value) =>
  new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export default function ThaiPlus() {
  const { tokens, refreshUser } = useAuth();
  const [search, setSearch] = useSearchParams();
  const tab = ["items", "history"].includes(search.get("tab"))
    ? search.get("tab")
    : "rewards";
  const [catalog, setCatalog] = useState(null),
    [items, setItems] = useState([]),
    [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(null),
    [copied, setCopied] = useState("");
  const dialog = useRef(null),
    request = useRef(null);
  const load = useCallback(async () => {
    setError("");
    try {
      const [a, b, c] = await Promise.all([
        api.get("/rewards"),
        api.get("/rewards/my-items"),
        api.get("/rewards/my-history"),
      ]);
      setCatalog(a.data.data);
      setItems(b.data.data);
      setHistory(c.data.data.history);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดรางวัลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const choose = (item) => {
    setError("");
    setSelected(item);
    request.current = crypto.randomUUID();
  };
  const close = () => {
    if (!busy) setSelected(null);
  };
  const maxTickets =
    selected?.kind === "draw" && selected.tokenCost > 0
      ? Math.max(0, Math.min(100, Math.floor(tokens / selected.tokenCost)))
      : 0;
  const drawCount = Math.min(Number(selected?.tickets), maxTickets);
  const validCount =
    Number.isSafeInteger(drawCount) &&
    drawCount >= 1 &&
    drawCount <= maxTickets;
  const selectedCost =
    selected?.kind === "draw"
      ? validCount
        ? drawCount * selected.tokenCost
        : 0
      : selected?.tokenCost || 0;
  async function confirm() {
    if (
      busy ||
      !selected ||
      (selected.kind === "draw" && !validCount) ||
      tokens < selectedCost
    )
      return;
    setBusy(true);
    setError("");
    try {
      const draw = selected.kind === "draw";
      const { data } = await api.post(
        draw ? "/rewards/lucky-draw" : "/rewards/redeem",
        {
          ...(draw
            ? { ticketsCount: drawCount, rewardId: selected.rewardId }
            : { rewardId: selected.rewardId }),
          requestId: request.current,
        },
      );
      setSuccess(data.data);
      setSelected(null);
      await refreshUser();
      await load();
      setSearch({ tab: "items" });
    } catch (e) {
      setError(
        e.response?.data?.error ||
          "ยังยืนยันไม่ได้ กดลองใหม่เพื่อตรวจรายการเดิม",
      );
    } finally {
      setBusy(false);
    }
  }
  async function activateVoucher(item) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/rewards/use-voucher", { redemptionId: item.id });
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "ใช้คูปองไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setError("เลือกรหัสแล้วคัดลอกด้วยตนเองได้");
    }
  }
  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ให้ทุกภารกิจมีความหมาย</span>
            <h1>รางวัลของคุณ</h1>
            <p>ใช้แต้มที่สะสม เลือกรางวัลที่ชอบ</p>
          </div>
          <div className="xp-reward-balance">
            <Coins />
            <strong>{tokens.toLocaleString("th-TH")}</strong> แต้ม
          </div>
        </div>
        <div className="segmented xp-reward-tabs">
          {[
            ["rewards", Gift, "ลุ้น / แลกรางวัล"],
            ["items", Package, "รายการของฉัน"],
            ["history", History, "ประวัติแต้ม"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              aria-pressed={tab === key}
              onClick={() => {
                setSearch(key === "rewards" ? {} : { tab: key });
                setSuccess(null);
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        {error && !selected && (
          <div className="notice notice--error" role="alert">
            {error}
            <button className="button button--ghost" onClick={load}>
              ลองใหม่
            </button>
          </div>
        )}
        {success && (
          <div className="notice notice--success" role="status">
            <Check size={18} />
            {success.kind === "LUCKY_DRAW"
              ? "เพิ่มสิทธิ์ลุ้นในบัญชีแล้ว"
              : success.kind === "PHYSICAL"
                ? "บันทึกการแลกของแล้ว"
                : "บันทึกคูปองแล้ว"}{" "}
            · ใช้ {success.tokensSpent} แต้ม · คงเหลือ {success.remainingTokens}{" "}
            แต้ม
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            กำลังโหลดรางวัล…
          </div>
        ) : (
          <>
            {tab === "rewards" && (
              <>
                <p className="xp-quiet-note">
                  รางวัลสาธิตสำหรับโครงงาน ยังใช้รับสินค้าและบริการจริงไม่ได้
                </p>
                <section className="xp-prize-section">
                  <div className="xp-section-heading">
                    <div>
                      <h2>3 รางวัลที่อยากลุ้น</h2>
                      <p>เลือกสะสมสิทธิ์ให้รางวัลที่คุณชอบ</p>
                    </div>
                    <span className="badge">แคมเปญสาธิต</span>
                  </div>
                  <div className="xp-prize-grid">
                    {catalog?.prizes?.map((prize) => (
                      <article
                        key={prize.rewardId}
                        className="panel xp-prize-card"
                      >
                        <div
                          className={`xp-prize-art ${prize.name.includes("iPhone") ? "is-phone" : ""}`}
                        >
                          <span className="badge">ลุ้นรางวัล</span>
                          <img
                            src={prize.imageUrl}
                            alt={prize.name}
                            loading="lazy"
                          />
                        </div>
                        <div className="xp-prize-copy">
                          <h3>{prize.name}</h3>
                          <p className="xp-prize-value">
                            {prize.prizeValue == null
                              ? "ยังไม่ระบุราคา"
                              : `฿${Number(prize.prizeValue).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </p>
                          <p>{prize.tokenCost} แต้ม / 1 สิทธิ์</p>
                          <button
                            className="button button--primary"
                            disabled={tokens < prize.tokenCost}
                            onClick={() =>
                              choose({ ...prize, kind: "draw", tickets: 1 })
                            }
                          >
                            <Ticket size={17} />
                            ลุ้น{prize.name}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                <div className="xp-section-heading">
                  <div>
                    <h2>ของเล็ก ๆ ที่แลกได้</h2>
                    <p>ใช้แต้มแลกคูปองหรือของที่ระลึก</p>
                  </div>
                </div>
                <div className="xp-reward-grid">
                  {catalog?.rewards.map((item) => (
                    <article
                      className="panel xp-reward-card"
                      key={item.rewardId}
                    >
                      <div className="xp-reward-art">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                          />
                        ) : item.rewardType === "PHYSICAL" ? (
                          <Package size={44} />
                        ) : (
                          <Gift size={44} />
                        )}
                      </div>
                      <div className="xp-reward-copy">
                        <h2>{item.name}</h2>
                        {item.description && (
                          <details>
                            <summary>รายละเอียด</summary>
                            <p>{item.description}</p>
                          </details>
                        )}
                        <div className="xp-reward-bottom">
                          <strong>{item.tokenCost} แต้ม</strong>
                          <button
                            className="button button--primary"
                            disabled={tokens < item.tokenCost}
                            onClick={() => choose(item)}
                          >
                            {tokens < item.tokenCost
                              ? `ขาด ${item.tokenCost - tokens} แต้ม`
                              : "แลกรางวัล"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {catalog?.rewards.length === 0 && (
                  <p className="empty-state">ยังไม่มีรางวัลเปิดให้แลก</p>
                )}

                <Link className="xp-reward-more" to="/bingo">
                  ทำภารกิจเพื่อรับแต้มเพิ่ม
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
            {tab === "items" &&
              (items.length === 0 ? (
                <div className="empty-state">
                  <Gift size={36} />
                  <h2>รางวัลชิ้นแรกกำลังรอคุณ</h2>
                  <p>ประวัติสิทธิ์ลุ้น ของที่แลก และคูปองจะเก็บไว้ที่นี่</p>
                  <button
                    className="button button--primary"
                    onClick={() => setSearch({})}
                  >
                    ดูรางวัล
                  </button>
                </div>
              ) : (
                <div className="xp-owned-items">
                  {items.map((item) => {
                    const draw = item.kind === "LUCKY_DRAW";
                    const coupon = ["COUPON", "DISCOUNT"].includes(item.kind);
                    const title = draw
                      ? item.prizeName ||
                        String(item.title || "สิทธิ์ลุ้นรางวัล").replace(
                          /^สิทธิ์ลุ้น\s*/,
                          "",
                        )
                      : item.title;
                    const period = new Date(item.createdAt).toLocaleDateString(
                      "th-TH",
                      { month: "long", year: "numeric" },
                    );
                    return (
                      <article
                        className={`panel xp-owned-item ${item.status === "USED" ? "is-used" : ""}`}
                        key={item.id}
                        data-item-kind={item.kind}
                      >
                        {item.imageUrl ? (
                          <img
                            className="xp-owned-thumb"
                            src={item.imageUrl}
                            alt={title}
                          />
                        ) : (
                          <div className="xp-stat-icon">
                            {draw ? <Ticket /> : <Gift />}
                          </div>
                        )}
                        <div>
                          <span className="badge">
                            {draw
                              ? "สิทธิ์ลุ้นรางวัล"
                              : coupon
                                ? item.status === "USED"
                                  ? "ใช้แล้ว"
                                  : item.status === "EXPIRED"
                                    ? "หมดอายุ"
                                    : "คูปอง"
                                : "รายการแลกของ"}
                          </span>
                          <h2>{title}</h2>
                          {draw && (
                            <>
                              <p className="xp-entry-count">
                                สะสม {item.ticketsCount || 1} สิทธิ์ · งวด
                                {period}
                              </p>
                              <p className="text-muted">
                                บันทึกสิทธิ์ในบัญชีแล้ว · ยังไม่มีผลการจับรางวัล
                              </p>
                            </>
                          )}
                          <p className="text-muted">
                            {draw ? "เพิ่มสิทธิ์" : "แลกเมื่อ"}{" "}
                            {date(item.createdAt)} · ใช้ {item.tokensSpent} แต้ม
                            {coupon && item.expiresAt
                              ? ` · ถึง ${date(item.expiresAt)}`
                              : ""}
                          </p>
                          {!draw && !coupon && (
                            <p className="text-muted">
                              บันทึกการแลกในบัญชีแล้ว
                            </p>
                          )}
                          {coupon && (
                            <code>{item.voucherCode || item.code}</code>
                          )}
                        </div>
                        {coupon && (
                          <div className="xp-owned-actions">
                            {item.status === "AVAILABLE" && (
                              <button
                                className="button button--primary"
                                disabled={busy}
                                onClick={() => activateVoucher(item)}
                              >
                                ใช้คูปองทดลอง
                              </button>
                            )}
                            <button
                              className="button button--secondary"
                              onClick={() =>
                                copy(item.voucherCode || item.code)
                              }
                            >
                              {copied === (item.voucherCode || item.code) ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                              คัดลอกรหัสคูปอง
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ))}
            {tab === "history" && (
              <section className="panel xp-token-history">
                {history.length === 0 ? (
                  <p className="empty-state">ยังไม่มีรายการแต้ม</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{item.description}</strong>
                        <small>{date(item.createdAt)}</small>
                      </span>
                      <strong className={item.amount > 0 ? "xp-credit" : ""}>
                        {item.amount > 0 ? "+" : ""}
                        {item.amount} แต้ม
                      </strong>
                    </div>
                  ))
                )}
              </section>
            )}
          </>
        )}
        <dialog
          ref={dialog}
          className="dialog-sheet"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          aria-labelledby="reward-title"
        >
          <div className="dialog-head">
            <h2 id="reward-title">
              {selected?.kind === "draw"
                ? "ยืนยันสิทธิ์ลุ้น"
                : "ยืนยันแลกรางวัล"}
            </h2>
            <button
              className="button button--icon"
              aria-label="ปิด"
              onClick={close}
              disabled={busy}
            >
              <X />
            </button>
          </div>
          <div className="dialog-body">
            {selected?.imageUrl && (
              <img
                className="xp-draw-preview"
                src={selected.imageUrl}
                alt={selected.name}
              />
            )}
            <h3>{selected?.name}</h3>
            {selected?.kind === "draw" && (
              <div className="xp-ticket-quantity">
                <p className="xp-prize-value">
                  {selected.prizeValue == null
                    ? "ยังไม่ระบุราคา"
                    : `฿${Number(selected.prizeValue).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
                <label htmlFor="ticket-count">จำนวนสิทธิ์ที่ต้องการ</label>
                <input
                  id="ticket-count"
                  type="number"
                  min="1"
                  max={maxTickets}
                  step="1"
                  inputMode="numeric"
                  value={selected.tickets === "" ? "" : drawCount}
                  disabled={busy}
                  onChange={(e) => {
                    request.current = crypto.randomUUID();
                    const raw = e.target.value;
                    setSelected((s) => ({
                      ...s,
                      tickets:
                        raw === "" ? "" : Math.min(Number(raw), maxTickets),
                    }));
                  }}
                  aria-describedby="ticket-count-hint"
                />
                <p id="ticket-count-hint" className="text-muted">
                  แลกได้สูงสุด {maxTickets} สิทธิ์ · สิทธิ์ละ{" "}
                  {selected.tokenCost} แต้ม
                </p>
                {!validCount && (
                  <p role="alert">
                    {maxTickets > 0
                      ? `กรอกจำนวนเต็มตั้งแต่ 1 ถึง ${maxTickets} สิทธิ์`
                      : "แต้มยังไม่พอสำหรับ 1 สิทธิ์"}
                  </p>
                )}
              </div>
            )}

            <dl className="xp-receipt">
              <div>
                <dt>ใช้แต้ม</dt>
                <dd>{selectedCost} แต้ม</dd>
              </div>
              <div>
                <dt>คงเหลือ</dt>
                <dd>{Math.max(0, tokens - selectedCost)} แต้ม</dd>
              </div>
            </dl>
            <p className="text-muted">สิทธิ์สาธิตจะบันทึกในบัญชีนี้</p>
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button button--secondary"
                disabled={busy}
                onClick={close}
              >
                ยกเลิก
              </button>
              <button
                className="button button--primary"
                disabled={
                  busy ||
                  tokens < selectedCost ||
                  (selected?.kind === "draw" && !validCount)
                }
                onClick={confirm}
              >
                {busy ? "กำลังยืนยัน…" : "ยืนยันใช้แต้ม"}
              </button>
            </div>
          </div>
        </dialog>
      </main>
    </div>
  );
}
