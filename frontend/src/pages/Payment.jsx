import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Store,
  Search,
  Wallet,
  Plus,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const day = (v) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(v),
  );
export default function Payment() {
  const { wallet, refreshUser, resetBalance } = useAuth();
  const [shops, setShops] = useState([]),
    [history, setHistory] = useState([]),
    [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState(""),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState(null);
  const request = useRef(null);
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get("/transactions/shops"),
        api.get("/transactions/my-history"),
      ]);
      setShops(a.data.data);
      setHistory(b.data.data);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดร้านค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const total = Number(amount) || 0,
    balance = Number(wallet?.balance || 0),
    selected = shops.find((s) => s.shopId === shopId);
  const remaining = Math.max(
    0,
    150 -
      history
        .filter(
          (t) => day(t.paidAt) === day(new Date()) && t.status === "COMPLETED",
        )
        .reduce((sum, t) => sum + t.governmentAmount, 0),
  );
  const subsidy = Math.min(remaining, Math.round(total * 60) / 100),
    payment = Math.round((total - subsidy) * 100) / 100;
  async function pay(e) {
    e.preventDefault();
    if (busy || !selected || total <= 0) return;
    const signature = `${shopId}:${total}`;
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/transactions/pay", {
        shopId,
        amount: total,
        requestId: request.current.id,
      });
      setReceipt(data.data);
      request.current = null;
      await refreshUser();
      await load();
    } catch (e) {
      setError(
        e.response?.data?.error ||
          "ยังยืนยันไม่ได้ กดลองใหม่เพื่อตรวจรายการเดิม",
      );
    } finally {
      setBusy(false);
    }
  }
  async function topup() {
    setBusy(true);
    const result = await resetBalance();
    if (!result.success) setError(result.error);
    setBusy(false);
  }
  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <Link className="xp-back" to="/bingo">
          <ArrowLeft size={16} />
          กลับบิงโก
        </Link>
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ใช้จ่ายแล้วสะสมภารกิจ</span>
            <h1>ชำระเงินทดลอง</h1>
            <p>เลือกร้านและยอดใช้จ่าย ระบบตรวจภารกิจให้</p>
          </div>
          <div className="xp-payment-wallet">
            <Wallet />
            <span>
              เงินทดลอง <strong>฿{money(balance)}</strong>
            </span>
            <button
              className="button button--secondary"
              onClick={topup}
              disabled={busy}
            >
              <Plus size={16} />
              500
            </button>
          </div>
        </div>
        {error && (
          <div className="notice notice--error" role="alert">
            {error}
          </div>
        )}
        {receipt ? (
          <section className="panel xp-payment-success">
            <CheckCircle2 size={48} />
            <h2>บันทึกการใช้จ่ายแล้ว</h2>
            <p>{receipt.shopName}</p>
            <strong>฿{money(receipt.totalAmount)}</strong>
            <p className="text-muted">
              หักเงินทดลอง ฿{money(receipt.userAmount)} · คงเหลือ ฿
              {money(receipt.remainingBalance)}
            </p>
            {receipt.questUpdate?.tokensAwarded > 0 && (
              <p className="notice notice--success">
                ทำภารกิจสำเร็จ ได้รับ {receipt.questUpdate.tokensAwarded} แต้ม
              </p>
            )}
            <div className="dialog-actions">
              <Link className="button button--primary" to="/bingo">
                ดูบิงโก
                <ArrowRight size={16} />
              </Link>
              <button
                className="button button--secondary"
                onClick={() => {
                  setReceipt(null);
                  setAmount("");
                }}
              >
                ทำรายการใหม่
              </button>
            </div>
            <small className="text-muted">
              รายการสาธิต ไม่มีการโอนเงินจริง
            </small>
          </section>
        ) : loading ? (
          <div className="empty-state">กำลังโหลดร้านค้า…</div>
        ) : (
          <form className="xp-payment-layout" onSubmit={pay}>
            <section className="panel xp-payment-shops">
              <h2>
                <span className="xp-step-number">1</span>เลือกร้านค้า
              </h2>
              <label className="xp-search">
                <Search size={18} />
                <input
                  aria-label="ค้นหาร้านค้า"
                  placeholder="ชื่อร้านหรือหมวดหมู่"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="xp-shop-list">
                {shops
                  .filter((s) => `${s.shopName} ${s.category}`.includes(query))
                  .map((shop) => (
                    <label
                      key={shop.shopId}
                      className={`xp-shop ${shopId === shop.shopId ? "is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="shop"
                        value={shop.shopId}
                        checked={shopId === shop.shopId}
                        onChange={() => setShopId(shop.shopId)}
                        disabled={busy}
                      />
                      <Store size={22} />
                      <span>
                        <strong>{shop.shopName}</strong>
                        <small>{shop.category}</small>
                      </span>
                    </label>
                  ))}
                {shops.length === 0 && (
                  <p className="empty-state">ยังไม่มีร้านค้าในระบบ</p>
                )}
              </div>
            </section>
            <section className="panel xp-payment-checkout">
              <h2>
                <span className="xp-step-number">2</span>ระบุยอดใช้จ่าย
              </h2>
              <label className="form-field">
                <span className="field-label">ยอดสินค้า (บาท)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <dl className="xp-receipt">
                <div>
                  <dt>ร้านค้า</dt>
                  <dd>{selected?.shopName || "ยังไม่ได้เลือก"}</dd>
                </div>
                <div>
                  <dt>ส่วนร่วมจ่ายทดลอง</dt>
                  <dd>− ฿{money(subsidy)}</dd>
                </div>
                <div>
                  <dt>คุณจ่าย</dt>
                  <dd>
                    <strong>฿{money(payment)}</strong>
                  </dd>
                </div>
              </dl>
              <p className="xp-quiet-note">
                ร่วมจ่ายทดลอง 60% · โควตาวันนี้เหลือ ฿{money(remaining)}
              </p>
              <button
                className="button button--primary xp-full"
                disabled={busy || !selected || total <= 0 || payment > balance}
              >
                {busy
                  ? "กำลังบันทึก…"
                  : payment > balance
                    ? "เติมเงินทดลองก่อนชำระ"
                    : "ยืนยันชำระทดลอง"}
              </button>
              <p className="xp-quiet-note">ใช้เงินทดลองเท่านั้น</p>
            </section>
          </form>
        )}
        <details className="panel xp-payment-history">
          <summary>ประวัติการใช้จ่าย · {history.length} รายการ</summary>
          {history.slice(0, 20).map((t) => (
            <div className="xp-history-row" key={t.transactionId}>
              <span>
                <strong>{t.shopName}</strong>
                <small>
                  {new Date(t.paidAt).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                  })}
                </small>
              </span>
              <span>฿{money(t.totalAmount)}</span>
            </div>
          ))}
        </details>
      </main>
    </div>
  );
}
