import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  HeartHandshake,
  GraduationCap,
  Trees,
  Users,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  X,
  ShieldCheck,
  PlusCircle,
  Wallet,
  Coins,
  Check
} from 'lucide-react';

export default function Charities() {
  const { wallet, deductBalance, addTokens, resetBalance } = useAuth();

  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected filter
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Donation Modal state
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [donationAmount, setDonationAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [requestEDonation, setRequestEDonation] = useState(true);
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(null);

  // User donation history
  const [history, setHistory] = useState([]);

  // Fetch charities and history on mount
  useEffect(() => {
    fetchCharities();
    fetchMyDonations();
  }, []);

  const fetchCharities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/charities');
      if (res.data && res.data.success) {
        setCharities(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching charities:', err);
      setError('ไม่สามารถโหลดข้อมูลมูลนิธิได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyDonations = async () => {
    try {
      const res = await api.get('/charities/my-donations');
      if (res.data && res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching my donations:', err);
    }
  };

  // Open modal for a specific charity
  const handleOpenDonate = (charity, defaultAmt = 50) => {
    setSelectedCharity(charity);
    setDonationAmount(defaultAmt);
    setCustomAmount('');
    setDonationSuccess(null);
    setError('');
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedCharity(null);
    setDonationSuccess(null);
    setDonating(false);
  };

  // Submit Donation (Simulate Balance Deduction)
  const handleConfirmDonation = async () => {
    const amountToDeduct = customAmount ? parseFloat(customAmount) : parseFloat(donationAmount);
    const currentBalance = parseFloat(wallet?.balance || '0.00');

    if (!amountToDeduct || amountToDeduct <= 0) {
      setError('กรุณาระบุจำนวนเงินบริจาคที่ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }

    if (amountToDeduct > currentBalance) {
      setError(`ยอดเงินคงเหลือของคุณมีไม่พอ (ต้องการ ฿${amountToDeduct.toFixed(2)}, คงเหลือ ฿${currentBalance.toFixed(2)})`);
      return;
    }

    try {
      setDonating(true);
      setError('');

      const res = await api.post('/charities/donate', {
        charityId: selectedCharity.charityId,
        amount: amountToDeduct,
      });

      if (res.data && res.data.success) {
        const remaining = deductBalance(amountToDeduct);
        const bonusTokens = res.data.data.bonusTokensAwarded || Math.max(1, Math.floor(amountToDeduct / 20));
        addTokens(bonusTokens);

        setDonationSuccess({
          ...res.data.data,
          remainingBalance: remaining,
        });

        fetchCharities();
        fetchMyDonations();
      } else {
        setError(res.data.error || 'เกิดข้อผิดพลาดในการบริจาค');
      }
    } catch (err) {
      console.error('Error donating:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบบริจาค');
    } finally {
      setDonating(false);
    }
  };

  const filteredCharities = activeFilter === 'ALL'
    ? charities
    : charities.filter((c) => c.impactType === activeFilter);

  const getImpactBadge = (type) => {
    switch (type) {
      case 'EDUCATION':
        return { label: 'การศึกษาและเยาวชน', class: 'badge-edu', icon: <GraduationCap size={13} /> };
      case 'ENVIRONMENT':
        return { label: 'สิ่งแวดล้อมและธรรมชาติ', class: 'badge-env', icon: <Trees size={13} /> };
      case 'COMMUNITY':
        return { label: 'ชุมชนและผู้สูงอายุ', class: 'badge-com', icon: <Users size={13} /> };
      case 'HEALTHCARE':
        return { label: 'สาธารณสุขและการแพทย์', class: 'badge-health', icon: <HeartPulse size={13} /> };
      default:
        return { label: 'เพื่อสังคม', class: 'badge-edu', icon: <HeartHandshake size={13} /> };
    }
  };

  const userBalance = parseFloat(wallet?.balance || '500.00');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Official Banking Navigation & Fixed Mobile Bottom Dock */}
      <Navbar />

      {/* Main Container */}
      <main className="home-container" id="main-charities-content">
        {/* Banner Section */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0A192F 0%, #0369A1 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '22px 20px',
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(10, 25, 47, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
          }}
          aria-label="ระบบบริจาคอิเล็กทรอนิกส์ e-Donation"
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
              color: '#BAE6FD'
            }}
          >
            <ShieldCheck size={14} color="#BAE6FD" />
            <span>ระบบ e-Donation กรมสรรพากร</span>
          </div>

          <h1 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            บริจาคอิเล็กทรอนิกส์เพื่อสังคม
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, margin: 0, maxWidth: 680, color: '#E0F2FE' }}>
            สนับสนุนมูลนิธิที่คุณไว้วางใจ ระบบจะหักยอดเงินจำลองในกระเป๋าของคุณ พร้อมออกเลขอ้างอิง <strong>e-Donation ลดหย่อนภาษี</strong> และมอบคะแนน Impact Tokens ตอบแทนทันที
          </p>

          {/* Quick Balance & Refill Pill */}
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
              <Wallet size={17} color="#BAE6FD" />
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>ยอดคงเหลือในกระเป๋า:</span>
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

        {/* Category Filters (Mobile-first, min 44px touch targets) */}
        <div className="charity-filters" role="tablist" aria-label="หมวดหมู่มูลนิธิ">
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
            style={{ minHeight: 44 }}
          >
            ทั้งหมด ({charities.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'EDUCATION' ? 'active' : ''}`}
            onClick={() => setActiveFilter('EDUCATION')}
            style={{ minHeight: 44 }}
          >
            <GraduationCap size={15} /> การศึกษา
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'ENVIRONMENT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ENVIRONMENT')}
            style={{ minHeight: 44 }}
          >
            <Trees size={15} /> สิ่งแวดล้อม
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'COMMUNITY' ? 'active' : ''}`}
            onClick={() => setActiveFilter('COMMUNITY')}
            style={{ minHeight: 44 }}
          >
            <Users size={15} /> ชุมชนและผู้สูงอายุ
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'HEALTHCARE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('HEALTHCARE')}
            style={{ minHeight: 44 }}
          >
            <HeartPulse size={15} /> สาธารณสุข
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div className="spinner" />
            <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>กำลังโหลดรายชื่อมูลนิธิ...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Charities Cards Grid */}
        {!loading && (
          <div className="charity-grid">
            {filteredCharities.map((item) => {
              const badge = getImpactBadge(item.impactType);
              return (
                <div key={item.charityId} className="charity-card">
                  <div>
                    {/* Category Accreditation Badge */}
                    <div className={`charity-impact-badge ${badge.class}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>

                    {/* Charity Name & Tax ID */}
                    <h2 className="charity-title">{item.name}</h2>
                    <div className="charity-taxid">
                      <FileText size={13} />
                      <span>เลขประจำตัวผู้เสียภาษี: {item.taxId} • e-Donation</span>
                    </div>

                    {/* Description */}
                    <p className="charity-desc">{item.description}</p>
                  </div>

                  <div>
                    {/* Stats summary */}
                    <div className="charity-stats">
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>ยอดสนับสนุนรวม</span>
                        <strong>฿{Number(item.totalDonations).toLocaleString()}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>ผู้ร่วมบริจาค</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.donorCount} คน</strong>
                      </div>
                    </div>

                    {/* Quick Preset Buttons (min 44px touch height) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                      {[20, 50, 100, 200].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className="preset-btn"
                          onClick={() => handleOpenDonate(item, amt)}
                          style={{ minHeight: 44, fontSize: 13.5, fontWeight: 700 }}
                        >
                          ฿{amt}
                        </button>
                      ))}
                    </div>

                    {/* Main Action Button (min 48px touch height) */}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenDonate(item, 50)}
                      style={{ minHeight: 48, fontSize: 14, fontWeight: 700, width: '100%' }}
                    >
                      <HeartHandshake size={18} />
                      <span>ร่วมบริจาค (e-Donation)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* User Donation History Statement */}
        <div className="history-card">
          <div className="history-card-header">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Clock size={18} color="var(--bank-royal)" />
              <span>ประวัติการบริจาคของคุณ ({history.length} รายการ)</span>
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              บันทึกการหักเงินจำลองและ e-Donation กรมสรรพากร
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              คุณยังไม่มีประวัติการบริจาค เลือกมูลนิธิด้านบนเพื่อเริ่มส่งต่อความช่วยเหลือ
            </div>
          ) : (
            <div>
              {history.map((h) => (
                <div key={h.donationId} className="history-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 15, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                      {h.charityName}
                    </strong>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(h.donatedAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--bank-royal)', fontWeight: 600 }}>{h.edonationRef}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#DC2626' }}>
                      -฿{Number(h.amount).toFixed(2)}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'var(--fin-success-bg)', color: 'var(--fin-success)', padding: '2px 8px', borderRadius: 999, fontWeight: 600, border: '1px solid var(--fin-success-border)' }}>
                      <CheckCircle2 size={11} /> สำเร็จ (e-Donation)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          Donation Confirmation & Success Modal (No Emojis)
          ======================================================== */}
      {selectedCharity && (
        <div className="modal-overlay" onClick={handleCloseModal} role="dialog" aria-modal="true">
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">
                <HeartHandshake size={22} color="var(--bank-royal)" />
                <span>ยืนยันการบริจาค e-Donation</span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
                aria-label="ปิดหน้าต่าง"
                style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {donationSuccess ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--fin-success-bg)', border: '1px solid var(--fin-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--fin-success)' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: 18.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  บริจาคสำเร็จเรียบร้อย
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ขอบคุณที่ร่วมสนับสนุน <strong>{donationSuccess.charityName}</strong>
                </p>

                {/* Receipt Card */}
                <div style={{ background: 'var(--bank-royal-light)', border: '1px solid var(--bank-royal-border)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'left', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>จำนวนเงินที่บริจาค:</span>
                    <strong style={{ color: '#DC2626' }}>-฿{Number(donationSuccess.amount).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินคงเหลือในกระเป๋า:</span>
                    <strong style={{ color: 'var(--bank-royal)' }}>฿{Number(donationSuccess.remainingBalance).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>เลขอ้างอิง e-Donation:</span>
                    <span style={{ color: 'var(--bank-royal)', fontWeight: 700, fontFamily: 'monospace' }}>{donationSuccess.edonationRef}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, paddingTop: 8, borderTop: '1px dashed var(--bank-royal-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Impact Tokens ที่ได้รับ:</span>
                    <span style={{ color: '#B45309', fontWeight: 800 }}>+{donationSuccess.bonusTokensAwarded} Tokens</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCloseModal}
                  style={{ minHeight: 48, fontSize: 15, fontWeight: 700, width: '100%' }}
                >
                  เสร็จสิ้น
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  คุณกำลังจะร่วมบริจาคให้ <strong>{selectedCharity.name}</strong>
                </p>

                {/* Select Amount Buttons */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>
                    เลือกจำนวนเงินบริจาค (บาท)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                    {[20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`preset-btn ${!customAmount && donationAmount === amt ? 'active' : ''}`}
                        onClick={() => { setDonationAmount(amt); setCustomAmount(''); }}
                        style={{ minHeight: 46, fontSize: 13.5, fontWeight: 700 }}
                      >
                        ฿{amt}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: 14, minHeight: 48, fontSize: 15 }}
                    placeholder="หรือระบุจำนวนเงินเอง (บาท)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={1}
                    max={userBalance}
                  />
                </div>

                {/* Simulated Balance Breakdown */}
                <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินคงเหลือปัจจุบัน:</span>
                    <span>฿{userBalance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดที่จะบริจาค (จำลองหักเงิน):</span>
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>
                      -฿{(customAmount ? parseFloat(customAmount) || 0 : donationAmount).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700, paddingTop: 8, borderTop: '1px dashed var(--border-light)' }}>
                    <span>ยอดคงเหลือหลังบริจาค:</span>
                    <span style={{ color: 'var(--bank-royal)' }}>
                      ฿{Math.max(0, userBalance - (customAmount ? parseFloat(customAmount) || 0 : donationAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* e-Donation Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    checked={requestEDonation}
                    onChange={(e) => setRequestEDonation(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18 }}
                  />
                  <span>
                    ขอรับเลขอ้างอิง <strong>e-Donation</strong> ส่งข้อมูลตรงยังกรมสรรพากรเพื่อใช้สิทธิลดหย่อนภาษีเงินได้บุคคลธรรมดา
                  </span>
                </label>

                {/* Confirm Button */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmDonation}
                  disabled={donating || (customAmount ? parseFloat(customAmount) > userBalance : donationAmount > userBalance)}
                  style={{ minHeight: 50, fontSize: 15.5, fontWeight: 800, width: '100%' }}
                >
                  {donating ? (
                    <>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      <span>กำลังประมวลผลการบริจาค...</span>
                    </>
                  ) : (
                    <>
                      <HeartHandshake size={18} />
                      <span>ยืนยันการบริจาค (หักยอดเงินจำลอง)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
