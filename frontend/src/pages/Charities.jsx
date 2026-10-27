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
  Gift,
  Grid
} from 'lucide-react';

export default function Charities() {
  const { wallet, deductBalance, addTokens } = useAuth();

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
      setError('กรุณาระบุจำนวนเงินบริจาคที่ถูกต้อง');
      return;
    }

    if (amountToDeduct > currentBalance) {
      setError(`ยอดเงินคงเหลือของคุณมีไม่พอ (คงเหลือ ฿${currentBalance.toFixed(2)})`);
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
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div className="header-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
              <ArrowLeft size={18} />
            </div>
            <div>
              <div className="header-title">มูลนิธิและโครงการเพื่อสังคม</div>
              <div className="header-tag">Social Impact & e-Donation</div>
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
              title="รีเซ็ตหรือเติมเงินจำลองเป็น 500 บาทสำหรับการทดสอบ"
            >
              + เติม ฿500
            </button>
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, marginBottom: 6 }}>
            ระบบบริจาคอิเล็กทรอนิกส์เพื่อสังคม
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, maxWidth: 680 }}>
            เลือกมูลนิธิที่คุณต้องการสนับสนุน โดยระบบจะจำลองการหักยอดเงินจากกระเป๋าของคุณ พร้อมออกเลขอ้างอิง <strong>e-Donation สำหรับลดหย่อนภาษีเงินได้</strong> และบันทึกคะแนน Impact Tokens
          </p>
        </div>

        {/* Category Filters (Touch-friendly 44px targets, no emojis) */}
        <div className="charity-filters">
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            ทั้งหมด ({charities.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'EDUCATION' ? 'active' : ''}`}
            onClick={() => setActiveFilter('EDUCATION')}
          >
            <GraduationCap size={15} /> การศึกษา
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'ENVIRONMENT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ENVIRONMENT')}
          >
            <Trees size={15} /> สิ่งแวดล้อม
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'COMMUNITY' ? 'active' : ''}`}
            onClick={() => setActiveFilter('COMMUNITY')}
          >
            <Users size={15} /> ชุมชนและผู้สูงอายุ
          </button>
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'HEALTHCARE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('HEALTHCARE')}
          >
            <HeartPulse size={15} /> สาธารณสุข
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <div className="spinner" />
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>กำลังโหลดรายชื่อมูลนิธิ...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
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
                      <FileText size={12} />
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
                      <button type="button" className="preset-btn" onClick={() => handleOpenDonate(item, 20)}>
                        ฿20
                      </button>
                      <button type="button" className="preset-btn" onClick={() => handleOpenDonate(item, 50)}>
                        ฿50
                      </button>
                      <button type="button" className="preset-btn" onClick={() => handleOpenDonate(item, 100)}>
                        ฿100
                      </button>
                      <button type="button" className="preset-btn" onClick={() => handleOpenDonate(item, 200)}>
                        ฿200
                      </button>
                    </div>

                    {/* Main Action Button */}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenDonate(item, 50)}
                    >
                      <HeartHandshake size={16} />
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={17} color="var(--bank-royal)" />
              ประวัติการบริจาคของคุณ ({history.length} รายการ)
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              บันทึกการหักเงินจำลองและ e-Donation กรมสรรพากร
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>
              คุณยังไม่มีประวัติการบริจาค เลือกมูลนิธิด้านบนเพื่อเริ่มส่งต่อความช่วยเหลือ
            </div>
          ) : (
            <div>
              {history.map((h) => (
                <div key={h.donationId} className="history-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14.5, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                      {h.charityName}
                    </strong>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(h.donatedAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--bank-royal)', fontWeight: 600 }}>{h.edonationRef}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--fin-danger)' }}>
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <HeartHandshake size={20} color="var(--bank-royal)" />
                <span>ยืนยันการบริจาค e-Donation</span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {donationSuccess ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--fin-success-bg)', border: '1px solid var(--fin-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--fin-success)' }}>
                  <CheckCircle2 size={30} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  บริจาคสำเร็จเรียบร้อย
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ขอบคุณที่ร่วมสนับสนุน <strong>{donationSuccess.charityName}</strong>
                </p>

                {/* Receipt Card */}
                <div style={{ background: 'var(--bank-royal-light)', border: '1px solid var(--bank-royal-border)', borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'left', marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>จำนวนเงินที่บริจาค:</span>
                    <strong style={{ color: 'var(--fin-danger)' }}>-฿{Number(donationSuccess.amount).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินคงเหลือในกระเป๋า:</span>
                    <strong style={{ color: 'var(--bank-royal)' }}>฿{Number(donationSuccess.remainingBalance).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>เลขอ้างอิง e-Donation:</span>
                    <span style={{ color: 'var(--bank-royal)', fontWeight: 700, fontFamily: 'monospace' }}>{donationSuccess.edonationRef}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 6, borderTop: '1px dashed var(--bank-royal-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Impact Tokens ที่ได้รับ:</span>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>+{donationSuccess.bonusTokensAwarded} Tokens</span>
                  </div>
                </div>

                <button type="button" className="btn-primary" onClick={handleCloseModal}>
                  เสร็จสิ้น
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  คุณกำลังจะร่วมบริจาคให้ <strong>{selectedCharity.name}</strong>
                </p>

                {/* Select Amount Buttons */}
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">เลือกจำนวนเงินบริจาค (บาท)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                    {[20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`preset-btn ${!customAmount && donationAmount === amt ? 'active' : ''}`}
                        onClick={() => { setDonationAmount(amt); setCustomAmount(''); }}
                      >
                        ฿{amt}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: 12 }}
                    placeholder="หรือระบุจำนวนเงินเอง (บาท)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={1}
                    max={userBalance}
                  />
                </div>

                {/* Simulated Balance Breakdown */}
                <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินคงเหลือปัจจุบัน:</span>
                    <span>฿{userBalance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดที่จะบริจาค (จำลองหักเงิน):</span>
                    <span style={{ color: 'var(--fin-danger)', fontWeight: 600 }}>
                      -฿{(customAmount ? parseFloat(customAmount) || 0 : donationAmount).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, paddingTop: 6, borderTop: '1px dashed var(--border-light)' }}>
                    <span>ยอดคงเหลือหลังบริจาค:</span>
                    <span style={{ color: 'var(--bank-royal)' }}>
                      ฿{Math.max(0, userBalance - (customAmount ? parseFloat(customAmount) || 0 : donationAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* e-Donation Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    checked={requestEDonation}
                    onChange={(e) => setRequestEDonation(e.target.checked)}
                    style={{ marginTop: 2 }}
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
                >
                  {donating ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      <span>กำลังประมวลผลการบริจาค...</span>
                    </>
                  ) : (
                    <>
                      <HeartHandshake size={16} />
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
