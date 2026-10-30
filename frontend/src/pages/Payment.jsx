import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Store,
  Search,
  Wallet,
  Plus,
  Ticket,
  QrCode,
  ScanLine,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../styles/payment-coupons.css";
import { useAuth } from "../context/AuthContext";
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const QUICK_AMOUNTS = [50, 100, 150, 200, 300];
// A QR carries a link ending in ?bill=CODE; people may also type just the code.
const billCodeFrom = (value) =>
  (String(value).match(/[?&]bill=([A-Za-z0-9]+)/)?.[1] || String(value).trim()).toUpperCase();
const CAN_SCAN = typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia);
const SHOWN_QUESTS = 4;
// Finished missions first, then the ones closest to done, so the most useful news is at the top.
const rankProgressed = (list) =>
  [...list].sort((a, b) => Number(b.completed) - Number(a.completed) || b.progress / b.target - a.progress / a.target);
const day = (v) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(v),
  );
export default function Payment() {
  const { wallet, refreshUser, resetBalance } = useAuth();
  const [search] = useSearchParams();
  const [coupons, setCoupons] = useState([]), [couponId, setCouponId] = useState(search.get("coupon") || "");
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
  const video = useRef(null);
  const [bill, setBill] = useState(null),
    [billInput, setBillInput] = useState(""),
    [billError, setBillError] = useState(""),
    [scanning, setScanning] = useState(false);
  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        api.get("/transactions/shops"),
        api.get("/transactions/my-history"),
        api.get("/rewards/my-items"),
      ]);
      setShops(a.data.data);
      setHistory(b.data.data);
      setCoupons(c.data.data.filter(item => item.paymentDiscount && item.status === "AVAILABLE"));
    } catch (e) {
      setError(e.response?.data?.error || "โหลดร้านค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const loadBill = useCallback(async (value) => {
    const code = billCodeFrom(value);
    if (!code) return;
    setBillError("");
    try {
      const { data } = await api.get(`/transactions/bills/${encodeURIComponent(code)}`);
      setBill(data.data);
      setShopId(data.data.shopId);
      setAmount(String(data.data.amount));
      setBillInput("");
    } catch (e) {
      setBill(null);
      setBillError(e.response?.data?.error || "อ่านบิลไม่สำเร็จ");
    }
  }, []);
  // Opened from a scanned QR link: /payment?bill=CODE
  const linkedBill = search.get("bill");
  useEffect(() => {
    if (linkedBill) loadBill(linkedBill);
  }, [linkedBill, loadBill]);
  function clearBill() {
    setBill(null);
    setShopId("");
    setAmount("");
    setBillError("");
  }
  // In-app scanner: the phone camera feeds the browser's BarcodeDetector.
  useEffect(() => {
    if (!scanning) return undefined;
    let stream;
    let timer;
    let active = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          const found = await detector.detect(video.current).catch(() => []);
          if (found[0]?.rawValue) {
            setScanning(false);
            loadBill(found[0].rawValue);
          }
        }, 400);
      } catch {
        setScanning(false);
        setBillError("เปิดกล้องไม่ได้ ลองกรอกรหัสบิลแทน");
      }
    })();
    return () => {
      active = false;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, loadBill]);
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
  const selectedCoupon = coupons.find(c => c.id === couponId);
  const couponInvalid = Boolean(couponId && (!selectedCoupon || total < selectedCoupon.paymentDiscount.minimumAmount));
  const discountAmount = selectedCoupon && !couponInvalid ? Math.min(total, selectedCoupon.paymentDiscount.amount) : 0;
  const netAmount = Math.round((total - discountAmount) * 100) / 100;
  const subsidy = Math.min(remaining, Math.round(netAmount * 60) / 100),
    payment = Math.round((netAmount - subsidy) * 100) / 100;
  async function pay(e) {
    e.preventDefault();
    if (busy || !selected || total <= 0 || couponInvalid) return;
    const signature = `${shopId}:${total}:${couponId}:${bill?.code || ""}`;
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/transactions/pay", {
        shopId,
        amount: total,
        ...(bill ? { billCode: bill.code } : {}),
        ...(couponId ? { couponRedemptionId: couponId } : {}),
        requestId: request.current.id,
      });
      setReceipt(data.data);
      setBill(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setCouponId("");
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
            {receipt.discountAmount > 0 && <p className="notice notice--success">ยอดสินค้า ฿{money(receipt.originalAmount)} · ใช้คูปองลด ฿{money(receipt.discountAmount)} แล้ว</p>}
            <p className="text-muted">
              หักเงินทดลอง ฿{money(receipt.userAmount)} · คงเหลือ ฿
              {money(receipt.remainingBalance)}
            </p>
            {receipt.questUpdate?.tokensAwarded > 0 && (
              <p className="notice notice--success">
                ทำภารกิจสำเร็จ ได้รับ {receipt.questUpdate.tokensAwarded} แต้ม
              </p>
            )}
            {receipt.questUpdate?.progressed?.length > 0 ? (
              <div className="xp-quest-progress" aria-label="ภารกิจที่คืบหน้า">
                <h3>การจ่ายครั้งนี้ทำให้ {receipt.questUpdate.progressed.length} ภารกิจคืบหน้า</h3>
                <ul>
                  {rankProgressed(receipt.questUpdate.progressed).slice(0, SHOWN_QUESTS).map((q) => (
                    <li key={q.position} className={q.completed ? "is-done" : ""}>
                      <div>
                        <strong>{q.title}</strong>
                        <span>
                          {q.completed
                            ? `สำเร็จแล้ว +${q.tokenReward} แต้ม`
                            : `${q.progress.toLocaleString("th-TH")}/${q.target.toLocaleString("th-TH")} ${q.unit || ""}`}
                        </span>
                      </div>
                      <progress value={q.progress} max={q.target} aria-label={q.title} />
                    </li>
                  ))}
                </ul>
                {receipt.questUpdate.progressed.length > SHOWN_QUESTS && (
                  <p className="text-muted">
                    และอีก {receipt.questUpdate.progressed.length - SHOWN_QUESTS} ภารกิจ{" "}
                    <Link to="/bingo">ดูทั้งหมดในบิงโก</Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted">ครั้งนี้ยังไม่มีภารกิจในกระดานที่ใช้งานอยู่คืบหน้า ลองดูภารกิจที่เหมาะกับร้านนี้ในบิงโก</p>
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
          <>
          <section className="panel xp-bill-entry">
            {bill ? (
              <div className="xp-bill-locked">
                <QrCode size={22} />
                <span>
                  <strong>บิลจาก {bill.shopName}</strong>
                  <small>ยอด ฿{money(bill.amount)}{bill.note ? ` · ${bill.note}` : ""} · แก้ยอดไม่ได้</small>
                </span>
                <button type="button" className="button button--secondary" onClick={clearBill} disabled={busy}>
                  <X size={16} />จ่ายแบบเลือกร้านเอง
                </button>
              </div>
            ) : (
              <>
                <h2><QrCode size={20} />มีบิลจากร้านค้า?</h2>
                <div className="xp-bill-row">
                  <input
                    aria-label="รหัสบิล"
                    placeholder="กรอกรหัสบิล เช่น 63A4EBFE"
                    value={billInput}
                    onChange={(e) => setBillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); loadBill(billInput); } }}
                  />
                  <button type="button" className="button button--primary" onClick={() => loadBill(billInput)} disabled={!billInput.trim()}>
                    ตรวจบิล
                  </button>
                  {CAN_SCAN && (
                    <button type="button" className="button button--secondary" onClick={() => setScanning(true)}>
                      <ScanLine size={16} />สแกน QR
                    </button>
                  )}
                </div>
                {!CAN_SCAN && <small className="text-muted">สแกน QR ด้วยกล้องมือถือของคุณ แล้วเปิดลิงก์ที่ได้ หรือกรอกรหัสบิล</small>}
              </>
            )}
            {billError && <p className="notice notice--error" role="alert">{billError}</p>}
            {scanning && (
              <div className="xp-scanner">
                <video ref={video} muted playsInline />
                <button type="button" className="button button--secondary" onClick={() => setScanning(false)}>ปิดกล้อง</button>
              </div>
            )}
          </section>
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
                        disabled={busy || Boolean(bill)}
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
                  disabled={busy || Boolean(bill)}
                />
                <span className="xp-quick-amounts" role="group" aria-label="เลือกยอดอย่างเร็ว">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`xp-chip${total === value ? " is-active" : ""}`}
                      onClick={() => setAmount(String(value))}
                      disabled={busy || Boolean(bill)}
                    >
                      ฿{value}
                    </button>
                  ))}
                </span>
              </label>
              <label className="form-field">
                <span className="field-label"><Ticket size={16}/> คูปองส่วนลด</span>
                <select className="form-select xp-payment-coupon-select" value={couponId} onChange={e=>setCouponId(e.target.value)} disabled={busy} aria-label="คูปองส่วนลด">
                  <option value="">ไม่ใช้คูปอง</option>
                  {coupons.map(c=><option value={c.id} key={c.id}>{c.title} · ขั้นต่ำ ฿{money(c.paymentDiscount.minimumAmount)}</option>)}
                </select>
                {coupons.length === 0 && <small className="text-muted">ยังไม่มีคูปองส่วนลดพร้อมใช้ <Link to="/rewards">แลกคูปอง</Link></small>}
                {couponInvalid && <small role="alert" style={{color:"#b42318"}}>{selectedCoupon ? `คูปองนี้ใช้กับยอดสินค้าตั้งแต่ ${selectedCoupon.paymentDiscount.minimumAmount} บาท` : "คูปองที่เลือกไม่พร้อมใช้ กรุณาเลือกใหม่"}</small>}
              </label>
              <dl className="xp-receipt">
                <div>
                  <dt>ร้านค้า</dt>
                  <dd>{selected?.shopName || "ยังไม่ได้เลือก"}</dd>
                </div>
                <div>
                  <dt>ยอดสินค้า</dt><dd>฿{money(total)}</dd>
                </div>
                {selectedCoupon && !couponInvalid && <div><dt>ส่วนลดคูปอง</dt><dd>− ฿{money(discountAmount)}</dd></div>}
                <div><dt>ยอดหลังส่วนลด</dt><dd>฿{money(netAmount)}</dd></div>
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
                หักคูปองก่อนคำนวณร่วมจ่าย 60% · โควตาวันนี้เหลือ ฿{money(remaining)}
              </p>
              <button
                className="button button--primary xp-full"
                disabled={busy || !selected || total <= 0 || payment > balance || couponInvalid}
              >
                {busy
                  ? "กำลังบันทึก…"
                  : !selected
                    ? "เลือกร้านค้าก่อน"
                    : total <= 0
                      ? "ใส่ยอดใช้จ่ายก่อน"
                      : payment > balance
                        ? "เติมเงินทดลองก่อนชำระ"
                        : `ยืนยันชำระ ฿${money(payment)}`}
              </button>
              <p className="xp-quiet-note">ใช้เงินทดลองเท่านั้น</p>
            </section>
          </form>
          </>
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
