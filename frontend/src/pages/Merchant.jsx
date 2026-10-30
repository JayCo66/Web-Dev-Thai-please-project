import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Clock, CheckCircle2, XCircle, RefreshCw, Store, MapPin, Receipt, Banknote, QrCode, Users, Landmark, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import '../styles/merchant.css';

const money = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value) => (value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }) : '-');
const QUICK_AMOUNTS = [50, 100, 150, 200, 300];
const BILL_STATUS = { PENDING: 'รอลูกค้าชำระ', PAID: 'ชำระแล้ว', CANCELLED: 'ยกเลิก', EXPIRED: 'หมดอายุ' };

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
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return <span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>;
}

/** Create a bill, show its QR, and watch until the customer pays. */
function BillPanel({ onPaid }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [bill, setBill] = useState(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/merchants/bills', { amount: Number(amount), note });
      const created = data.data;
      // The QR carries a link, so a phone's own camera app can open the payment page too.
      setQr(await QRCode.toDataURL(`${window.location.origin}/payment?bill=${created.code}`, { width: 320, margin: 1 }));
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

  // Ask every 3 seconds whether the customer has paid.
  useEffect(() => {
    if (!bill || bill.status !== 'PENDING') return undefined;
    const timer = setInterval(async () => {
      try {
        const { data } = await api.get(`/merchants/bills/${bill.billId}`);
        setBill(data.data);
        if (data.data.status === 'PAID') onPaid();
      } catch {
        // Keep waiting; the next poll will try again.
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
        <h2><QrCode size={20} />บิลสำหรับลูกค้า</h2>
        {bill.status === 'PAID' ? (
          <div className="merchant-bill-done merchant-bill-done--paid"><CheckCircle2 size={44} /><strong>ลูกค้าชำระแล้ว ฿{money(bill.amount)}</strong></div>
        ) : done ? (
          <div className="merchant-bill-done"><XCircle size={44} /><strong>บิลนี้{BILL_STATUS[bill.status]}</strong></div>
        ) : (
          <>
            <img src={qr} alt={`QR ชำระเงิน รหัส ${bill.code}`} className="merchant-qr" />
            <p className="merchant-bill-amount">฿{money(bill.amount)}</p>
            <p>ให้ลูกค้าสแกน QR นี้ หรือกรอกรหัส <strong className="merchant-code">{bill.code}</strong></p>
            <small>บิลหมดอายุใน <Countdown expiresAt={bill.expiresAt} /> · กำลังรอการชำระ…</small>
          </>
        )}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <div className="merchant-actions">
          {!done && <button type="button" className="button button--secondary" onClick={cancel}><X size={16} />ยกเลิกบิล</button>}
          {done && <button type="button" className="button button--primary" onClick={() => { reset(); onPaid(); }}>สร้างบิลใหม่</button>}
        </div>
      </section>
    );
  }

  return (
    <section className="merchant-card">
      <h2><QrCode size={20} />สร้างบิลรับชำระเงิน</h2>
      <form onSubmit={create}>
        <label className="form-field">
          <span className="field-label">ยอดที่ต้องการเก็บ (บาท)</span>
          <input type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={busy} />
        </label>
        <div className="xp-quick-amounts" role="group" aria-label="เลือกยอดอย่างเร็ว">
          {QUICK_AMOUNTS.map((value) => (
            <button type="button" key={value} className={`xp-chip${Number(amount) === value ? ' is-active' : ''}`} onClick={() => setAmount(String(value))}>฿{value}</button>
          ))}
        </div>
        <label className="form-field">
          <span className="field-label">รายการ (ไม่บังคับ)</span>
          <input type="text" maxLength={200} placeholder="เช่น ข้าวผัด 2 จาน" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
        </label>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <button className="button button--primary xp-full" disabled={busy || Number(amount) <= 0}>
          {busy ? 'กำลังสร้างบิล…' : Number(amount) > 0 ? `สร้างบิล ฿${money(Number(amount))}` : 'ใส่ยอดก่อน'}
        </button>
      </form>
    </section>
  );
}

function Dashboard({ data }) {
  const peak = Math.max(1, ...data.days.map((d) => d.total));
  const weekday = (date) => new Date(`${date}T00:00:00+07:00`).toLocaleDateString('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' });
  return (
    <>
      <section className="merchant-stats" aria-label="สรุปยอดขาย">
        <div><Banknote size={22} /><span>ยอดขายวันนี้</span><strong>฿{money(data.today.sales)}</strong><small>{data.today.count} รายการ</small></div>
        <div><Receipt size={22} /><span>7 วันล่าสุด</span><strong>฿{money(data.week.sales)}</strong><small>{data.week.count} รายการ</small></div>
        <div><Users size={22} /><span>ลูกค้าทั้งหมด</span><strong>{data.total.customers} คน</strong><small>{data.total.count} รายการสะสม</small></div>
        <div><Landmark size={22} /><span>รัฐร่วมจ่ายสะสม</span><strong>฿{money(data.total.fromGovernment)}</strong><small>ลูกค้าจ่ายเอง ฿{money(data.total.fromCitizens)}</small></div>
      </section>

      <section className="merchant-card">
        <h2>ยอดขาย 7 วันล่าสุด</h2>
        <div className="merchant-chart" role="img" aria-label="กราฟแท่งยอดขายรายวัน">
          {data.days.map((d) => (
            <div key={d.date} className="merchant-bar">
              <span className="merchant-bar-value">{d.total > 0 ? Math.round(d.total).toLocaleString('th-TH') : ''}</span>
              <div style={{ height: `${Math.max(d.total > 0 ? 6 : 2, (d.total / peak) * 100)}%` }} />
              <small>{weekday(d.date)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="merchant-card">
        <h2>บิลล่าสุด</h2>
        {data.bills.length === 0 ? <p className="text-muted">ยังไม่เคยสร้างบิล</p> : (
          <ul className="merchant-list">
            {data.bills.map((b) => (
              <li key={b.billId}>
                <span><strong>฿{money(b.amount)}</strong><small>{b.note || `รหัส ${b.code}`} · {dateText(b.createdAt)}</small></span>
                <span className={`merchant-pill merchant-pill--${b.status.toLowerCase()}`}>{BILL_STATUS[b.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Merchant() {
  const [shop, setShop] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => { load(); }, [load]);

  // A pending shop checks again by itself so the owner sees the decision without reloading.
  useEffect(() => {
    if (shop?.status !== 'PENDING') return undefined;
    const timer = setInterval(() => {
      api.get('/merchants/me').then((res) => {
        setShop(res.data.data);
        if (res.data.data.status === 'APPROVED') loadDashboard();
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [shop?.status, loadDashboard]);

  const state = shop ? STATUS[shop.status] : null;
  const StatusIcon = state?.icon;

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main merchant-page">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ร้านค้าชุมชน</span>
            <h1>{shop?.shopName || 'ร้านของฉัน'}</h1>
          </div>
          <button type="button" className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} />รีเฟรช
          </button>
        </div>

        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {loading && !shop && <p>กำลังโหลดข้อมูลร้านค้า...</p>}

        {shop && (
          <>
            {shop.status !== 'APPROVED' && (
              <section className={`merchant-status merchant-status--${state.tone}`} aria-live="polite">
                <StatusIcon size={34} aria-hidden="true" />
                <div>
                  <h2>{state.title}</h2>
                  <p>{state.text}</p>
                  {shop.reviewNote && <p className="merchant-note"><strong>หมายเหตุจากภาครัฐ:</strong> {shop.reviewNote}</p>}
                  {shop.reviewedAt && <small>พิจารณาเมื่อ {dateText(shop.reviewedAt)}</small>}
                </div>
              </section>
            )}

            {shop.status === 'APPROVED' && (
              <>
                <BillPanel onPaid={loadDashboard} />
                {dashboard && <Dashboard data={dashboard} />}
              </>
            )}

            <section className="merchant-card">
              <h2><Store size={20} />ข้อมูลร้านที่ลงทะเบียน</h2>
              <dl>
                <div><dt>ชื่อร้าน</dt><dd>{shop.shopName}</dd></div>
                <div><dt>หมวดหมู่</dt><dd>{shop.category}</dd></div>
                <div><dt><MapPin size={14} />ที่อยู่</dt><dd>{shop.address || '-'}</dd></div>
                <div><dt>สถานะ</dt><dd>{state.title}</dd></div>
                <div><dt>สมัครเมื่อ</dt><dd>{dateText(shop.registeredAt)}</dd></div>
              </dl>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
