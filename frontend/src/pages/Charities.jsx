import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake,
  GraduationCap,
  Trees,
  Users,
  HeartPulse,
  Eye,
  EyeOff,
  PlusCircle,
  ArrowRight,
  Info,
  Search,
  X,
  FileText,
  Clock,
  Check,
  Coins,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Pencil
} from 'lucide-react';

export default function Charities() {
  const { user, wallet, tokens, deductBalance, addTokens, refreshUser, resetBalance } = useAuth();

  // Primary states
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Eye toggle for balance visibility (Home page style)
  const [showBalance, setShowBalance] = useState(true);

  // Active view tab: 'DONATE' vs 'HISTORY'
  const [activeTab, setActiveTab] = useState('DONATE');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Wallet topup feedback notification
  const [topupFeedback, setTopupFeedback] = useState('');

  // Donation Modal state
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [donationAmount, setDonationAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [requestEDonation, setRequestEDonation] = useState(true);
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(null);
  const customAmountInputRef = useRef(null);

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
      setError('ไม่สามารถโหลดข้อมูลมูลนิธิได้ กรุณาลองใหม่อีกครั้ง');
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

  // Quick Topup with clear feedback for seniors
  const handleTopupWallet = (amount = 500) => {
    resetBalance(amount);
    setTopupFeedback('เติมเงิน ฿500 สำเร็จแล้ว!');
    setTimeout(() => {
      setTopupFeedback('');
    }, 2500);
  };

  // Open modal for a specific charity with preset or custom amount
  const handleOpenDonate = (charity, defaultAmt = 50, isCustom = false) => {
    setSelectedCharity(charity);
    if (isCustom) {
      setDonationAmount(0);
      setCustomAmount('');
      setTimeout(() => {
        if (customAmountInputRef.current) {
          customAmountInputRef.current.focus();
        }
      }, 100);
    } else {
      setDonationAmount(defaultAmt);
      setCustomAmount('');
    }
    setDonationSuccess(null);
    setError('');
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedCharity(null);
    setDonationSuccess(null);
    setDonating(false);
    setError('');
  };

  // Effective donation amount
  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : parseFloat(donationAmount) || 0;
  const userBalance = parseFloat(wallet?.balance || '500.00');
  const remainingBalanceAfterDonation = Math.max(0, userBalance - effectiveAmount);
  const isBalanceSufficient = userBalance >= effectiveAmount && effectiveAmount > 0;
  const expectedBonusTokens = effectiveAmount > 0 ? Math.max(1, Math.floor(effectiveAmount / 20)) : 0;

  // Submit Donation (Simulate Balance Deduction)
  const handleConfirmDonation = async () => {
    setError('');

    if (!effectiveAmount || effectiveAmount <= 0) {
      setError('กรุณาระบุจำนวนเงินบริจาคที่ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }

    if (effectiveAmount > userBalance) {
      setError(`ยอดเงินในกระเป๋าของคุณไม่เพียงพอ (ต้องการ ฿${effectiveAmount.toFixed(2)}, คงเหลือ ฿${userBalance.toFixed(2)})`);
      return;
    }

    try {
      setDonating(true);
      const res = await api.post('/charities/donate', {
        charityId: selectedCharity.charityId,
        amount: effectiveAmount,
      });

      if (res.data && res.data.success) {
        const remaining = deductBalance(effectiveAmount);
        const bonusTokens = res.data.data.bonusTokensAwarded || expectedBonusTokens;
        addTokens(bonusTokens);
        if (typeof refreshUser === 'function') {
          refreshUser();
        }

        setDonationSuccess({
          ...res.data.data,
          remainingBalance: remaining,
        });

        fetchCharities();
        fetchMyDonations();
      } else {
        setError(res.data.error || 'การบริจาคไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error donating:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบบริจาค');
    } finally {
      setDonating(false);
    }
  };

  // Category counts
  const eduCount = charities.filter((c) => c.impactType === 'EDUCATION').length;
  const envCount = charities.filter((c) => c.impactType === 'ENVIRONMENT').length;
  const comCount = charities.filter((c) => c.impactType === 'COMMUNITY').length;
  const healthCount = charities.filter((c) => c.impactType === 'HEALTHCARE').length;

  // Filtered charities
  const filteredCharities = charities.filter((c) => {
    const matchesCategory = activeFilter === 'ALL' || c.impactType === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.taxId && c.taxId.includes(q));
    return matchesCategory && matchesSearch;
  });

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
        return { label: 'เพื่อสาธารณกุศล', class: 'badge-edu', icon: <HeartHandshake size={14} /> };
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Official Financial Header & Fixed Mobile Navigation Dock */}
      <Navbar />

      {/* Main Banking App Shell (Matching Home page container exactly) */}
      <main className="home-container" id="main-content">
        {/* ========================================================
            1. SIGNATURE G-WALLET / FINANCIAL ACCOUNT CARD (HOME STYLE)
            ======================================================== */}
        <section className="financial-wallet-card" aria-label="บัตรกระเป๋าเงินดิจิทัลเพื่อการบริจาค">
          {/* Top Row: Identity & Trust Badge */}
          <div className="wallet-card-top">
            <div className="wallet-badge">
              <ShieldCheck size={15} color="#93C5FD" />
              <span>ระบบบริจาคอิเล็กทรอนิกส์ e-Donation</span>
            </div>
            <div className="wallet-security-seal">
              <CheckCircle2 size={13} color="#34D399" />
              <span>ลดหย่อนภาษี 100%</span>
            </div>
          </div>

          {/* Balance Section with Accessible Font and Eye Toggle */}
          <div className="wallet-balance-row">
            <div>
              <div className="wallet-balance-title">
                <span>ยอดเงินคงเหลือพร้อมใช้ (จำลอง)</span>
                <button
                  type="button"
                  className="btn-toggle-balance"
                  onClick={() => setShowBalance(!showBalance)}
                  title={showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}
                  aria-label={showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="wallet-balance-amount">
                {showBalance ? `฿${userBalance.toFixed(2)}` : '฿ ••••••'}
              </div>
            </div>

            <button
              type="button"
              className="btn-wallet-topup"
              onClick={() => handleTopupWallet(500)}
              title="เติมเงินจำลอง 500 บาทสำหรับการทดสอบระบบ"
              aria-label="เติมเงินจำลอง 500 บาท"
            >
              {topupFeedback ? (
                <>
                  <Check size={18} />
                  <span>{topupFeedback}</span>
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  <span>เติมเงิน ฿500</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Meta Grid: Tax Status & Bonus Tokens */}
          <div className="wallet-meta-grid">
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">ระบบลดหย่อนภาษีภาครัฐ</span>
              <span className="wallet-meta-value">e-Donation กรมสรรพากร</span>
            </div>
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">เหรียญ Impact Tokens สะสม</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="wallet-meta-value" style={{ color: '#FDE68A' }}>
                  {tokens} เหรียญ
                </span>
                <Link
                  to="/rewards"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FEF3C7',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    minHeight: 32,
                    whiteSpace: 'nowrap'
                  }}
                  title="ไปหน้าแลกของรางวัลและชิงโชค"
                >
                  <span>แลกของรางวัล</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        
        {/* ========================================================
            BENEFITS SUMMARY CARD (HOME STYLE - INSTANT READABILITY)
            ======================================================== */}
        <div className="charity-benefits-card" role="region" aria-label="สิทธิประโยชน์การบริจาค">
          <div className="charity-benefit-col">
            <div className="charity-benefit-icon" style={{ background: '#EFF6FF', color: 'var(--bank-royal)' }}>
              <ShieldCheck size={20} />
            </div>
            <div className="charity-benefit-info">
              <span className="charity-benefit-label">ลดหย่อนภาษี 100%</span>
              <span className="charity-benefit-sub">ส่งข้อมูลตรงกรมสรรพากร</span>
            </div>
          </div>

          <div className="charity-benefit-sep" />

          <div className="charity-benefit-col">
            <div className="charity-benefit-icon" style={{ background: '#EFF6FF', color: 'var(--bank-royal)' }}>
              <Coins size={20} />
            </div>
            <div className="charity-benefit-info">
              <span className="charity-benefit-label">ทุก 20 บาท = 1 Token</span>
              <span className="charity-benefit-sub">สะสมแต้มแลกของรางวัล</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            PRIMARY 2-MODE TAB SWITCHER (THUMB-FRIENDLY)
            ======================================================== */}
        <div className="charity-mode-switcher" role="tablist" aria-label="แถบสลับหน้า">
          <button
            type="button"
            className={`charity-mode-btn ${activeTab === 'DONATE' ? 'active' : ''}`}
            onClick={() => setActiveTab('DONATE')}
            role="tab"
            aria-selected={activeTab === 'DONATE'}
          >
            <HeartHandshake size={18} />
            <span>เลือกมูลนิธิเพื่อบริจาค ({charities.length})</span>
          </button>

          <button
            type="button"
            className={`charity-mode-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
            role="tab"
            aria-selected={activeTab === 'HISTORY'}
          >
            <Clock size={18} />
            <span>ประวัติการบริจาค ({history.length})</span>
          </button>
        </div>

        {/* ========================================================
            VIEW 1: CHARITY LIST & DONATION (TAB 1)
            ======================================================== */}
        {activeTab === 'DONATE' && (
          <div>
            {/* Search Input Box */}
            <div className="charity-search-wrap">
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                className="charity-search-input"
                placeholder="พิมพ์ชื่อมูลนิธิ เช่น ศิริราช, สัตว์ป่า, เด็ก, ยุวพัฒน์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="ค้นหาชื่อมูลนิธิ"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="charity-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="ล้างคำค้นหา"
                  title="ล้างคำค้นหา"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="charity-filters" role="tablist" aria-label="ตัวกรองหมวดหมู่">
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ALL')}
                role="tab"
                aria-selected={activeFilter === 'ALL'}
              >
                <span>ทั้งหมด ({charities.length})</span>
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'EDUCATION' ? 'active' : ''}`}
                onClick={() => setActiveFilter('EDUCATION')}
                role="tab"
                aria-selected={activeFilter === 'EDUCATION'}
              >
                <GraduationCap size={16} />
                <span>การศึกษา ({eduCount})</span>
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'ENVIRONMENT' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ENVIRONMENT')}
                role="tab"
                aria-selected={activeFilter === 'ENVIRONMENT'}
              >
                <Trees size={16} />
                <span>สิ่งแวดล้อม ({envCount})</span>
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'COMMUNITY' ? 'active' : ''}`}
                onClick={() => setActiveFilter('COMMUNITY')}
                role="tab"
                aria-selected={activeFilter === 'COMMUNITY'}
              >
                <Users size={16} />
                <span>ชุมชนและผู้สูงอายุ ({comCount})</span>
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'HEALTHCARE' ? 'active' : ''}`}
                onClick={() => setActiveFilter('HEALTHCARE')}
                role="tab"
                aria-selected={activeFilter === 'HEALTHCARE'}
              >
                <HeartPulse size={16} />
                <span>สาธารณสุข ({healthCount})</span>
              </button>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                  กำลังโหลดรายชื่อมูลนิธิ...
                </p>
              </div>
            )}

            {/* Error message */}
            {error && !selectedCharity && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {/* Empty Search Results */}
            {!loading && filteredCharities.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  <Search size={24} />
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  ไม่พบมูลนิธิที่ตรงกับ "{searchQuery}"
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ลองพิมพ์ด้วยคำอื่น เช่น ศิริราช, ป่าไม้, ทุน หรือเลือกหมวดหมู่อื่น
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
                  style={{ maxWidth: 220, margin: '0 auto', minHeight: 46, fontSize: 14 }}
                >
                  <RotateCcw size={16} />
                  <span>แสดงมูลนิธิทั้งหมด</span>
                </button>
              </div>
            )}

            {/* Charities Grid (1 col mobile, 2 col tablet, 3 col desktop) */}
            {!loading && filteredCharities.length > 0 && (
              <div className="charity-grid">
                {filteredCharities.map((item) => {
                  const badge = getImpactBadge(item.impactType);
                  return (
                    <article key={item.charityId} className="charity-card">
                      <div>
                        {/* Charity Illustration Image */}
                        <div className="charity-card-img-wrap">
                          <img
                            src={item.imageUrl || `/charities/charity-${item.charityId}.jpg`}
                            alt={item.name}
                            className="charity-card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Top Accreditation & Category Row */}
                        <div className="charity-top-row">
                          <div className={`charity-impact-badge ${badge.class}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </div>
                        </div>

                        {/* Charity Name */}
                        <h3 className="charity-title">{item.name}</h3>

                        {/* Tax ID */}
                        <div className="charity-taxid">
                          <FileText size={13} style={{ flexShrink: 0 }} />
                          <span>เลขประจำตัวผู้เสียภาษี: {item.taxId}</span>
                        </div>

                        {/* Description */}
                        <p className="charity-desc">{item.description}</p>
                      </div>

                      <div>
                        {/* Quick Presets: 3 Presets (50, 100, 200) */}
                        <div className="charity-presets-grid" aria-label="เลือกยอดเงินบริจาคด่วน">
                          {[50, 100, 200].map((amt) => {
                            const bonus = Math.max(1, Math.floor(amt / 20));
                            return (
                              <button
                                key={amt}
                                type="button"
                                className="btn-card-preset"
                                onClick={() => handleOpenDonate(item, amt)}
                                aria-label={`บริจาค ${amt} บาท รับ ${bonus} Token`}
                                title={`บริจาค ${amt} บาทให้ ${item.name} รับ ${bonus} Impact Tokens`}
                              >
                                <span className="preset-amount">฿{amt}</span>
                                <span className="preset-token-tag">+{bonus} Token</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Primary Button (Min 50px height, Home page gradient) */}
                        <button
                          type="button"
                          className="btn-card-donate"
                          onClick={() => handleOpenDonate(item, 50)}
                          aria-label={`ร่วมบริจาคให้ ${item.name}`}
                        >
                          <HeartHandshake size={19} />
                          <span>ร่วมบริจาค (e-Donation)</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 2: DONATION STATEMENT HISTORY (TAB 2)
            ======================================================== */}
        {activeTab === 'HISTORY' && (
          <div className="history-card" style={{ marginTop: 0 }}>
            <div className="history-card-header">
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <Clock size={19} color="var(--bank-royal)" />
                  <span>ประวัติการบริจาคของคุณ ({history.length} รายการ)</span>
                </h2>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2, display: 'block' }}>
                  บันทึกการบริจาคและเลขอ้างอิง e-Donation กรมสรรพากร
                </span>
              </div>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 16px' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  <HeartHandshake size={24} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  ยังไม่มีประวัติการบริจาค
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 18 }}>
                  คุณสามารถเลือกมูลนิธิที่คุณไว้วางใจ และเริ่มต้นส่งต่อความช่วยเหลือได้ทันที
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('DONATE')}
                  style={{ maxWidth: 260, margin: '0 auto', minHeight: 48, fontSize: 14 }}
                >
                  <HeartHandshake size={18} />
                  <span>ไปเลือกมูลนิธิเพื่อบริจาค</span>
                </button>
              </div>
            ) : (
              <div>
                {history.map((h) => (
                  <div key={h.donationId} className="history-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 15.5, color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                        {h.charityName}
                      </strong>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{new Date(h.donatedAt).toLocaleString('th-TH')}</span>
                        <span>•</span>
                        <span style={{ color: 'var(--bank-royal)', fontWeight: 700, fontFamily: 'monospace' }}>
                          {h.edonationRef}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#DC2626' }}>
                        -฿{Number(h.amount).toFixed(2)}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          background: 'var(--fin-success-bg)',
                          color: 'var(--fin-success)',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontWeight: 700,
                          border: '1px solid var(--fin-success-border)'
                        }}
                      >
                        <CheckCircle2 size={12} /> สำเร็จ (e-Donation)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </main>

      {/* ========================================================
          7. DONATION CONFIRMATION & RECEIPT MODAL (MOBILE SLIDE-UP)
          ======================================================== */}
      {selectedCharity && (
        <div
          className="donation-modal-overlay"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-modal-title"
        >
          <div
            className="donation-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title" id="donation-modal-title">
                <HeartHandshake size={22} color="var(--bank-royal)" />
                <span>
                  {donationSuccess ? 'ใบเสร็จรับเงิน e-Donation' : 'ยืนยันการบริจาคเพื่อสังคม'}
                </span>
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

            {/* Error Message inside modal */}
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {/* VIEW A: Official Banking e-Slip (Shown when donation succeeded) */}
            {donationSuccess ? (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: 'var(--fin-success-bg)',
                    border: '1.5px solid var(--fin-success-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--fin-success)'
                  }}
                >
                  <CheckCircle2 size={34} />
                </div>

                <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  บริจาคสำเร็จเรียบร้อย
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ขอขอบคุณที่ร่วมสนับสนุน <strong>{donationSuccess.charityName}</strong>
                </p>

                {/* Receipt Card */}
                <div
                  style={{
                    background: 'var(--bg-app)',
                    border: '1.5px solid var(--bank-royal-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>มูลนิธิผู้รับเงิน:</span>
                    <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>
                      {donationSuccess.charityName}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>จำนวนเงินที่บริจาค:</span>
                    <strong style={{ color: '#DC2626', fontSize: 16 }}>
                      -฿{Number(donationSuccess.amount).toFixed(2)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ยอดคงเหลือในกระเป๋า:</span>
                    <strong style={{ color: 'var(--bank-royal)' }}>
                      ฿{Number(donationSuccess.remainingBalance).toFixed(2)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5, flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>เลขอ้างอิง e-Donation:</span>
                    <span style={{ color: 'var(--bank-royal)', fontWeight: 800, fontFamily: 'monospace' }}>
                      {donationSuccess.edonationRef}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 10, borderTop: '1px dashed var(--bank-royal-border)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Impact Tokens ที่ได้รับทันที:</span>
                    <span style={{ color: 'var(--bank-royal)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
                      <Coins size={16} color="var(--bank-royal)" />
                      +{donationSuccess.bonusTokensAwarded} Tokens
                    </span>
                  </div>
                </div>

                {/* Token Awarded Reassurance Alert */}
                <div
                  style={{
                    background: 'var(--bank-royal-light)',
                    border: '1px solid var(--bank-royal-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: 12.5,
                    color: 'var(--bank-royal)',
                    fontWeight: 600,
                    textAlign: 'left',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <CheckCircle2 size={16} color="var(--bank-royal)" style={{ flexShrink: 0 }} />
                  <span>
                    โอน +{donationSuccess.bonusTokensAwarded} Impact Tokens เข้ากระเป๋าของคุณเรียบร้อยแล้ว
                  </span>
                </div>

                {/* Receipt Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      background: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      border: '1.5px solid var(--border-light)',
                      boxShadow: 'none',
                      minHeight: 50,
                      fontSize: 14,
                      fontWeight: 700
                    }}
                    onClick={handleCloseModal}
                  >
                    เสร็จสิ้น
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      minHeight: 50,
                      fontSize: 14,
                      fontWeight: 700
                    }}
                    onClick={() => {
                      handleCloseModal();
                      setActiveTab('HISTORY');
                    }}
                  >
                    ดูประวัติการบริจาค
                  </button>
                </div>

                {/* Direct shortcut to rewards */}
                <div style={{ marginTop: 10 }}>
                  <Link
                    to="/rewards"
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: 'var(--bg-app)',
                      color: 'var(--bank-royal)',
                      border: '1.5px solid var(--bank-royal-border)',
                      boxShadow: 'none',
                      minHeight: 46,
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Coins size={15} color="var(--bank-royal)" />
                    <span>ไปหน้าแลกของรางวัลด้วย Impact Tokens</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              /* VIEW B: Checkout Confirmation Form */
              <div>
                {/* Foundation Summary Pill */}
                <div
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--bank-royal-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <img
                    src={selectedCharity.imageUrl || `/charities/charity-${selectedCharity.charityId}.jpg`}
                    alt={selectedCharity.name}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '1px solid var(--border-light)'
                    }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>
                      บริจาคช่วยเหลือให้แก่:
                    </span>
                    <strong style={{ fontSize: 15.5, color: 'var(--bank-royal)', display: 'block', wordBreak: 'break-word', marginTop: 2 }}>
                      {selectedCharity.name}
                    </strong>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'monospace' }}>
                      เลขประจำตัวผู้เสียภาษี: {selectedCharity.taxId}
                    </div>
                  </div>
                </div>

                {/* Amount Selection */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>
                      เลือกจำนวนเงินบริจาค (บาท) <span className="req">*</span>
                    </label>
                    {customAmount && (
                      <span style={{ fontSize: 12, color: 'var(--bank-royal)', fontWeight: 600 }}>
                        (กำลังระบุยอดเอง)
                      </span>
                    )}
                  </div>

                  {/* 5 Preset Buttons (Min 52px height with token hint) */}
                  <div className="donation-preset-grid">
                    {[20, 50, 100, 200, 500].map((amt) => {
                      const isSelected = !customAmount && donationAmount === amt;
                      const bonus = Math.max(1, Math.floor(amt / 20));
                      return (
                        <button
                          key={amt}
                          type="button"
                          className={`btn-modal-preset ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setDonationAmount(amt);
                            setCustomAmount('');
                            setError('');
                          }}
                          aria-pressed={isSelected}
                        >
                          <span className="preset-amount">฿{amt}</span>
                          <span className="preset-token-hint">+{bonus} Token</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input Field with Currency Prefix and 1-tap Clear */}
                  <div className="custom-amount-wrapper">
                    <span className="custom-amount-currency">฿</span>
                    <input
                      ref={customAmountInputRef}
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`custom-amount-input ${customAmount ? 'has-value' : ''}`}
                      placeholder="หรือพิมพ์ระบุจำนวนเงินเอง (บาท)"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setError('');
                      }}
                      min={1}
                      aria-label="พิมพ์ระบุจำนวนเงินบริจาคเอง"
                    />
                    {customAmount && (
                      <button
                        type="button"
                        className="custom-amount-clear-btn"
                        onClick={() => {
                          setCustomAmount('');
                          setDonationAmount(50);
                          setError('');
                        }}
                        title="ล้างข้อมูลจำนวนเงิน"
                        aria-label="ล้างข้อมูลจำนวนเงิน"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Balance & Math Box */}
                <div
                  style={{
                    background: effectiveAmount === 0 ? 'var(--bg-app)' : (isBalanceSufficient ? '#F8FAFC' : '#FEF2F2'),
                    border: `1.5px solid ${effectiveAmount === 0 ? 'var(--border-light)' : (isBalanceSufficient ? 'var(--border-light)' : '#FECACA')}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 14,
                    marginBottom: 16
                  }}
                >
                  {effectiveAmount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6px 4px', color: 'var(--text-secondary)', fontSize: 13 }}>
                      กดเลือกจำนวนเงินด้านบน หรือพิมพ์ยอดเงินที่ต้องการบริจาค
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>ยอดเงินในกระเป๋าของคุณ:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>฿{userBalance.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>ยอดที่จะบริจาค:</span>
                        <strong style={{ color: '#DC2626' }}>-฿{effectiveAmount.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700, paddingTop: 8, borderTop: '1px dashed var(--border-light)' }}>
                        <span>ยอดคงเหลือหลังบริจาค:</span>
                        <span style={{ color: isBalanceSufficient ? 'var(--bank-royal)' : '#DC2626' }}>
                          ฿{remainingBalanceAfterDonation.toFixed(2)} {!isBalanceSufficient && '(เงินไม่พอ)'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Clean Instant Token Reward Preview (Banking Style) */}
                  {effectiveAmount > 0 && (
                    <div className="modal-token-preview-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="modal-token-preview-icon">
                          <Coins size={16} color="var(--bank-royal)" />
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bank-royal)', display: 'block' }}>
                            ได้รับ Impact Tokens:
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            ทุก 20 บาท = 1 Token
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: 16, color: 'var(--bank-royal)', fontWeight: 800 }}>
                          +{expectedBonusTokens} Token
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Non-Tech friendly: Direct Topup Button when balance is low */}
                  {!isBalanceSufficient && effectiveAmount > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: '#DC2626', fontWeight: 600 }}>
                        ยอดเงินไม่พอสำหรับการบริจาค
                      </span>
                      <button
                        type="button"
                        className="btn-wallet-topup"
                        onClick={() => handleTopupWallet(500)}
                        style={{ minHeight: 38, padding: '6px 14px', fontSize: 12.5 }}
                      >
                        <PlusCircle size={15} />
                        <span>+ เติมเงินจำลอง ฿500 ทันที</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* e-Donation Checkbox Row */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    marginBottom: 20,
                    background: 'var(--bg-app)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requestEDonation}
                    onChange={(e) => setRequestEDonation(e.target.checked)}
                    style={{ marginTop: 2, width: 20, height: 20, accentColor: 'var(--bank-royal)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span>
                    ขอรับเลขอ้างอิง <strong>e-Donation</strong> ส่งข้อมูลตรงยังกรมสรรพากรเพื่อใช้สิทธิลดหย่อนภาษีเงินได้บุคคลธรรมดาอัตโนมัติ (ไม่ต้องเก็บเอกสารกระดาษ)
                  </span>
                </label>

                {/* Action Buttons: Confirm & Cancel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-card-donate"
                    onClick={handleConfirmDonation}
                    disabled={donating || !isBalanceSufficient || effectiveAmount <= 0}
                    style={{
                      minHeight: 52,
                      fontSize: 16,
                      opacity: (donating || !isBalanceSufficient || effectiveAmount <= 0) ? 0.65 : 1,
                      cursor: (donating || !isBalanceSufficient || effectiveAmount <= 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {donating ? (
                      <>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                        <span>กำลังประมวลผลการบริจาค...</span>
                      </>
                    ) : effectiveAmount <= 0 ? (
                      <>
                        <HeartHandshake size={20} />
                        <span>กรุณาระบุจำนวนเงินบริจาค</span>
                      </>
                    ) : !isBalanceSufficient ? (
                      <>
                        <AlertCircle size={20} />
                        <span>ยอดเงินไม่พอ (ขาดอีก ฿{(effectiveAmount - userBalance).toFixed(2)})</span>
                      </>
                    ) : (
                      <>
                        <HeartHandshake size={20} />
                        <span>
                          ยืนยันการบริจาค ฿{effectiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {expectedBonusTokens > 0 && ` (รับ +${expectedBonusTokens} Token)`}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    style={{
                      minHeight: 46,
                      background: 'transparent',
                      border: '1.5px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={handleCloseModal}
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
