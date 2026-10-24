import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  HeartHandshake,
  GraduationCap,
  Trees,
  Users,
  HeartPulse,
  Coins,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  PlusCircle,
  Clock,
  X
} from 'lucide-react';

export default function Charities() {
  const { user, wallet, tokens, deductBalance, addTokens, resetBalance } = useAuth();

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
        // 1. Deduct simulated balance in AuthContext & LocalStorage
        const remaining = deductBalance(amountToDeduct);

        // 2. Add awarded Impact Tokens
        const bonusTokens = res.data.data.bonusTokensAwarded || Math.max(1, Math.floor(amountToDeduct / 20));
        addTokens(bonusTokens);

        // 3. Set success state to show receipt
        setDonationSuccess({
          ...res.data.data,
          remainingBalance: remaining,
        });

        // 4. Refresh charities stats & history
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

  // Filtered charities
  const filteredCharities = activeFilter === 'ALL'
    ? charities
    : charities.filter((c) => c.impactType === activeFilter);

  const getImpactBadge = (type) => {
    switch (type) {
      case 'EDUCATION':
        return { label: 'การศึกษาและเยาวชน', class: 'badge-edu', icon: <GraduationCap size={14} /> };
      case 'ENVIRONMENT':
        return { label: 'สิ่งแวดล้อมและธรรมชาติ', class: 'badge-env', icon: <Trees size={14} /> };
      case 'COMMUNITY':
        return { label: 'ชุมชนและผู้สูงอายุ', class: 'badge-com', icon: <Users size={14} /> };
      case 'HEALTHCARE':
        return { label: 'สาธารณสุขและการแพทย์', class: 'badge-health', icon: <HeartPulse size={14} /> };
      default:
        return { label: 'เพื่อสังคม', class: 'badge-edu', icon: <HeartHandshake size={14} /> };
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

          {/* Tokens Pill */}
          <div className="token-pill">
            <Coins size={16} />
            <span>{tokens} Tokens</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-container" style={{ marginTop: 24 }}>
        {/* Hero Banner */}
        <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 999, fontSize: 13, marginBottom: 12 }}>
            <HeartHandshake size={14} /> จำลองการบริจาคเพื่อสังคม
          </div>
          <h1 className="hero-title">
            ส่งต่อความช่วยเหลือ สร้างรอยยิ้มสู่ชุมชน 🌱
          </h1>
          <p className="hero-subtitle">
            เลือกมูลนิธิที่คุณต้องการสนับสนุน โดยระบบจะ<strong>จำลองการหักยอดเงินจากกระเป๋าเงินของคุณ</strong> พร้อมออกเลขอ้างอิง <strong>e-Donation สำหรับลดหย่อนภาษี</strong> และมอบ Impact Tokens เพิ่มเติมให้คุณ
          </p>
        </div>

        {/* Category Filters */}
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
            <Users size={15} /> ชุมชน & ผู้สูงอายุ
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
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>กำลังโหลดรายชื่อมูลนิธิ...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
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
                    {/* Impact Category Badge */}
                    <div className={`charity-impact-badge ${badge.class}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>

                    {/* Charity Name & Tax ID */}
                    <h2 className="charity-title">{item.name}</h2>
                    <div className="charity-taxid">
                      <FileText size={13} />
                      <span>เลขผู้เสียภาษี: {item.taxId} • e-Donation</span>
                    </div>

                    {/* Description */}
                    <p className="charity-desc">{item.description}</p>
                  </div>

                  <div>
                    {/* Stats summary */}
                    <div className="charity-stats">
                      <div className="charity-stats-item">
                        <span style={{ color: 'var(--text-muted)' }}>ยอดสนับสนุนรวม</span>
                        <strong style={{ color: '#059669' }}>฿{Number(item.totalDonations).toLocaleString()}</strong>
                      </div>
                      <div className="charity-stats-item" style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-muted)' }}>ผู้ร่วมบริจาค</span>
                        <strong>{item.donorCount} คน</strong>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="donation-presets">
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
                      className="btn-donate"
                      onClick={() => handleOpenDonate(item, 50)}
                    >
                      <HeartHandshake size={18} />
                      <span>ร่วมบริจาค</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* User Donation History Card */}
        <div className="history-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="var(--primary)" />
              ประวัติการบริจาคของคุณ ({history.length} รายการ)
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              บันทึกการหักเงินจำลองและ e-Donation
            </span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              คุณยังไม่มีประวัติการบริจาค เลือกมูลนิธิด้านบนเพื่อเริ่มส่งต่อความช่วยเหลือได้เลยครับ ✨
            </div>
          ) : (
            <div>
              {history.map((h) => (
                <div key={h.donationId} className="history-item">
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>{h.charityName}</strong>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{new Date(h.donatedAt).toLocaleString('th-TH')}</span>
                      <span>•</span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>{h.edonationRef}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#DC2626' }}>
                      -฿{Number(h.amount).toFixed(2)}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> สำเร็จ (e-Donation)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          Donation Confirmation & Success Modal
          ======================================================== */}
      {selectedCharity && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartHandshake size={22} color="#059669" />
                <span>ยืนยันการบริจาค</span>
              </div>
              <button type="button" className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {/* Error in modal */}
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <AlertCircle size={16} />
                <div>{error}</div>
              </div>
            )}

            {/* Success State View */}
            {donationSuccess ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#059669' }}>
                  <CheckCircle2 size={38} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  บริจาคสำเร็จเรียบร้อย! 🎉
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                  ขอบคุณที่ร่วมสนับสนุน <strong>{donationSuccess.charityName}</strong>
                </p>

                {/* Receipt Card */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: 18, textAlign: 'left', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>จำนวนเงินที่บริจาค:</span>
                    <strong style={{ color: '#DC2626' }}>-฿{Number(donationSuccess.amount).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>ยอดเงินคงเหลือในกระเป๋า:</span>
                    <strong style={{ color: '#059669' }}>฿{Number(donationSuccess.remainingBalance).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>เลขอ้างอิง e-Donation:</span>
                    <span style={{ color: '#0284C7', fontWeight: 700, fontFamily: 'monospace' }}>{donationSuccess.edonationRef}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, paddingTop: 8, borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Impact Tokens ที่ได้รับ:</span>
                    <span style={{ color: '#D97706', fontWeight: 700 }}>+{donationSuccess.bonusTokensAwarded} Tokens ⭐</span>
                  </div>
                </div>

                <button type="button" className="btn-primary" onClick={handleCloseModal}>
                  เสร็จสิ้น
                </button>
              </div>
            ) : (
              /* Step 1: Input & Confirm State */
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                  คุณกำลังจะร่วมบริจาคให้ <strong>{selectedCharity.name}</strong>
                </p>

                {/* Select Amount Buttons */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">เลือกจำนวนเงินบริจาค (บาท)</label>
                  <div className="donation-presets" style={{ marginBottom: 8 }}>
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

                  {/* Or Custom Amount */}
                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="หรือระบุจำนวนเงินเอง (บาท)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={1}
                    max={userBalance}
                  />
                </div>

                {/* Simulated Balance Breakdown */}
                <div className="donation-breakdown">
                  <div className="breakdown-row">
                    <span style={{ color: 'var(--text-muted)' }}>ยอดเงินคงเหลือปัจจุบัน:</span>
                    <span>฿{userBalance.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span style={{ color: 'var(--text-muted)' }}>ยอดที่จะบริจาค (จำลองหักเงิน):</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>
                      -฿{(customAmount ? parseFloat(customAmount) || 0 : donationAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="breakdown-row">
                    <span>ยอดเงินคงเหลือหลังบริจาค:</span>
                    <span style={{ color: '#059669' }}>
                      ฿{Math.max(0, userBalance - (customAmount ? parseFloat(customAmount) || 0 : donationAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* e-Donation Checkbox */}
                <label className="edonation-checkbox">
                  <input
                    type="checkbox"
                    checked={requestEDonation}
                    onChange={(e) => setRequestEDonation(e.target.checked)}
                  />
                  <span>
                    ขอรับเลขอ้างอิง <strong>e-Donation</strong> ส่งข้อมูลตรงยังกรมสรรพากรเพื่อใช้ลดหย่อนภาษีเงินได้บุคคลธรรมดา
                  </span>
                </label>

                {/* Confirm Button */}
                <button
                  type="button"
                  className="btn-donate"
                  onClick={handleConfirmDonation}
                  disabled={donating || (customAmount ? parseFloat(customAmount) > userBalance : donationAmount > userBalance)}
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
