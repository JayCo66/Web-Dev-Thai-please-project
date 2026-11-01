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
  Clock,
  ShieldCheck,
  Receipt,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
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

const CAN_SCAN =
  typeof window !== "undefined" &&
  "BarcodeDetector" in window &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const SHOWN_QUESTS = 4;

const rankProgressed = (list) =>
  [...list].sort(
    (a, b) =>
      Number(b.completed) - Number(a.completed) ||
      b.progress / b.target - a.progress / a.target
  );

const day = (v) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(v)
  );

/** Expiration Countdown for Verified Bills */
function BillCountdown({ expiresAt, onExpired }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt) - Date.now()) / 1000)
      );
      setLeft(remaining);
      if (remaining <= 0 && onExpired) {
        onExpired();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  const isUrgent = left < 180; // less than 3 mins

  if (left <= 0) {
    return <span className="verified-timer-badge is-urgent">บิลหมดอายุแล้ว</span>;
  }

  return (
    <span className={`verified-timer-badge ${isUrgent ? "is-urgent" : ""}`}>
      <Clock size={13} />
      เหลือเวลาชำระ {mins}:{secs} นาที
    </span>
  );
}

export default function Payment() {
  const { wallet, refreshUser, resetBalance } = useAuth();
  const [search] = useSearchParams();

  // Mode: "BILL" (Default) or "MANUAL"
  const [mode, setMode] = useState("BILL");

  const [coupons, setCoupons] = useState([]);
  const [couponId, setCouponId] = useState(search.get("coupon") || "");
  const [shops, setShops] = useState([]);
  const [history, setHistory] = useState([]);
  const [shopId, setShopId] = useState("");
  const [amount, setAmount] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  // Bill Verification State
  const [bill, setBill] = useState(null);
  const [billInput, setBillInput] = useState("");
  const [billError, setBillError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const request = useRef(null);
  const video = useRef(null);

  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        api.get("/transactions/shops"),
        api.get("/transactions/my-history"),
        api.get("/rewards/my-items"),
      ]);
      setShops(a.data.data);
      setHistory(b.data.data);
      setCoupons(
        c.data.data.filter(
          (item) => item.paymentDiscount && item.status === "AVAILABLE"
        )
      );
    } catch (e) {
      setError(e.response?.data?.error || "โหลดข้อมูลไม่สำเร็จ");
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
    setVerifying(true);
    try {
      const { data } = await api.get(
        `/transactions/bills/${encodeURIComponent(code)}`
      );
      setBill(data.data);
      setShopId(data.data.shopId);
      setAmount(String(data.data.amount));
      setBillInput("");
      setMode("BILL");
    } catch (e) {
      setBill(null);
      setBillError(e.response?.data?.error || "ไม่พบบิลนี้ กรุณาตรวจสอบรหัสอีกครั้ง");
    } finally {
      setVerifying(false);
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
    setBillInput("");
  }

  function handleCopyCode(code) {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // In-app scanner: the phone camera feeds the browser's BarcodeDetector.
  useEffect(() => {
    if (!scanning) return undefined;
    let stream;
    let timer;
    let active = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
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
        setBillError("ไม่สามารถเปิดกล้องได้ กรุณากรอกรหัสบิลแทน");
      }
    })();
    return () => {
      active = false;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, loadBill]);

  const total = Number(amount) || 0;
  const balance = Number(wallet?.balance || 0);
  const selected = bill
    ? { shopId: bill.shopId, shopName: bill.shopName, category: bill.category }
    : shops.find((s) => s.shopId === shopId);

  // Daily 150 THB subsidy quota calculation
  const remainingDailySubsidy = Math.max(
    0,
    150 -
      history
        .filter(
          (t) => day(t.paidAt) === day(new Date()) && t.status === "COMPLETED"
        )
        .reduce((sum, t) => sum + t.governmentAmount, 0)
  );

  const selectedCoupon = coupons.find((c) => c.id === couponId);
  const couponInvalid = Boolean(
    couponId &&
      (!selectedCoupon ||
        total < selectedCoupon.paymentDiscount.minimumAmount)
  );
  const discountAmount =
    selectedCoupon && !couponInvalid
      ? Math.min(total, selectedCoupon.paymentDiscount.amount)
      : 0;
  const netAmount = Math.max(0, Math.round((total - discountAmount) * 100) / 100);
  const subsidy = Math.min(
    remainingDailySubsidy,
    Math.round(netAmount * 60) / 100
  );
  const payment = Math.max(0, Math.round((netAmount - subsidy) * 100) / 100);

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
          "ยังไม่สามารถบันทึกรายการได้ กรุณากดลองใหม่อีกครั้ง"
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
      <main id="main-content" className="payment-page-container">
        {/* Navigation Back */}
        <Link className="payment-back-link" to="/bingo">
          <ArrowLeft size={16} />
          กลับไปหน้าบิงโกภารกิจ
        </Link>

        {/* Page Header & Balance Badges */}
        <div className="payment-header-grid">
          <div className="payment-title-group">
            <h1>
              <Receipt size={26} color="#2563eb" />
              ชำระเงินคนละครึ่ง
            </h1>
            <p>
              รัฐร่วมจ่าย 60% สูงสุด 150 บาท/วัน สนับสนุนร้านค้าชุมชนและสะสมแต้มบิงโก
            </p>
          </div>

          <div className="payment-stats-badges">
            {/* Wallet Balance Card */}
            <div className="payment-stat-card wallet-card">
              <div className="payment-stat-icon">
                <Wallet size={18} />
              </div>
              <div className="payment-stat-content">
                <span className="payment-stat-label">เงินทดลองในกระเป๋า</span>
                <span className="payment-stat-val">฿{money(balance)}</span>
              </div>
              <button
                type="button"
                className="payment-topup-btn"
                onClick={topup}
                disabled={busy}
                title="เติมเงินทดลอง 500 บาท"
              >
                <Plus size={14} />
                500
              </button>
            </div>

            {/* Daily Co-Pay Quota Card */}
            <div className="payment-stat-card quota-card">
              <div className="payment-stat-icon">
                <Sparkles size={18} />
              </div>
              <div className="payment-stat-content">
                <span className="payment-stat-label">โควตารัฐช่วยวันนี้</span>
                <span className="payment-stat-val" style={{ color: "#059669" }}>
                  ฿{money(remainingDailySubsidy)}
                  <small style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}> / 150</small>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="notice notice--error" role="alert" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: PAYMENT SUCCESS RECEIPT */}
        {/* ========================================================= */}
        {receipt ? (
          <section className="payment-receipt-paper">
            <div className="receipt-stamp-badge">
              <CheckCircle2 size={36} />
            </div>
            <h2>ชำระเงินสำเร็จเรียบร้อย</h2>
            <p className="receipt-shop-name">{receipt.shopName}</p>

            <div className="receipt-amount-block">
              <p className="receipt-amount-large">฿{money(receipt.totalAmount)}</p>
              <p className="receipt-amount-sub">ยอดรวมค่าสินค้าและบริการ</p>
            </div>

            <div className="receipt-breakdown-table">
              <div className="receipt-breakdown-row">
                <span>ยอดสินค้าเดิม</span>
                <span>฿{money(receipt.originalAmount)}</span>
              </div>
              {receipt.discountAmount > 0 && (
                <div className="receipt-breakdown-row" style={{ color: "#b45309" }}>
                  <span>ส่วนลดคูปอง</span>
                  <span>- ฿{money(receipt.discountAmount)}</span>
                </div>
              )}
              <div className="receipt-breakdown-row" style={{ color: "#059669" }}>
                <span>ภาครัฐร่วมจ่าย (60%)</span>
                <span>- ฿{money(receipt.governmentAmount)}</span>
              </div>
              <div className="receipt-breakdown-row strong">
                <span>คุณจ่ายจริง (เงินทดลอง)</span>
                <span>฿{money(receipt.userAmount)}</span>
              </div>
              <div className="receipt-breakdown-row" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b" }}>เงินทดลองคงเหลือ</span>
                <span style={{ fontWeight: 600 }}>฿{money(receipt.remainingBalance)}</span>
              </div>
            </div>

            {/* Quests Progress Updates */}
            {receipt.questUpdate?.tokensAwarded > 0 && (
              <div className="notice notice--success" style={{ margin: "16px 0", textAlign: "left" }}>
                🎉 <strong>ยอดเยี่ยม!</strong> คุณทำภารกิจสำเร็จ ได้รับ +{receipt.questUpdate.tokensAwarded} โทเคนรางวัล!
              </div>
            )}

            {receipt.questUpdate?.progressed?.length > 0 && (
              <div className="receipt-quest-updates">
                <h3>
                  <Sparkles size={16} />
                  การจ่ายครั้งนี้ทำให้ {receipt.questUpdate.progressed.length} ภารกิจคืบหน้า
                </h3>
                <ul className="receipt-quest-list">
                  {rankProgressed(receipt.questUpdate.progressed)
                    .slice(0, SHOWN_QUESTS)
                    .map((q) => (
                      <li
                        key={q.position}
                        className={`receipt-quest-item ${q.completed ? "is-done" : ""}`}
                      >
                        <div className="receipt-quest-header">
                          <strong>{q.title}</strong>
                          <span>
                            {q.completed
                              ? `สำเร็จ! +${q.tokenReward} แต้ม`
                              : `${q.progress.toLocaleString("th-TH")}/${q.target.toLocaleString("th-TH")} ${q.unit || ""}`}
                          </span>
                        </div>
                        <progress
                          className="receipt-quest-progress"
                          value={q.progress}
                          max={q.target}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="receipt-action-buttons">
              <Link className="receipt-btn-primary" to="/bingo">
                ไปเปิดกระดานบิงโก
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                className="receipt-btn-secondary"
                onClick={() => {
                  setReceipt(null);
                  clearBill();
                }}
              >
                ทำรายการใหม่
              </button>
            </div>
          </section>
        ) : loading ? (
          <div className="empty-state">กำลังเตรียมข้อมูลระบบชำระเงิน…</div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* VIEW 2: BILL VERIFIED CARD (When Bill is Loaded)          */}
            {/* ========================================================= */}
            {bill ? (
              <section className="payment-verified-card">
                <div className="verified-card-topbar">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="verified-status-badge">
                      <ShieldCheck size={16} />
                      บิลถูกต้อง พร้อมชำระ
                    </span>
                    <span className="verified-bill-code">
                      เลขที่บิล: #{bill.code}
                      <button
                        type="button"
                        onClick={() => handleCopyCode(bill.code)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#64748b" }}
                        title="คัดลอกรหัสบิล"
                      >
                        {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </span>
                  </div>

                  {bill.expiresAt && (
                    <BillCountdown expiresAt={bill.expiresAt} onExpired={clearBill} />
                  )}
                </div>

                <div className="verified-bill-body">
                  <div className="verified-shop-info">
                    <div className="verified-shop-avatar">
                      <Store size={26} />
                    </div>
                    <div className="verified-shop-text">
                      <div className="verified-shop-tags">
                        <span className="verified-tag">{bill.category}</span>
                        <span className="verified-tag" style={{ background: "#ecfdf5", color: "#047857" }}>
                          ร้านค้าคนละครึ่ง
                        </span>
                      </div>
                      <h3>{bill.shopName}</h3>
                      {bill.note && (
                        <span className="verified-bill-note">
                          <strong>รายการ:</strong> {bill.note}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="verified-amount-display">
                    <div className="verified-amount-label">ยอดเรียกเก็บตามบิล</div>
                    <div className="verified-amount-val">฿{money(bill.amount)}</div>
                  </div>
                </div>

                <div className="verified-card-actions">
                  <button
                    type="button"
                    className="verified-cancel-btn"
                    onClick={clearBill}
                    disabled={busy}
                  >
                    <X size={15} />
                    เปลี่ยนบิล / เลือกร้านค้าเอง
                  </button>
                </div>
              </section>
            ) : (
              /* ========================================================= */
              /* VIEW 3: BILL SEARCH / INPUT (When No Bill is Loaded)     */
              /* ========================================================= */
              <>
                {/* Mode Switch Tabs */}
                <div className="payment-mode-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "BILL"}
                    className={`payment-mode-tab ${mode === "BILL" ? "is-active" : ""}`}
                    onClick={() => setMode("BILL")}
                  >
                    <QrCode size={16} />
                    ชำระด้วยรหัสบิล (แนะนำ)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "MANUAL"}
                    className={`payment-mode-tab ${mode === "MANUAL" ? "is-active" : ""}`}
                    onClick={() => setMode("MANUAL")}
                  >
                    <Store size={16} />
                    เลือกร้านค้าเอง (ไม่มีบิล)
                  </button>
                </div>

                {mode === "BILL" ? (
                  <section className="payment-bill-search-card">
                    <div className="payment-bill-search-header">
                      <h2>
                        <QrCode size={20} color="#2563eb" />
                        ระบุรหัสบิลชำระเงินจากร้านค้า
                      </h2>
                      <p>
                        กรอกรหัสบิลที่แสดงบนหน้าจอบิลของร้านค้า หรือสแกน QR Code เพื่อดึงข้อมูลบิลมาชำระ
                      </p>
                    </div>

                    <div className="payment-bill-input-row">
                      <div className="payment-bill-input-wrapper">
                        <Receipt size={20} className="payment-bill-input-icon" />
                        <input
                          aria-label="รหัสบิลชำระเงิน"
                          placeholder="กรอกรหัสบิล เช่น TESTBILL88 หรือ 63A4EBFE"
                          value={billInput}
                          maxLength={20}
                          onChange={(e) => setBillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              loadBill(billInput);
                            }
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="payment-verify-btn"
                        onClick={() => loadBill(billInput)}
                        disabled={!billInput.trim() || verifying}
                      >
                        {verifying ? "กำลังตรวจสอบ…" : "ตรวจสอบบิล"}
                      </button>

                      {CAN_SCAN && (
                        <button
                          type="button"
                          className="payment-scan-btn"
                          onClick={() => setScanning(true)}
                          disabled={verifying}
                        >
                          <ScanLine size={18} />
                          สแกน QR บิล
                        </button>
                      )}
                    </div>

                    {/* Quick Test Bill Chips */}
                    <div className="payment-sample-chip-row">
                      <span>💡 คลิกเพื่อทดลองชำระด้วยบิลตัวอย่าง:</span>
                      <button
                        type="button"
                        className="payment-sample-chip"
                        onClick={() => {
                          setBillInput("DEMO77");
                          loadBill("DEMO77");
                        }}
                      >
                        DEMO77 (฿150 ข้าวกะเพรา)
                      </button>
                      <button
                        type="button"
                        className="payment-sample-chip"
                        onClick={() => {
                          setBillInput("THAI99");
                          loadBill("THAI99");
                        }}
                      >
                        THAI99 (฿80 ก๋วยเตี๋ยวเรือ)
                      </button>
                    </div>

                    {billError && (
                      <p
                        className="notice notice--error"
                        role="alert"
                        style={{ marginTop: 14 }}
                      >
                        <AlertCircle size={16} />
                        {billError}
                      </p>
                    )}

                    {scanning && (
                      <div className="payment-scanner-container">
                        <video ref={video} muted playsInline />
                        <button
                          type="button"
                          className="payment-scanner-close-btn"
                          onClick={() => setScanning(false)}
                        >
                          ปิดกล้อง
                        </button>
                      </div>
                    )}
                  </section>
                ) : (
                  /* ========================================================= */
                  /* MODE 2: MANUAL SHOP & AMOUNT SELECTION                    */
                  /* ========================================================= */
                  <section className="manual-shop-picker-card">
                    <h2 style={{ fontSize: 18, margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      <Store size={20} color="#2563eb" />
                      เลือกร้านค้าชุมชน
                    </h2>

                    <div className="manual-shop-search">
                      <Search size={18} className="manual-shop-search-icon" />
                      <input
                        placeholder="ค้นหาชื่อร้าน หรือหมวดหมู่สินค้า…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    <div className="manual-shop-list">
                      {shops
                        .filter((s) => `${s.shopName} ${s.category}`.toLowerCase().includes(query.toLowerCase()))
                        .map((shop) => (
                          <div
                            key={shop.shopId}
                            className={`manual-shop-item ${shopId === shop.shopId ? "is-selected" : ""}`}
                            onClick={() => setShopId(shop.shopId)}
                          >
                            <input
                              type="radio"
                              name="manual-shop"
                              checked={shopId === shop.shopId}
                              onChange={() => setShopId(shop.shopId)}
                            />
                            <div>
                              <strong>{shop.shopName}</strong>
                              <small>{shop.category}</small>
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="manual-amount-section">
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                        ระบุยอดสินค้า (บาท)
                      </label>
                      <div className="manual-amount-input-row">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <div className="manual-quick-amounts">
                          {QUICK_AMOUNTS.map((val) => (
                            <button
                              type="button"
                              key={val}
                              className={`manual-quick-chip ${Number(amount) === val ? "is-active" : ""}`}
                              onClick={() => setAmount(String(val))}
                            >
                              ฿{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* CHECKOUT & SUMMARY CARD (Shown for both Bill & Manual)     */}
            {/* ========================================================= */}
            {(bill || shopId) && (
              <form className="payment-checkout-card" onSubmit={pay}>
                <h2 className="payment-checkout-title">
                  <Ticket size={20} color="#2563eb" />
                  สรุปการชำระเงินและคำนวณส่วนลด
                </h2>

                {/* Coupon Selection */}
                <div className="checkout-coupon-field">
                  <label className="checkout-coupon-label" htmlFor="coupon-select">
                    <Ticket size={16} />
                    คูปองส่วนลดที่คุณมี
                  </label>
                  <select
                    id="coupon-select"
                    className="checkout-coupon-select"
                    value={couponId}
                    onChange={(e) => setCouponId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">ไม่ใช้คูปองส่วนลด</option>
                    {coupons.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.title} · ลด ฿{c.paymentDiscount.amount} (ยอดขั้นต่ำ ฿{money(c.paymentDiscount.minimumAmount)})
                      </option>
                    ))}
                  </select>

                  {coupons.length === 0 && (
                    <small style={{ color: "#64748b", marginTop: 4, display: "block" }}>
                      คุณยังไม่มีคูปองส่วนลด <Link to="/rewards" style={{ color: "#2563eb" }}>แลกคูปองที่นี่</Link>
                    </small>
                  )}
                  {couponInvalid && (
                    <small style={{ color: "#dc2626", marginTop: 4, display: "block" }}>
                      {selectedCoupon
                        ? `คูปองนี้ต้องมียอดซื้อขั้นต่ำ ${selectedCoupon.paymentDiscount.minimumAmount} บาทขึ้นไป`
                        : "คูปองไม่สามารถใช้งานได้"}
                    </small>
                  )}
                </div>

                {/* Co-Pay Calculation Breakdown */}
                <div className="checkout-breakdown">
                  <div className="checkout-row">
                    <span>ร้านค้า</span>
                    <strong>{selected?.shopName || "-"}</strong>
                  </div>
                  <div className="checkout-row">
                    <span>ยอดสินค้าตามบิล</span>
                    <span>฿{money(total)}</span>
                  </div>

                  {selectedCoupon && !couponInvalid && (
                    <div className="checkout-row discount-row">
                      <span>ส่วนลดจากคูปอง</span>
                      <span>- ฿{money(discountAmount)}</span>
                    </div>
                  )}

                  <div className="checkout-row">
                    <span>ยอดหลังหักคูปอง</span>
                    <span>฿{money(netAmount)}</span>
                  </div>

                  <div className="checkout-row subsidy-row">
                    <span>
                      ภาครัฐร่วมจ่าย 60%
                      <small style={{ display: "block", fontSize: 11, fontWeight: 400, color: "#059669" }}>
                        (โควตารัฐช่วยวันนี้คงเหลือ ฿{money(remainingDailySubsidy)})
                      </small>
                    </span>
                    <span>- ฿{money(subsidy)}</span>
                  </div>

                  <div className="checkout-row net-row">
                    <span>ยอดที่คุณต้องจ่าย (เงินทดลอง)</span>
                    <span className="checkout-net-amount">฿{money(payment)}</span>
                  </div>
                </div>

                {/* Insufficient balance warning */}
                {payment > balance && (
                  <div className="checkout-wallet-alert">
                    <div className="checkout-wallet-alert-text">
                      <AlertCircle size={18} />
                      <span>เงินทดลองในกระเป๋าไม่พอ (ขาดอีก ฿{money(payment - balance)})</span>
                    </div>
                    <button
                      type="button"
                      className="payment-topup-btn"
                      onClick={topup}
                      disabled={busy}
                    >
                      <Plus size={14} />
                      เติม 500
                    </button>
                  </div>
                )}

                {/* Primary Pay Button */}
                <button
                  type="submit"
                  className="checkout-pay-btn"
                  disabled={
                    busy ||
                    !selected ||
                    total <= 0 ||
                    payment > balance ||
                    couponInvalid
                  }
                >
                  {busy ? (
                    "กำลังบันทึกธุรกรรม…"
                  ) : payment > balance ? (
                    "ยอดเงินไม่เพียงพอ (กรุณากดเติมเงินก่อน)"
                  ) : (
                    `ยืนยันชำระเงิน ฿${money(payment)}`
                  )}
                </button>

                <p className="checkout-disclaimer">
                  ระบบจำลองการชำระเงินเพื่อตรวจสอบภารกิจบิงโกและสิทธิประโยชน์โครงการ
                </p>
              </form>
            )}
          </>
        )}

        {/* Transaction History Accordion */}
        {history.length > 0 && !receipt && (
          <details className="payment-history-details">
            <summary>
              ประวัติการใช้จ่ายของคุณ ({history.length} รายการล่าสุด)
            </summary>
            {history.slice(0, 10).map((t) => (
              <div className="payment-history-row" key={t.transactionId}>
                <div>
                  <strong>{t.shopName}</strong>
                  <small>
                    {new Date(t.paidAt).toLocaleString("th-TH", {
                      timeZone: "Asia/Bangkok",
                    })}
                  </small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="payment-history-amount">
                    ฿{money(t.totalAmount)}
                  </span>
                  <small style={{ display: "block", color: "#059669" }}>
                    รัฐช่วย ฿{money(t.governmentAmount)} · คุณจ่าย ฿{money(t.userAmount)}
                  </small>
                </div>
              </div>
            ))}
          </details>
        )}
      </main>
    </div>
  );
}
