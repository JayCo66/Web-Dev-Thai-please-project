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
  Grid
} from 'lucide-react';

export default function Payment() {
  const { wallet, deductBalance } = useAuth();

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
      return <Utensils size={18} />;
    }
    if (category.includes('OTOP')) {
      return <ShoppingBag size={18} />;
    }
    return <Store size={18} />;
  };

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
          {/* Link to Bingo */}
          <Link
            to="/bingo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 999,
              color: '#4338CA',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Grid size={15} color="#4F46E5" />
            <span>ภารกิจบิงโก 5x5</span>
          </Link>

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
      <main className="home-container">
        {/* ========================================================
            VIEW 1: Official Banking e-Slip (Shown when payment succeeded)
            ======================================================== */}
        {receipt ? (
          <div className="eslip-container" role="status" aria-label="ใบเสร็จการชำระเงิน">
            <div className="eslip-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <CheckCircle2 size={20} color="var(--fin-success)" />
                <span className="eslip-title">ใบเสร็จรับเงินอิเล็กทรอนิกส์ (e-Slip)</span>
              </div>
              <div className="eslip-subtitle">โครงการคนละครึ่งพลีส • สิทธิประโยชน์ภาครัฐ</div>
              <div className="eslip-status-badge">
                <span>ทำรายการสำเร็จ</span>
              </div>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">รหัสอ้างอิงธุรกรรม</span>
              <span className="eslip-data-value" style={{ fontFamily: 'monospace' }}>
                TX-{String(receipt.transactionId).padStart(6, '0')}
              </span>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">ร้านค้าผู้รับเงิน</span>
              <span className="eslip-data-value">{receipt.shopName}</span>
            </div>

            <div className="eslip-data-row">
              <span className="eslip-data-label">เวลาที่ทำรายการ</span>
              <span className="eslip-data-value">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString('th-TH') : new Date().toLocaleDateString('th-TH')}</span>
            </div>

            <div className="eslip-data-row" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-light)' }}>
              <span className="eslip-data-label">ราคาสินค้ารวม</span>
              <span className="eslip-data-value">฿{Number(receipt.totalAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-data-row" style={{ color: 'var(--bank-royal)' }}>
              <span>สิทธิรัฐร่วมจ่าย (60%)</span>
              <span style={{ fontWeight: 700 }}>-฿{Number(receipt.governmentAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-total-row">
              <span>ยอดเงินที่ชำระจริง (40%)</span>
              <span>฿{Number(receipt.userAmount).toFixed(2)}</span>
            </div>

            <div className="eslip-data-row" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              <span>ยอดเงินคงเหลือในกระเป๋า</span>
              <span>฿{Number(receipt.remainingBalance).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, background: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', boxShadow: 'none' }}
                onClick={() => setReceipt(null)}
              >
                ทำรายการใหม่
              </button>
              <Link
                to="/"
                className="btn-primary"
                style={{ flex: 1 }}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={19} color="var(--bank-royal)" />
                  <span>ขั้นตอนที่ 1: เลือกร้านค้าผู้ประกอบการที่เข้าร่วมโครงการ</span>
                </h2>

                <div style={{ position: 'relative', width: '100%', maxWidth: 240 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 36, paddingRight: 10, minHeight: 38, fontSize: 13 }}
                    placeholder="ค้นหาร้านค้า..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div className="spinner" />
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>กำลังโหลดรายชื่อร้านค้า...</p>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedShop(s); }}
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
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bank-royal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={13} />
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
              <div className="copay-card">
                <h2 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={19} color="var(--bank-royal)" />
                  <span>ขั้นตอนที่ 2: ระบุราคาสินค้า และคำนวณสิทธิ 60/40</span>
                </h2>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                    <AlertCircle size={17} style={{ flexShrink: 0 }} />
                    <div>{error}</div>
                  </div>
                )}

                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                  {/* Selected Shop Information Plate */}
                  <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>ร้านค้าที่เลือก:</span>
                      <strong style={{ display: 'block', fontSize: 14.5, color: 'var(--bank-royal)', wordBreak: 'break-word' }}>
                        {selectedShop.shopName}
                      </strong>
                    </div>
                    <span className="shop-info-cat" style={{ flexShrink: 0 }}>{selectedShop.category}</span>
                  </div>

                  {/* Input Amount Field */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 13.5 }}>
                      ราคาสินค้ารวม (บาท) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', padding: '10px', minHeight: 50, color: 'var(--bank-royal)' }}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={1}
                      step={1}
                    />
                  </div>

                  {/* Preset Buttons (3 cols mobile, 6 cols desktop, min 44px height) */}
                  <div className="payment-presets">
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

                  {/* Live Co-Pay 60/40 Calculation Box */}
                  <div className="copay-breakdown-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--bank-royal)', marginBottom: 10 }}>
                      <ShieldCheck size={15} /> การคำนวณสิทธิคนละครึ่งพลีส (Co-Payment 60/40)
                    </div>

                    <div className="copay-row">
                      <span>ราคาสินค้าเต็ม</span>
                      <strong>฿{totalAmountNum.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-gov">
                      <span>รัฐบาลร่วมจ่าย (60%)</span>
                      <strong>-฿{calculatedGovSubsidy.toFixed(2)}</strong>
                    </div>

                    <div className="copay-row highlight-user">
                      <span>ผู้ใช้สิทธิจ่ายจริง (40%)</span>
                      <span>฿{calculatedUserPayment.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Balance Check Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 18, padding: '0 2px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินคงเหลือหลังหักจ่าย:</span>
                    <strong style={{ color: isBalanceSufficient ? 'var(--bank-royal)' : 'var(--fin-danger)' }}>
                      ฿{remainingBalanceAfterPay.toFixed(2)} {!isBalanceSufficient && '(ยอดเงินไม่พอ)'}
                    </strong>
                  </div>

                  {/* Confirm Payment Button */}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmPayment}
                    disabled={paying || totalAmountNum <= 0 || !isBalanceSufficient}
                  >
                    {paying ? (
                      <>
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <span>กำลังประมวลผลการชำระเงิน...</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={17} />
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={17} color="var(--bank-royal)" />
              ประวัติรายการชำระเงินคนละครึ่ง ({history.length} รายการ)
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              บันทึกธุรกรรมอิเล็กทรอนิกส์
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              ยังไม่มีประวัติการชำระเงิน เลือกร้านค้าด้านบนเพื่อเริ่มใช้สิทธิคนละครึ่ง
            </div>
          ) : (
            <div>
              {history.map((tx) => (
                <div key={tx.transactionId} className="history-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14.5, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                      {tx.shopName}
                    </strong>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(tx.paidAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--bank-royal)', fontWeight: 600 }}>{tx.category || 'ร้านค้าทั่วไป'}</span>
                      <span>•</span>
                      <span>รัฐจ่าย ฿{Number(tx.governmentAmount).toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--fin-success)' }}>
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
