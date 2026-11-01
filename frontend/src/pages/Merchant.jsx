import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Store,
  MapPin,
  Receipt,
  Banknote,
  QrCode,
  Users,
  Landmark,
  X,
  TrendingUp,
  BarChart3,
  Search,
  Eye,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import '../styles/merchant.css';

const money = (value) =>
  Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateText = (value) =>
  value
    ? new Date(value).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
      })
    : '-';

const QUICK_AMOUNTS = [50, 100, 150, 200, 300];

const BILL_STATUS = {
  PENDING: 'รอลูกค้าชำระ',
  PAID: 'ชำระแล้ว',
  CANCELLED: 'ยกเลิก',
  EXPIRED: 'หมดอายุ',
};

const STATUS = {
  PENDING: {
    icon: Clock,
    tone: 'pending',
    title: 'รอเจ้าหน้าที่ภาครัฐตรวจสอบ',
    text: 'ได้รับใบสมัครของร้านแล้ว ระหว่างนี้ร้านยังไม่ปรากฏในรายชื่อร้านที่ประชาชนจ่ายเงินได้ เมื่อมีผลการพิจารณาหน้านี้จะอัปเดต',
  },
  APPROVED: {
    icon: CheckCircle2,
    tone: 'approved',
    title: 'ร้านได้รับอนุมัติแล้ว',
    text: 'สร้างบิลให้ลูกค้าสแกนจ่ายได้ทันที',
  },
  REJECTED: {
    icon: XCircle,
    tone: 'rejected',
    title: 'ใบสมัครไม่ผ่านการอนุมัติ',
    text: 'ภาครัฐไม่อนุมัติร้านนี้ ดูเหตุผลด้านล่าง หากต้องการสมัครใหม่ให้ใช้เบอร์โทรอื่น',
  },
};

function Countdown({ expiresAt }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(
      () => setLeft(Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))),
      1000
    );
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <span>
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}

/* =========================================================
   SUBPAGE 1: CREATE BILL & QR (สร้างบิลรับเงิน)
   ========================================================= */
function BillPanel({ onPaid, onViewSales }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [bill, setBill] = useState(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function create(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/merchants/bills', {
        amount: Number(amount),
        note,
      });
      const created = data.data;
      setQr(
        await QRCode.toDataURL(
          `${window.location.origin}/payment?bill=${created.code}`,
          { width: 320, margin: 1 }
        )
      );
      setBill(created);
    } catch (err) {
      setError(err.response?.data?.error || 'สร้างบิลไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    setBill(null);
    setQr('');
    setAmount('');
    setNote('');
  };

  function copyCode(code) {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Ask every 3 seconds whether the customer has paid
  useEffect(() => {
    if (!bill || bill.status !== 'PENDING') return undefined;
    const timer = setInterval(async () => {
      try {
        const { data } = await api.get(`/merchants/bills/${bill.billId}`);
        setBill(data.data);
        if (data.data.status === 'PAID') onPaid();
      } catch {
        // Keep waiting; next poll will retry
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bill, onPaid]);

  async function cancel() {
    try {
      await api.post(`/merchants/bills/${bill.billId}/cancel`);
      reset();
      onPaid();
    } catch (err) {
      setError(err.response?.data?.error || 'ยกเลิกบิลไม่สำเร็จ');
    }
  }

  if (bill) {
    const done = bill.status !== 'PENDING';
    return (
      <section className="merchant-card merchant-bill" aria-live="polite">
        <h2>
          <QrCode size={20} color="#2563eb" />
          บิลสำหรับให้ลูกค้าสแกนจ่าย
        </h2>

        {bill.status === 'PAID' ? (
          <div className="merchant-bill-done merchant-bill-done--paid">
            <CheckCircle2 size={54} color="#059669" />
            <strong>ลูกค้าชำระเงินเรียบร้อยแล้ว!</strong>
            <p style={{ margin: 0, fontSize: 20, color: '#047857', fontWeight: 800 }}>
              ฿{money(bill.amount)}
            </p>
            <small style={{ color: '#065f46' }}>ยอดเงินเข้าสู่ระบบบัญชีร้านค้าแล้ว</small>
          </div>
        ) : done ? (
          <div className="merchant-bill-done">
            <XCircle size={48} color="#94a3b8" />
            <strong>บิลนี้ {BILL_STATUS[bill.status]}</strong>
          </div>
        ) : (
          <>
            <div className="merchant-qr-wrapper">
              <img
                src={qr}
                alt={`QR ชำระเงิน รหัส ${bill.code}`}
                className="merchant-qr"
              />
            </div>

            <p className="merchant-bill-amount">฿{money(bill.amount)}</p>

            <div className="merchant-code-box">
              <span>รหัสบิล:</span>
              <strong className="merchant-code">{bill.code}</strong>
              <button
                type="button"
                onClick={() => copyCode(bill.code)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#2563eb',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="คัดลอกรหัสบิล"
              >
                {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
              </button>
            </div>

            <p style={{ margin: '4px 0', fontSize: 14, color: '#475569' }}>
              {bill.note ? <span>รายการ: <strong>{bill.note}</strong> · </span> : ''}
              ให้ลูกค้าสแกน QR ด้วยกล้องมือถือ หรือกรอกรหัสบิล
            </p>

            <small style={{ color: '#0369a1', fontWeight: 600 }}>
              ⏳ บิลหมดอายุใน <Countdown expiresAt={bill.expiresAt} /> · กำลังรอการชำระเงินแบบเรียลไทม์…
            </small>
          </>
        )}

        {error && <p className="notice notice--error" role="alert">{error}</p>}

        <div className="merchant-actions">
          {!done && (
            <button
              type="button"
              className="button button--secondary"
              onClick={cancel}
            >
              <X size={16} />
              ยกเลิกบิลนี้
            </button>
          )}
          {done && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                reset();
                onPaid();
              }}
            >
              <QrCode size={16} />
              สร้างบิลใหม่ถัดไป
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="merchant-card">
      <div className="merchant-subpage-header">
        <div>
          <h2>
            <QrCode size={22} color="#2563eb" />
            สร้างบิลรับชำระเงิน
          </h2>
          <p>กำหนดจำนวนเงินและสร้าง QR Code ให้ลูกค้าสแกนจ่ายโครงการคนละครึ่ง</p>
        </div>
      </div>

      <form onSubmit={create} style={{ marginTop: 16 }}>
        <div className="form-field">
          <label className="field-label" htmlFor="merchant-bill-amount">
            ยอดที่ต้องการเก็บ (บาท) *
          </label>
          <div className="merchant-amount-input-box">
            <span className="merchant-currency-symbol">฿</span>
            <input
              id="merchant-bill-amount"
              type="number"
              inputMode="decimal"
              className="merchant-amount-input"
              min="0.01"
              max="100000"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={busy}
            />
            {amount && (
              <button
                type="button"
                className="merchant-clear-amount-btn"
                onClick={() => setAmount('')}
                title="ล้างยอดเงิน"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="merchant-quick-amounts-label">
          <span>💡 ยอดเงินด่วนยอดนิยม:</span>
        </div>
        <div className="merchant-quick-amounts" role="group" aria-label="เลือกยอดอย่างเร็ว">
          {[50, 100, 150, 200, 300, 500].map((val) => (
            <button
              type="button"
              key={val}
              className={`merchant-amount-chip${Number(amount) === val ? ' is-active' : ''}`}
              onClick={() => setAmount(String(val))}
            >
              ฿{val}
            </button>
          ))}
        </div>

        <label className="form-field" style={{ marginTop: 14 }}>
          <span className="field-label">รายการสินค้า / หมายเหตุ (ไม่บังคับ)</span>
          <input
            type="text"
            maxLength={200}
            placeholder="เช่น ข้าวกะเพราหมูกรอบ + ไข่ดาว 2 จาน"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />
        </label>

        {error && <p className="notice notice--error" role="alert">{error}</p>}

        <button
          className="button button--primary xp-full"
          style={{ height: 50, marginTop: 10, fontSize: 16, fontWeight: 700 }}
          disabled={busy || Number(amount) <= 0}
        >
          {busy
            ? 'กำลังสร้างบิล…'
            : Number(amount) > 0
              ? `สร้าง QR บิลรับเงิน ฿${money(Number(amount))}`
              : 'ใส่ยอดเงินที่ต้องการเรียกเก็บก่อน'}
        </button>
      </form>
    </section>
  );
}

/* =========================================================
   SUBPAGE 2: SALES & METRICS (หน้าสรุปยอดขายและรายได้)
   ========================================================= */
function SalesPage({ data, onRefresh }) {
  const peak = Math.max(1, ...data.days.map((d) => d.total));
  const weekday = (date) =>
    new Date(`${date}T00:00:00+07:00`).toLocaleDateString('th-TH', {
      weekday: 'short',
      timeZone: 'Asia/Bangkok',
    });

  const totalRevenue = data.total.sales || 0;
  const govShare = totalRevenue > 0 ? Math.round((data.total.fromGovernment / totalRevenue) * 100) : 60;
  const citizenShare = 100 - govShare;

  return (
    <div>
      <div className="merchant-subpage-header">
        <div>
          <h2>
            <BarChart3 size={22} color="#2563eb" />
            สรุปยอดขายและรายได้ร้านค้า
          </h2>
          <p>รายงานรายรับจากโครงการคนละครึ่งและการเติบโตของร้านค้า</p>
        </div>
        <button
          type="button"
          className="button button--secondary"
          style={{ padding: '6px 14px', fontSize: 13 }}
          onClick={onRefresh}
        >
          <RefreshCw size={14} /> อัปเดตสถิติ
        </button>
      </div>

      {/* 4 Key Stat Metric Boxes */}
      <div className="merchant-stats-grid" style={{ marginTop: 16 }}>
        <div className="merchant-stat-box">
          <div className="merchant-stat-box-icon green">
            <Banknote size={22} />
          </div>
          <div className="merchant-stat-box-content">
            <span>ยอดขายวันนี้</span>
            <strong>฿{money(data.today.sales)}</strong>
            <small>{data.today.count} รายการที่ชำระแล้ว</small>
          </div>
        </div>

        <div className="merchant-stat-box">
          <div className="merchant-stat-box-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="merchant-stat-box-content">
            <span>7 วันล่าสุด</span>
            <strong>฿{money(data.week.sales)}</strong>
            <small>{data.week.count} รายการสะสม</small>
          </div>
        </div>

        <div className="merchant-stat-box">
          <div className="merchant-stat-box-icon amber">
            <Users size={22} />
          </div>
          <div className="merchant-stat-box-content">
            <span>ลูกค้าทั้งหมด</span>
            <strong>{data.total.customers} คน</strong>
            <small>{data.total.count} ธุรกรรมสำเร็จ</small>
          </div>
        </div>

        <div className="merchant-stat-box">
          <div className="merchant-stat-box-icon purple">
            <Landmark size={22} />
          </div>
          <div className="merchant-stat-box-content">
            <span>รัฐร่วมจ่ายสะสม (60%)</span>
            <strong>฿{money(data.total.fromGovernment)}</strong>
            <small>ลูกค้าจ่ายเอง ฿{money(data.total.fromCitizens)}</small>
          </div>
        </div>
      </div>

      {/* Co-Pay Breakdown Card */}
      <div className="merchant-copay-card">
        <h3>
          <Sparkles size={16} />
          สัดส่วนรายรับโครงการคนละครึ่ง
        </h3>
        <p>
          ร้านค้าได้รับเงินเต็มจำนวน 100% โดยแบ่งเป็นเงินสนับสนุนจากภาครัฐ 60% และประชาชนร่วมจ่าย 40%
        </p>
        <div className="merchant-copay-bar">
          <div
            className="merchant-copay-fill-gov"
            style={{ width: `${govShare}%` }}
            title={`ภาครัฐร่วมจ่าย ${govShare}%`}
          />
          <div
            className="merchant-copay-fill-citizen"
            style={{ width: `${citizenShare}%` }}
            title={`ประชาชนจ่าย ${citizenShare}%`}
          />
        </div>
        <div className="merchant-copay-legend">
          <span style={{ color: '#059669' }}>
            ● รัฐช่วยจ่าย 60%: ฿{money(data.total.fromGovernment)} ({govShare}%)
          </span>
          <span style={{ color: '#2563eb' }}>
            ● ประชาชนจ่าย 40%: ฿{money(data.total.fromCitizens)} ({citizenShare}%)
          </span>
        </div>
      </div>

      {/* 7-Day Sales Trend Bar Chart */}
      <section className="merchant-card merchant-chart-card">
        <h2>
          <BarChart3 size={18} />
          แนวโน้มยอดขาย 7 วันล่าสุด (บาท)
        </h2>
        <div className="merchant-chart" role="img" aria-label="กราฟแท่งยอดขายรายวัน">
          {data.days.map((d, idx) => (
            <div
              key={d.date}
              className={`merchant-bar ${idx === 6 ? 'is-today' : ''}`}
            >
              <span className="merchant-bar-value">
                {d.total > 0 ? `฿${Math.round(d.total).toLocaleString('th-TH')}` : '-'}
              </span>
              <div
                style={{
                  height: `${Math.max(d.total > 0 ? 8 : 3, (d.total / peak) * 100)}%`,
                }}
              />
              <small>{idx === 6 ? 'วันนี้' : weekday(d.date)}</small>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Transactions List */}
      {data.recent && data.recent.length > 0 && (
        <section className="merchant-card">
          <h2>
            <Receipt size={18} />
            ธุรกรรมชำระเงินสำเร็จล่าสุด
          </h2>
          <ul className="merchant-list">
            {data.recent.map((tx) => (
              <li key={tx.transactionId}>
                <span>
                  <strong>฿{money(tx.amount)}</strong>
                  <small>รหัสธุรกรรม #{tx.transactionId} · {dateText(tx.paidAt)}</small>
                </span>
                <span className="merchant-pill merchant-pill--paid">
                  ✓ ชำระแล้ว
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   SUBPAGE 3: BILLS MANAGEMENT (หน้ารายการบิลทั้งหมด)
   ========================================================= */
function BillsPage({ bills, onRefresh, onBillSelect }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [qrModal, setQrModal] = useState(null); // { code, amount, note, qrUrl }

  const filtered = bills.filter((b) => {
    const matchesSearch =
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      (b.note || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function showBillQR(b) {
    const qrUrl = await QRCode.toDataURL(
      `${window.location.origin}/payment?bill=${b.code}`,
      { width: 300, margin: 1 }
    );
    setQrModal({ ...b, qrUrl });
  }

  return (
    <div>
      <div className="merchant-subpage-header">
        <div>
          <h2>
            <Receipt size={22} color="#2563eb" />
            รายการบิลรับชำระเงิน
          </h2>
          <p>ตรวจสอบสถานะบิลทั้งหมด ค้นหา และเปิด QR Code ให้ลูกค้าสแกนซ้ำได้</p>
        </div>
        <button
          type="button"
          className="button button--secondary"
          style={{ padding: '6px 14px', fontSize: 13 }}
          onClick={onRefresh}
        >
          <RefreshCw size={14} /> รีเฟรชรายการ
        </button>
      </div>

      {/* Toolbar: Search & Status Filters */}
      <div className="merchant-bills-toolbar" style={{ marginTop: 16 }}>
        <div className="merchant-bills-search">
          <Search size={16} className="merchant-bills-search-icon" />
          <input
            placeholder="ค้นหารหัสบิล เช่น 63A4EBFE หรือข้อความ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="merchant-status-filters">
          <button
            type="button"
            className={`merchant-filter-btn ${statusFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            ทั้งหมด ({bills.length})
          </button>
          <button
            type="button"
            className={`merchant-filter-btn ${statusFilter === 'PAID' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('PAID')}
          >
            ชำระแล้ว ({bills.filter((b) => b.status === 'PAID').length})
          </button>
          <button
            type="button"
            className={`merchant-filter-btn ${statusFilter === 'PENDING' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            รอชำระ ({bills.filter((b) => b.status === 'PENDING').length})
          </button>
          <button
            type="button"
            className={`merchant-filter-btn ${statusFilter === 'CANCELLED' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('CANCELLED')}
          >
            ยกเลิก/หมดอายุ
          </button>
        </div>
      </div>

      {/* Bills Cards List */}
      {filtered.length === 0 ? (
        <div className="merchant-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <Receipt size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>ไม่พบบิลที่ตรงกับเงื่อนไข</p>
          <small>ลองเปลี่ยนคำค้นหา หรือสร้างบิลใหม่ในแท็บ &quot;สร้างบิลรับเงิน&quot;</small>
        </div>
      ) : (
        <div className="merchant-bills-list">
          {filtered.map((b) => (
            <div className="merchant-bill-item-card" key={b.billId}>
              <div className="bill-item-info">
                <div className="bill-item-header">
                  <span className="bill-item-code">#{b.code}</span>
                  <span className={`merchant-pill merchant-pill--${b.status.toLowerCase()}`}>
                    {BILL_STATUS[b.status]}
                  </span>
                </div>

                {b.note && <div className="bill-item-note">รายการ: {b.note}</div>}

                <div className="bill-item-meta">
                  <span>สร้างเมื่อ: {dateText(b.createdAt)}</span>
                  {b.expiresAt && b.status === 'PENDING' && (
                    <span style={{ color: '#d97706' }}>
                      · หมดอายุ: {dateText(b.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bill-item-amount-side">
                <span className="bill-item-amount">฿{money(b.amount)}</span>

                <div className="bill-item-actions">
                  {b.status === 'PENDING' && (
                    <button
                      type="button"
                      className="bill-item-btn"
                      onClick={() => showBillQR(b)}
                    >
                      <Eye size={13} /> ดู QR บิล
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Preview Modal for Pending Bills */}
      {qrModal && (
        <div className="merchant-modal-overlay" onClick={() => setQrModal(null)}>
          <div className="merchant-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
              QR Code ชำระเงินบิล #{qrModal.code}
            </h3>
            <img
              src={qrModal.qrUrl}
              alt={`QR รหัส ${qrModal.code}`}
              style={{ width: 240, height: 240, borderRadius: 12, border: '1px solid #e2e8f0' }}
            />
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1e3a8a' }}>
              ฿{money(qrModal.amount)}
            </p>
            {qrModal.note && (
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                รายการ: {qrModal.note}
              </p>
            )}
            <small style={{ color: '#64748b' }}>
              ให้ลูกค้าเปิดกล้องมือถือสแกนเพื่อเข้าสู่หน้าชำระเงินคนละครึ่ง
            </small>
            <button
              type="button"
              className="button button--secondary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => setQrModal(null)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUBPAGE 4: SHOP PROFILE (ข้อมูลร้านค้า)
   ========================================================= */
function ShopProfile({ shop, state }) {
  return (
    <section className="merchant-card">
      <div className="merchant-subpage-header">
        <div>
          <h2>
            <Store size={22} color="#2563eb" />
            ข้อมูลร้านค้าที่ลงทะเบียน
          </h2>
          <p>รายละเอียดข้อมูลร้านและสถานะการรับรองในโครงการคนละครึ่ง</p>
        </div>
      </div>

      <dl style={{ marginTop: 20 }}>
        <div>
          <dt>ชื่อร้านค้า</dt>
          <dd>{shop.shopName}</dd>
        </div>
        <div>
          <dt>หมวดหมู่สินค้า</dt>
          <dd>{shop.category}</dd>
        </div>
        <div>
          <dt>
            <MapPin size={14} />
            ที่ตั้ง / ที่อยู่
          </dt>
          <dd>{shop.address || '-'}</dd>
        </div>
        <div>
          <dt>สถานะโครงการ</dt>
          <dd>
            <span className="merchant-pill merchant-pill--paid">
              ✓ {state?.title || 'ได้รับการอนุมัติแล้ว'}
            </span>
          </dd>
        </div>
        <div>
          <dt>วันที่ลงทะเบียน</dt>
          <dd>{dateText(shop.registeredAt)}</dd>
        </div>
      </dl>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          fontSize: 13,
          color: '#475569',
          lineHeight: 1.6,
        }}
      >
        <strong>💡 ข้อแนะนำสำหรับร้านค้าคนละครึ่ง:</strong>
        <br />
        • ลูกค้าสามารถสแกน QR Code จากหน้าร้าน หรือพิมพ์รหัสบิล 8-10 หลักในหน้าชำระเงินของลูกค้า
        <br />
        • โครงการร่วมจ่าย 60% สูงสุด 150 บาทต่อวันต่อลูกค้าหนึ่งคน
        <br />
        • ระบบจะสรุปและโอนเงินเข้าบัญชีตามรอบการชำระเงินของโครงการ
      </div>
    </section>
  );
}

/* =========================================================
   MAIN MERCHANT PAGE COMPONENT
   ========================================================= */
export default function Merchant() {
  const [shop, setShop] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active subpage tab: 'BILL' | 'SALES' | 'BILLS' | 'PROFILE'
  const [tab, setTab] = useState('BILL');

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/merchants/dashboard');
      setDashboard(res.data.data);
    } catch {
      // The dashboard is secondary; the shop card above still works.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/merchants/me');
      setShop(res.data.data);
      if (res.data.data.status === 'APPROVED') await loadDashboard();
    } catch (e) {
      setError(e.response?.data?.error || 'โหลดข้อมูลร้านค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    load();
  }, [load]);

  // A pending shop checks again by itself so the owner sees the decision without reloading.
  useEffect(() => {
    if (shop?.status !== 'PENDING') return undefined;
    const timer = setInterval(() => {
      api
        .get('/merchants/me')
        .then((res) => {
          setShop(res.data.data);
          if (res.data.data.status === 'APPROVED') loadDashboard();
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [shop?.status, loadDashboard]);

  const state = shop ? STATUS[shop.status] : null;
  const StatusIcon = state?.icon;

  const totalBillsCount = dashboard?.bills?.length || 0;
  const pendingBillsCount = dashboard?.bills?.filter((b) => b.status === 'PENDING').length || 0;

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main merchant-page">
        {/* Main Header */}
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ระบบร้านค้าชุมชนคนละครึ่ง</span>
            <h1>{shop?.shopName || 'ร้านค้าของฉัน'}</h1>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={17} />
            รีเฟรช
          </button>
        </div>

        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {loading && !shop && <p>กำลังโหลดข้อมูลร้านค้า...</p>}

        {shop && (
          <>
            {/* Non-Approved Status Notice */}
            {shop.status !== 'APPROVED' && (
              <section
                className={`merchant-status merchant-status--${state.tone}`}
                aria-live="polite"
              >
                <StatusIcon size={34} aria-hidden="true" />
                <div>
                  <h2>{state.title}</h2>
                  <p>{state.text}</p>
                  {shop.reviewNote && (
                    <p className="merchant-note">
                      <strong>หมายเหตุจากภาครัฐ:</strong> {shop.reviewNote}
                    </p>
                  )}
                  {shop.reviewedAt && (
                    <small>พิจารณาเมื่อ {dateText(shop.reviewedAt)}</small>
                  )}
                </div>
              </section>
            )}

            {/* Approved Merchant: Subpage Tabs Navigation */}
            {shop.status === 'APPROVED' && (
              <>
                <div className="merchant-nav-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'BILL'}
                    className={`merchant-tab-btn ${tab === 'BILL' ? 'is-active' : ''}`}
                    onClick={() => setTab('BILL')}
                  >
                    <QrCode size={16} />
                    สร้างบิลรับเงิน
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'SALES'}
                    className={`merchant-tab-btn ${tab === 'SALES' ? 'is-active' : ''}`}
                    onClick={() => setTab('SALES')}
                  >
                    <TrendingUp size={16} />
                    สรุปยอดขายและรายได้
                    {dashboard?.today?.sales > 0 && (
                      <span className="merchant-tab-badge">
                        วันนี้ ฿{money(dashboard.today.sales)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'BILLS'}
                    className={`merchant-tab-btn ${tab === 'BILLS' ? 'is-active' : ''}`}
                    onClick={() => setTab('BILLS')}
                  >
                    <Receipt size={16} />
                    รายการบิล
                    <span className="merchant-tab-badge">
                      {pendingBillsCount > 0
                        ? `รอชำระ ${pendingBillsCount}`
                        : totalBillsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'PROFILE'}
                    className={`merchant-tab-btn ${tab === 'PROFILE' ? 'is-active' : ''}`}
                    onClick={() => setTab('PROFILE')}
                  >
                    <Store size={16} />
                    ข้อมูลร้านค้า
                  </button>
                </div>

                {/* Subpage Contents */}
                {tab === 'BILL' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <BillPanel
                      onPaid={loadDashboard}
                      onViewSales={() => setTab('SALES')}
                    />

                    {dashboard && (
                      <div className="merchant-quick-stats-strip">
                        <span>
                          ยอดขายวันนี้: <strong>฿{money(dashboard.today.sales)}</strong> ({dashboard.today.count} รายการ) · รัฐร่วมจ่ายสะสม: <strong>฿{money(dashboard.total.fromGovernment)}</strong>
                        </span>
                        <button type="button" onClick={() => setTab('SALES')}>
                          ดูรายงานยอดขายฉบับเต็ม →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'SALES' && (
                  dashboard ? (
                    <SalesPage data={dashboard} onRefresh={loadDashboard} />
                  ) : (
                    <div className="empty-state">กำลังโหลดข้อมูลสรุปยอดขาย…</div>
                  )
                )}

                {tab === 'BILLS' && (
                  dashboard ? (
                    <BillsPage
                      bills={dashboard.bills || []}
                      onRefresh={loadDashboard}
                      onBillSelect={() => setTab('BILL')}
                    />
                  ) : (
                    <div className="empty-state">กำลังโหลดรายการบิล…</div>
                  )
                )}

                {tab === 'PROFILE' && (
                  <ShopProfile shop={shop} state={state} />
                )}
              </>
            )}

            {/* Non-Approved Shop Info */}
            {shop.status !== 'APPROVED' && (
              <ShopProfile shop={shop} state={state} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
