import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  CreditCard,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingBag,
  Utensils,
  Search,
  ShieldCheck,
  Check,
  Coins,
  Gift,
  Grid,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Wallet,
  PlusCircle,
  Info
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
          setSelectedShop(res.data.data[0]);
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
    if (e) e.preventDefault();
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
        const remaining = deductBalance(calculatedUserPayment);

        setReceipt({
          ...res.data.data,
          remainingBalance: remaining,
        });

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

  const getShopIcon = (category) => {
    if (category.includes('อาหาร') || category.includes('เครื่องดื่ม')) {
      return <Utensils size={20} />;
    }
    if (category.includes('OTOP')) {
      return <ShoppingBag size={20} />;
    }
    return <Store size={20} />;
  };

  const filteredShops = shops.filter((s) =>
    s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Unified Official Banking Header and Fixed Mobile Bottom Navigation */}
      <Navbar />

      {/* Main Payment Shell */}
      <main className="home-container" id="main-payment-content">
        {/* Banner Section */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0A192F 0%, #152E58 50%, #1E3A8A 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '22px 20px',
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(10, 25, 47, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
          }}
          aria-label="หัวข้อการชำระเงินคนละครึ่ง"
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.14)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 10,
              color: '#93C5FD'
            }}
          >
            <ShieldCheck size={14} color="#93C5FD" />
            <span>สิทธิประโยชน์คนละครึ่ง (Co-Pay 60/40)</span>
          </div>

          <h1 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            ชำระเงินที่ร้านค้าชุมชน
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, margin: 0, maxWidth: 640, color: '#E2E8F0' }}>
            รัฐบาลร่วมจ่าย 60% สูงสุด 150 บาทต่อวัน ประชาชนจ่ายเองเพียง 40% ผ่านยอดเงินจำลองในกระเป๋าของคุณ
          </p>

          {/* Balance & Topup Quick Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.16)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={17} color="#93C5FD" />
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>ยอดเงินในกระเป๋า:</span>
              <strong style={{ fontSize: 16, color: '#FFFFFF' }}>฿{userBalance.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="btn-wallet-topup"
              onClick={() => resetBalance(500)}
              style={{ minHeight: 38, padding: '6px 14px', fontSize: 12.5 }}
              title="เติมเงินจำลอง 500 บาทสำหรับการทดสอบระบบ"
              aria-label="เติมเงินจำลอง 500 บาท"
            >
              <PlusCircle size={15} />
              <span>เติมเงิน ฿500 (ทดลอง)</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            VIEW 1: Official Banking e-Slip (Shown when payment succeeded)
            ======================================================== */}
        {receipt ? (
          <div className="eslip-container" role="status" aria-label="ใบเสร็จการชำระเงิน">
            <div className="eslip-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle2 size={24} color="var(--fin-success)" />
                <span className="eslip-title">ใบเสร็จรับเงินอิเล็กทรอนิกส์ (e-Slip)</span>
              </div>
              <div className="eslip-subtitle">โครงการคนละครึ่งพลีส • สิทธิประโยชน์ภาครัฐ</div>
              <div className="eslip-status-badge">
                <Check size={13} />
                <span>ชำระเงินสำเร็จเรียบร้อย</span>
              </div>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">รหัสอ้างอิงธุรกรรม</span>
              <span className="eslip-data-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                TX-{String(receipt.transactionId).padStart(6, '0')}
              </span>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">ร้านค้าผู้รับเงิน</span>
              <span className="eslip-data-value" style={{ fontWeight: 700 }}>{receipt.shopName}</span>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">เวลาที่ทำรายการ</span>
              <span className="eslip-data-value">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString('th-TH') : new Date().toLocaleDateString('th-TH')}</span>
            </div>

            <div className="eslip-data-row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-light)' }}>
              <span className="eslip-data-label">ราคาสินค้ารวม</span>
              <span className="eslip-data-value">฿{Number(receipt.totalAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-data-row" style={{ color: 'var(--bank-royal)' }}>
              <span>สิทธิรัฐร่วมจ่าย (60%)</span>
              <span style={{ fontWeight: 800 }}>-฿{Number(receipt.governmentAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-total-row">
              <span>ยอดเงินที่ชำระจริง (40%)</span>
              <span>฿{Number(receipt.userAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-data-row" style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>ยอดเงินคงเหลือในกระเป๋า</span>
              <strong style={{ color: 'var(--bank-royal)' }}>฿{Number(receipt.remainingBalance).toFixed(2)}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  border: '1.5px solid var(--border-light)',
                  boxShadow: 'none',
                  minHeight: 48,
                  fontSize: 14,
                  fontWeight: 700
                }}
                onClick={() => setReceipt(null)}
              >
                ทำรายการใหม่
              </button>
              <Link
                to="/"
                className="btn-primary"
                style={{
                  minHeight: 48,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================
             VIEW 2: Payment Checkout Flow
             ======================================================== */
          <div>
            {/* Step 1: Select Shop */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <Store size={20} color="var(--bank-royal)" />
                  <span>ขั้นตอนที่ 1: เลือกร้านค้าที่ร่วมโครงการ</span>
                </h2>

                <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 38, paddingRight: 10, minHeight: 42, fontSize: 13.5 }}
                    placeholder="ค้นหาชื่อร้านค้าหรือหมวดหมู่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div className="spinner" />
                  <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>กำลังโหลดรายชื่อร้านค้า...</p>
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
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedShop(s); }}
                        style={{ minHeight: 80, touchAction: 'manipulation' }}
                      >
                        <div className="shop-icon-wrapper">
                          {getShopIcon(s.category)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="shop-info-name">{s.shopName}</div>
                          <span className="shop-info-cat">{s.category}</span>
                          <div className="shop-info-addr">{s.address || 'นครปฐม'}</div>
                        </div>

                        {isSelected && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bank-royal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Enter Amount & Live Co-Pay 60/40 Breakdown */}
            {selectedShop && (
              <div className="copay-card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={20} color="var(--bank-royal)" />
                  <span>ขั้นตอนที่ 2: ระบุราคาสินค้า และคำนวณสิทธิ 60/40</span>
                </h2>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <div>{error}</div>
                  </div>
                )}

                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                  {/* Selected Shop Information Plate */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--bank-royal-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                      gap: 10
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ร้านค้าที่เลือก:</span>
                      <strong style={{ display: 'block', fontSize: 15, color: 'var(--bank-royal)', wordBreak: 'break-word' }}>
                        {selectedShop.shopName}
                      </strong>
                    </div>
                    <span className="shop-info-cat" style={{ flexShrink: 0 }}>{selectedShop.category}</span>
                  </div>

                  {/* Input Amount Field */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                      ราคาสินค้ารวม (บาท) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: '12px',
                        minHeight: 56,
                        color: 'var(--bank-royal)'
                      }}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={1}
                      step={1}
                    />
                  </div>

                  {/* Preset Buttons (min 48px height for seniors) */}
                  <div className="payment-presets" style={{ marginBottom: 18 }}>
                    {['50', '100', '150', '200', '250', '300'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`preset-btn ${amount === val ? 'active' : ''}`}
                        onClick={() => setAmount(val)}
                        style={{ minHeight: 48, fontSize: 14, fontWeight: 700 }}
                      >
                        ฿{val}
                      </button>
                    ))}
                  </div>

                  {/* Live Co-Pay 60/40 Calculation Box */}
                  <div className="copay-breakdown-box" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--bank-royal)', marginBottom: 10 }}>
                      <ShieldCheck size={16} /> การคำนวณสิทธิคนละครึ่งพลีส (Co-Payment 60/40)
                    </div>

                    <div className="copay-row">
                      <span>ราคาสินค้าเต็ม</span>
                      <strong>฿{totalAmountNum.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-gov">
                      <span>รัฐบาลร่วมจ่าย (60%)</span>
                      <strong style={{ color: '#059669' }}>-฿{calculatedGovSubsidy.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-user">
                      <span>ผู้ใช้สิทธิจ่ายจริง (40%)</span>
                      <span style={{ fontSize: 18, color: 'var(--bank-royal)' }}>฿{calculatedUserPayment.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Balance Warning (Only when insufficient) */}
                  {!isBalanceSufficient && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13.5,
                        marginBottom: 16,
                        padding: '8px 12px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>ยอดเงินในกระเป๋าของคุณไม่เพียงพอสำหรับการชำระเงิน</span>
                    </div>
                  )}

                  {/* Confirm Payment Button (Large 52px Touch Target) */}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmPayment}
                    disabled={paying || totalAmountNum <= 0 || !isBalanceSufficient}
                    style={{ minHeight: 52, fontSize: 16, fontWeight: 800, width: '100%' }}
                  >
                    {paying ? (
                      <>
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        <span>กำลังประมวลผลการชำระเงิน...</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={20} />
                        <span>ยืนยันการชำระเงิน ฿{calculatedUserPayment.toFixed(2)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 3: Transaction Statement History
            ======================================================== */}
        <div className="history-card">
          <div className="history-card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Clock size={18} color="var(--bank-royal)" />
              <span>ประวัติรายการชำระเงินคนละครึ่ง ({history.length} รายการ)</span>
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              บันทึกธุรกรรมอิเล็กทรอนิกส์
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              ยังไม่มีประวัติการชำระเงิน เลือกร้านค้าด้านบนเพื่อเริ่มใช้สิทธิคนละครึ่ง
            </div>
          ) : (
            <div>
              {history.map((tx) => (
                <div key={tx.transactionId} className="history-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 15, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                      {tx.shopName}
                    </strong>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(tx.paidAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--bank-royal)', fontWeight: 600 }}>{tx.category || 'ร้านค้าทั่วไป'}</span>
                      <span>•</span>
                      <span>รัฐช่วยจ่าย ฿{Number(tx.governmentAmount).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>
                      จ่ายจริง ฿{Number(tx.userAmount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                      (ยอดเต็ม ฿{Number(tx.totalAmount).toFixed(2)})
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
