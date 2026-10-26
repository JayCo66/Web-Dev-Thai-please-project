import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  CreditCard,
  Store,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  Utensils,
  Coffee,
  Receipt,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  Coins,
  Gift
} from 'lucide-react';

export default function Payment() {
  const { user, wallet, tokens, deductBalance, resetBalance } = useAuth();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected shop & amount
  const [selectedShop, setSelectedShop] = useState(null);
  const [amount, setAmount] = useState('100');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment execution state
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // User transaction history
  const [history, setHistory] = useState([]);

  // Fetch shops and history on mount
  useEffect(() => {
    fetchShops();
    fetchHistory();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/shops');
      if (res.data && res.data.success) {
        setShops(res.data.data);
        if (res.data.data.length > 0 && !selectedShop) {
          setSelectedShop(res.data.data[0]); // Default to first shop
        }
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
      setError('ไม่สามารถโหลดข้อมูลร้านค้าได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/transactions/my-history');
      if (res.data && res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching transaction history:', err);
    }
  };

  // Co-Payment 60/40 Calculation
  const totalAmountNum = parseFloat(amount) || 0;
  const maxDailyGovSubsidy = 150.00;
  const calculatedGovSubsidy = Math.min(maxDailyGovSubsidy, Math.round(totalAmountNum * 0.60 * 100) / 100);
  const calculatedUserPayment = Math.max(0, Math.round((totalAmountNum - calculatedGovSubsidy) * 100) / 100);

  const userBalance = parseFloat(wallet?.balance || '500.00');
  const remainingBalanceAfterPay = Math.max(0, userBalance - calculatedUserPayment);
  const isBalanceSufficient = userBalance >= calculatedUserPayment;

  // Handle Confirm Payment
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedShop) {
      setError('กรุณาเลือกร้านค้าที่ต้องการชำระเงิน');
      return;
    }

    if (totalAmountNum <= 0) {
      setError('กรุณากรอกยอดเงินราคาสินค้าให้ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }

    if (!isBalanceSufficient) {
      setError(`ยอดเงินในกระเป๋าของคุณไม่เพียงพอ (ต้องการ ฿${calculatedUserPayment.toFixed(2)}, คงเหลือ ฿${userBalance.toFixed(2)})`);
      return;
    }

    try {
      setPaying(true);

      const res = await api.post('/transactions/pay', {
        shopId: selectedShop.shopId,
        amount: totalAmountNum,
      });

      if (res.data && res.data.success) {
        // 1. Deduct simulated balance in AuthContext (deducts 40% citizen portion)
        const remaining = deductBalance(calculatedUserPayment);

        // 2. Set receipt state for display
        setReceipt({
          ...res.data.data,
          remainingBalance: remaining,
        });

        // 3. Refresh transactions history
        fetchHistory();
      } else {
        setError(res.data.error || 'การชำระเงินไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบชำระเงิน');
    } finally {
      setPaying(false);
    }
  };

  // Helper for shop icon
  const getShopIcon = (category) => {
    if (category.includes('อาหาร') || category.includes('เครื่องดื่ม')) {
      return <Utensils size={20} />;
    }
    if (category.includes('OTOP')) {
      return <ShoppingBag size={20} />;
    }
    return <Store size={20} />;
  };

  // Filtered shops by search
  const filteredShops = shops.filter((s) =>
    s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div className="header-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
              <ArrowLeft size={18} />
            </div>
            <div>
              <div className="header-title">ชำระเงินคนละครึ่ง (Co-Pay 60/40)</div>
              <div className="header-tag">Government Subsidy & Smart Checkout</div>
            </div>
          </Link>
        </div>

        <div className="header-user">
          {/* Link to ThaiPlus */}
          <Link
            to="/plus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 999,
              color: '#92400E',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Gift size={15} color="#D97706" />
            <span>ไทยช่วยไทยพลัส (ใช้ Token)</span>
          </Link>

          {/* Tokens Pill */}
          <Link
            to="/plus"
            className="token-pill"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            title="คลิกเพื่อไปหน้าใช้โทเค็น"
          >
            <Coins size={16} />
            <span>{tokens} Tokens</span>
          </Link>

          {/* Simulated Wallet Balance Pill */}
          <div className="balance-pill" title="ยอดเงินจำลองในกระเป๋าของคุณ">
            <Wallet size={16} />
            <span>ยอดคงเหลือ: ฿{userBalance.toFixed(2)}</span>
            <button
              type="button"
              className="btn-topup-mini"
              onClick={() => resetBalance(500)}
              title="รีเซ็ตหรือเติมเงินจำลองเป็น 500 บาท"
            >
              + เติม ฿500
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="home-container" style={{ marginTop: 24 }}>
        {/* Hero Banner */}
        <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #0284C7 100%)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 999, fontSize: 13, marginBottom: 12 }}>
            <Sparkles size={14} /> สิทธิประโยชน์คนละครึ่งพลีส 60/40
          </div>
          <h1 className="hero-title">
            ชำระเงินร้านค้า รัฐช่วยจ่าย 60% 💳
          </h1>
          <p className="hero-subtitle">
            เลือกร้านค้าที่ร่วมโครงการ ระบุราคาสินค้า ระบบจะคำนวณสิทธิรัฐร่วมจ่าย 60% (สูงสุด 150 บ./วัน) และประชาชนร่วมจ่ายเพียง 40% อัตโนมัติ
          </p>
        </div>

        {/* ========================================================
            VIEW 1: Receipt Screen (Shown when payment succeeded)
            ======================================================== */}
        {receipt ? (
          <div className="receipt-slip" style={{ marginBottom: 36 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#059669' }}>
              <CheckCircle2 size={40} />
            </div>

            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '4px 12px', borderRadius: 999 }}>
              ชำระเงินสำเร็จ (e-Slip)
            </span>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: '14px 0 4px' }}>
              {receipt.shopName}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              รหัสธุรกรรม: <strong>#TX-{String(receipt.transactionId).padStart(6, '0')}</strong>
            </p>

            {/* Price Breakdown Slip Box */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: varRadiusMd => '14px', padding: 18, textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>ราคาสินค้ารวม:</span>
                <strong>฿{Number(receipt.totalAmount).toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#1E40AF' }}>
                <span>รัฐร่วมจ่าย 60%:</span>
                <strong>-฿{Number(receipt.governmentAmount).toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px dashed #CBD5E1', fontSize: 17, color: '#065F46', fontWeight: 700 }}>
                <span>คุณจ่ายจริง (40%):</span>
                <span>฿{Number(receipt.userAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Wallet Remaining Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24, padding: '0 4px' }}>
              <span>ยอดเงินคงเหลือในกระเป๋า:</span>
              <strong style={{ color: 'var(--text-main)' }}>฿{Number(receipt.remainingBalance).toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, background: '#F1F5F9', color: 'var(--text-main)', boxShadow: 'none' }}
                onClick={() => setReceipt(null)}
              >
                ทำรายการใหม่
              </button>
              <Link
                to="/"
                className="btn-primary"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================
             VIEW 2: Payment Form (Select Shop & Enter Amount)
             ======================================================== */
          <div>
            {/* Step 1: Select Shop */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={20} color="var(--primary)" />
                  ขั้นตอนที่ 1: เลือกร้านค้าที่ต้องการชำระเงิน
                </h3>

                {/* Search Box */}
                <div style={{ position: 'relative', width: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 32, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
                    placeholder="ค้นหาร้านค้า..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div className="spinner" />
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>กำลังโหลดรายชื่อร้านค้า...</p>
                </div>
              ) : (
                <div className="shop-select-grid">
                  {filteredShops.map((s) => {
                    const isSelected = selectedShop?.shopId === s.shopId;
                    return (
                      <div
                        key={s.shopId}
                        className={`shop-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedShop(s)}
                      >
                        <div className="shop-icon-wrapper">
                          {getShopIcon(s.category)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div className="shop-info-name">{s.shopName}</div>
                          <span className="shop-info-cat">{s.category}</span>
                          <div className="shop-info-addr">{s.address || 'นครปฐม'}</div>
                        </div>

                        {isSelected && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Enter Amount & Co-Pay Breakdown */}
            {selectedShop && (
              <div className="copay-card">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={20} color="var(--primary)" />
                  ขั้นตอนที่ 2: ระบุราคาสินค้า และคำนวณสิทธิ 60/40
                </h3>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <AlertCircle size={18} />
                    <div>{error}</div>
                  </div>
                )}

                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                  {/* Selected Shop Banner */}
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ร้านค้าที่เลือก:</span>
                      <strong style={{ display: 'block', fontSize: 15, color: '#1E40AF' }}>{selectedShop.shopName}</strong>
                    </div>
                    <span className="shop-info-cat">{selectedShop.category}</span>
                  </div>

                  {/* Input Amount */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 15 }}>
                      ราคาสินค้ารวม (บาท) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', padding: '12px', height: 'auto', color: 'var(--primary)' }}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={1}
                      step={1}
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="donation-presets" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 20 }}>
                    {['50', '100', '150', '200', '250', '300'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`preset-btn ${amount === val ? 'active' : ''}`}
                        onClick={() => setAmount(val)}
                      >
                        ฿{val}
                      </button>
                    ))}
                  </div>

                  {/* Co-Pay 60/40 Live Breakdown Box */}
                  <div className="copay-breakdown-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
                      <ShieldCheck size={16} /> สิทธิประโยชน์คนละครึ่งพลีส (Co-Payment 60/40)
                    </div>

                    <div className="copay-row">
                      <span>ราคาสินค้าเต็ม:</span>
                      <strong>฿{totalAmountNum.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-gov">
                      <span>🏛️ รัฐช่วยจ่าย 60%:</span>
                      <strong>-฿{calculatedGovSubsidy.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-user">
                      <span>💳 คุณจ่ายเพียง (40%):</span>
                      <span>฿{calculatedUserPayment.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Balance Check Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 20, padding: '0 4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ยอดเงินในกระเป๋าคงเหลือหลังจ่าย:</span>
                    <strong style={{ color: isBalanceSufficient ? '#059669' : '#DC2626' }}>
                      ฿{remainingBalanceAfterPay.toFixed(2)} {!isBalanceSufficient && '(เงินไม่พอ)'}
                    </strong>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    className="btn-donate"
                    style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)', padding: '14px' }}
                    onClick={handleConfirmPayment}
                    disabled={paying || totalAmountNum <= 0 || !isBalanceSufficient}
                  >
                    {paying ? (
                      <>
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        <span>กำลังประมวลผลการชำระเงิน...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span>ยืนยันการชำระเงิน ฿{calculatedUserPayment.toFixed(2)} (ใช้สิทธิ 60/40)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 3: Transaction History List
            ======================================================== */}
        <div className="history-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="var(--primary)" />
              ประวัติการชำระเงินคนละครึ่งของคุณ ({history.length} รายการ)
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              บันทึกในตาราง transactions
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              ยังไม่มีประวัติการชำระเงิน เลือกร้านค้าด้านบนเพื่อเริ่มใช้สิทธิ 60/40 ได้เลยครับ 🛍️
            </div>
          ) : (
            <div>
              {history.map((tx) => (
                <div key={tx.transactionId} className="history-item">
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>{tx.shopName}</strong>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{new Date(tx.paidAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{tx.category || 'ร้านค้าทั่วไป'}</span>
                      <span>•</span>
                      <span style={{ color: '#1E40AF' }}>รัฐจ่าย ฿{Number(tx.governmentAmount).toFixed(2)} (60%)</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#065F46' }}>
                      จ่ายจริง ฿{Number(tx.userAmount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      ยอดเต็ม ฿{Number(tx.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
