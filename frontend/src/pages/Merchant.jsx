import { useCallback, useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, RefreshCw, Store, MapPin, Receipt, Banknote } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import '../styles/merchant.css';

const money = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value) => (value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

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
    text: 'ร้านของคุณอยู่ในรายชื่อร้านค้าที่ประชาชนเลือกชำระเงินคนละครึ่งได้แล้ว',
  },
  REJECTED: {
    icon: XCircle,
    tone: 'rejected',
    title: 'ใบสมัครไม่ผ่านการอนุมัติ',
    text: 'ภาครัฐไม่อนุมัติร้านนี้ ดูเหตุผลด้านล่าง หากต้องการสมัครใหม่ให้ใช้เบอร์โทรอื่น',
  },
};

export default function Merchant() {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/merchants/me');
      setShop(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || 'โหลดข้อมูลร้านค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A pending shop checks again by itself so the owner sees the decision without reloading.
  useEffect(() => {
    if (shop?.status !== 'PENDING') return undefined;
    const timer = setInterval(() => {
      api.get('/merchants/me').then((res) => setShop(res.data.data)).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [shop?.status]);

  const state = shop ? STATUS[shop.status] : null;
  const StatusIcon = state?.icon;

  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main merchant-page">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ร้านค้าชุมชน</span>
            <h1>ร้านของฉัน</h1>
          </div>
          <button type="button" className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} />ตรวจสอบสถานะ
          </button>
        </div>

        {error && <p className="notice notice--error" role="alert">{error}</p>}
        {loading && !shop && <p>กำลังโหลดข้อมูลร้านค้า...</p>}

        {shop && (
          <>
            <section className={`merchant-status merchant-status--${state.tone}`} aria-live="polite">
              <StatusIcon size={34} aria-hidden="true" />
              <div>
                <h2>{state.title}</h2>
                <p>{state.text}</p>
                {shop.reviewNote && <p className="merchant-note"><strong>หมายเหตุจากภาครัฐ:</strong> {shop.reviewNote}</p>}
                {shop.reviewedAt && <small>พิจารณาเมื่อ {dateText(shop.reviewedAt)}</small>}
              </div>
            </section>

            <section className="merchant-card">
              <h2><Store size={20} />ข้อมูลร้านที่ลงทะเบียน</h2>
              <dl>
                <div><dt>ชื่อร้าน</dt><dd>{shop.shopName}</dd></div>
                <div><dt>หมวดหมู่</dt><dd>{shop.category}</dd></div>
                <div><dt><MapPin size={14} />ที่อยู่</dt><dd>{shop.address || '-'}</dd></div>
                <div><dt>สมัครเมื่อ</dt><dd>{dateText(shop.registeredAt)}</dd></div>
              </dl>
            </section>

            {shop.status === 'APPROVED' && (
              <section className="merchant-stats">
                <div><Receipt size={22} /><span>รายการขายทั้งหมด</span><strong>{shop.transactionCount} รายการ</strong></div>
                <div><Banknote size={22} /><span>ยอดขายรวม</span><strong>฿{money(shop.totalSales)}</strong></div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
