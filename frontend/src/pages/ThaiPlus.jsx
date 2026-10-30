import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Wallet,
  User,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  Gift,
  Grid,
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  PlusCircle,
  Trophy,
  Sparkles,
  Info,
  Coins,
  Ticket,
  Clock,
  ShoppingBag,
  RotateCw,
  Copy,
  Check,
  Crown,
  Flame,
  Zap,
  PartyPopper,
  Tag,
  Truck,
  X,
  AlertCircle,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

export default function ThaiPlus() {
  const { tokens, setTokensBalance, addTokens } = useAuth();
  const location = useLocation();

  // Helper to resolve active tab from URL path and search params
  const resolveTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = (params.get('tab') || '').toLowerCase();
    if (tabParam === 'draw' || tabParam === 'luckydraw' || tabParam === 'spin') return 'LUCKY_DRAW';
    if (tabParam === 'items' || tabParam === 'vouchers') return 'MY_ITEMS';
    if (tabParam === 'history') return 'HISTORY';
    if (tabParam === 'rewards' || location.pathname === '/rewards') return 'REWARDS';
    return 'REWARDS';
  };

  // Active Tab: 'REWARDS' | 'MY_ITEMS' | 'LUCKY_DRAW' | 'HISTORY'
  const [activeTab, setActiveTab] = useState(resolveTab);

  // Sub-tab for Lucky Draw tab: 'CAMPAIGN' | 'WHEEL'
  const [luckySubTab, setLuckySubTab] = useState('CAMPAIGN');

  // Eye toggle for tokens balance (matching Home page's signature G-Wallet card)
  const [showBalance, setShowBalance] = useState(true);

  // Sync activeTab when location path or search changes
  useEffect(() => {
    setActiveTab(resolveTab());
    const params = new URLSearchParams(location.search);
    if ((params.get('tab') || '').toLowerCase() === 'spin') {
      setLuckySubTab('WHEEL');
    }
  }, [location.pathname, location.search]);

  // Rewards and campaign state
  const [rewards, setRewards] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccessMsg, setFaucetSuccessMsg] = useState('');

  // Sub-filter for rewards tab ('ALL' | 'COUPON' | 'PHYSICAL')
  const [rewardFilter, setRewardFilter] = useState('ALL');

  // Lucky Draw Entry State
  const [selectedPackage, setSelectedPackage] = useState(1); // 1, 3, or 5 tickets
  const [enteringDraw, setEnteringDraw] = useState(false);
  const [drawSuccessData, setDrawSuccessData] = useState(null);

  // Reward Redemption State
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccessData, setRedeemSuccessData] = useState(null);
  const [viewVoucherModal, setViewVoucherModal] = useState(null);

  // Spin Wheel State
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState(null);

  // User's Local Vouchers & Tickets
  const [myTickets, setMyTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('user_thaiplus_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [myVouchers, setMyVouchers] = useState(() => {
    try {
      const saved = localStorage.getItem('user_thaiplus_vouchers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Token Transaction History from API
  const [tokenHistory, setTokenHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Copied code feedback state
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch initial rewards, campaign, and user redemptions from DB on mount
  useEffect(() => {
    fetchRewards();
    fetchMyRedemptions();
  }, []);

  // Sync tickets & vouchers to localStorage
  useEffect(() => {
    localStorage.setItem('user_thaiplus_tickets', JSON.stringify(myTickets));
  }, [myTickets]);

  useEffect(() => {
    localStorage.setItem('user_thaiplus_vouchers', JSON.stringify(myVouchers));
  }, [myVouchers]);

  // Load history when switching to HISTORY tab or redemptions when switching to MY_ITEMS
  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchTokenHistory();
    } else if (activeTab === 'MY_ITEMS') {
      fetchMyRedemptions();
    }
  }, [activeTab]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rewards');
      if (res.data && res.data.success) {
        setRewards(res.data.data.rewards);
        setCampaign(res.data.data.luckyDrawCampaign);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError('ไม่สามารถโหลดข้อมูลของรางวัลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/rewards/my-history');
      if (res.data && res.data.success) {
        setTokenHistory(res.data.data.history || []);
        if (res.data.data.totalTokens !== undefined) {
          setTokensBalance(res.data.data.totalTokens);
        }
      }
    } catch (err) {
      console.error('Error fetching token history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch user's redeemed vouchers & tickets directly from MySQL Database
  const fetchMyRedemptions = async () => {
    try {
      const res = await api.get('/rewards/my-redemptions');
      if (res.data && res.data.success && res.data.data) {
        if (Array.isArray(res.data.data.vouchers)) {
          setMyVouchers(res.data.data.vouchers);
        }
        if (Array.isArray(res.data.data.tickets)) {
          setMyTickets(res.data.data.tickets);
        }
      }
    } catch (err) {
      console.warn('Could not fetch user redemptions from DB:', err.message);
    }
  };

  // Simulate using voucher at merchant
  const handleUseVoucher = async (voucherCode) => {
    if (!voucherCode) return;
    try {
      const res = await api.post('/rewards/use-voucher', { voucherCode });
      if (res.data && res.data.success) {
        alert(res.data.message || 'ใช้งานคูปองสำเร็จเรียบร้อยแล้ว');
        if (viewVoucherModal) {
          setViewVoucherModal((prev) => prev ? { ...prev, status: 'USED', usedAt: new Date().toISOString() } : null);
        }
        fetchMyRedemptions();
      }
    } catch (err) {
      console.error('Error using voucher:', err);
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาดในการใช้งานคูปอง';
      alert(msg);
    }
  };

  // Test faucet: Free +50 tokens for users to easily test redemption
  const handleFaucetTokens = async () => {
    try {
      setFaucetLoading(true);
      setFaucetSuccessMsg('');
      const res = await api.post('/rewards/demo-faucet');
      if (res.data && res.data.success) {
        setTokensBalance(res.data.data.totalTokens);
        setFaucetSuccessMsg('+50 Tokens สำเร็จ!');
        setTimeout(() => setFaucetSuccessMsg(''), 3000);
      } else {
        alert(res.data.error || 'เกิดข้อผิดพลาดในการเติมเหรียญ');
      }
    } catch (err) {
      console.error('Faucet error:', err);
      // Fallback local update
      if (typeof addTokens === 'function') {
        addTokens(50);
        setFaucetSuccessMsg('+50 Tokens สำเร็จ!');
        setTimeout(() => setFaucetSuccessMsg(''), 3000);
      } else {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    } finally {
      setFaucetLoading(false);
    }
  };

  // Lucky Draw Entry
  const handleConfirmLuckyDraw = async (ticketCount) => {
    const costMap = { 1: 25, 3: 60, 5: 90 };
    const requiredTokens = costMap[ticketCount] || ticketCount * 25;

    if (tokens < requiredTokens) {
      alert(`คุณมีแต้มไม่เพียงพอ (ต้องการ ${requiredTokens} Tokens แต่คุณมี ${tokens} Tokens) คุณสามารถกดรับแต้มฟรี 50 Tokens ด้านบนเพื่อทดลองได้`);
      return;
    }

    try {
      setEnteringDraw(true);
      const res = await api.post('/rewards/lucky-draw', {
        ticketsCount: ticketCount,
        rewardId: 'luckydraw-gold-1',
      });

      if (res.data && res.data.success) {
        const { tickets, remainingTokens, drawDate } = res.data.data;
        setTokensBalance(remainingTokens);

        const newTickets = tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          campaignTitle: 'โครงการสลากดิจิทัลไทยช่วยไทยพลัส',
          drawDate: drawDate,
          issuedAt: new Date().toISOString(),
        }));

        setMyTickets((prev) => [...newTickets, ...prev]);
        setDrawSuccessData({
          ticketsCount: ticketCount,
          tickets: newTickets,
          drawDate: drawDate,
        });
      } else {
        alert(res.data.error || 'ไม่สามารถลงชื่อชิงโชคได้');
      }
    } catch (err) {
      console.error('Error entering lucky draw:', err);
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาดในการลงชื่อชิงโชค';
      alert(msg);
    } finally {
      setEnteringDraw(false);
    }
  };

  // Confirm Redeem Modal Action
  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;

    if (tokens < selectedReward.tokenCost) {
      alert(`คุณมีแต้มไม่เพียงพอสำหรับของรางวัลนี้ (ต้องการ ${selectedReward.tokenCost} Tokens)`);
      setSelectedReward(null);
      return;
    }

    try {
      setRedeeming(true);
      const res = await api.post('/rewards/redeem', {
        rewardId: selectedReward.rewardId,
        deliveryAddress: selectedReward.rewardType === 'PHYSICAL' ? 'ที่อยู่ตามฐานข้อมูลผู้ลงทะเบียนคนละครึ่ง' : undefined,
      });

      if (res.data && res.data.success) {
        const voucherData = res.data.data;
        setTokensBalance(voucherData.remainingTokens);

        const newVoucher = {
          ...voucherData,
          category: selectedReward.category,
          partner: selectedReward.partner,
        };

        setMyVouchers((prev) => [newVoucher, ...prev]);
        setRedeemSuccessData(newVoucher);
        setSelectedReward(null);
        fetchMyRedemptions();
      } else {
        alert(res.data.error || 'เกิดข้อผิดพลาดในการแลกของรางวัล');
      }
    } catch (err) {
      console.error('Error redeeming reward:', err);
      const msg = err.response?.data?.error || 'ไม่สามารถแลกของรางวัลได้';
      alert(msg);
    } finally {
      setRedeeming(false);
    }
  };

  // Instant Spin Wheel
  const handleSpinWheel = async () => {
    if (spinning) return;
    const spinCost = 15;

    if (tokens < spinCost) {
      alert(`คุณต้องมีอย่างน้อย ${spinCost} Tokens เพื่อหมุนวงล้อเสี่ยงโชค (คุณมี ${tokens} Tokens) คุณสามารถกดรับแต้มฟรี 50 Tokens ด้านบนได้`);
      return;
    }

    try {
      setSpinning(true);
      setSpinResult(null);

      const res = await api.post('/rewards/instant-spin');
      if (res.data && res.data.success) {
        const { outcomeIndex, prize, remainingTokens } = res.data.data;

        // Calculate rotation degrees (6 sectors = 60 deg each)
        const sectorAngle = 60;
        const targetSectorCenter = outcomeIndex * sectorAngle + 30;
        const newRotation = wheelRotation + 1800 + (360 - (targetSectorCenter % 360));
        setWheelRotation(newRotation);

        // Wait 3.6s for spin animation to finish
        setTimeout(() => {
          setTokensBalance(remainingTokens);
          setSpinResult(prize);
          setSpinning(false);

          if (prize.type === 'LUCKY_TICKETS') {
            const bonusTicket = {
              ticketNumber: 'TP-WHEEL-' + Math.floor(100000 + Math.random() * 900000),
              campaignTitle: 'รางวัลจากวงล้อเสี่ยงโชคไทยช่วยไทยพลัส',
              issuedAt: new Date().toISOString(),
              drawDate: '31 มีนาคม 2026',
            };
            setMyTickets((prev) => [bonusTicket, ...prev]);
          } else if (prize.type === 'COUPON') {
            const bonusVoucher = {
              rewardName: prize.label,
              rewardType: 'COUPON',
              voucherCode: 'TP-WHEEL-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
              barcodeNumber: '885' + Math.floor(100000000 + Math.random() * 900000000),
              redeemedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              instructions: 'แสดงรหัสนี้เพื่อรับสิทธิพิเศษที่ร้านค้าชุมชนที่ร่วมรายการ',
            };
            setMyVouchers((prev) => [bonusVoucher, ...prev]);
          }
        }, 3600);
      } else {
        setSpinning(false);
        alert(res.data.error || 'หมุนวงล้อไม่สำเร็จ');
      }
    } catch (err) {
      setSpinning(false);
      console.error('Spin error:', err);
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาดในการหมุนวงล้อ';
      alert(msg);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredRewards = rewards.filter((r) => {
    if (rewardFilter === 'ALL') return r.rewardType !== 'LUCKY_DRAW';
    return r.rewardType === rewardFilter;
  });

  return (
    <div className="thaiplus-page-wrap">
      {/* Official App Header */}
      <Navbar />

      {/* Main Banking & Rewards App Shell */}
      <main className="home-container" id="main-content">
        {/* Screen Reader Title for Accessibility & Test Compatibility */}
        <h1 className="thaiplus-page-title sr-only">
          แลกของรางวัล
        </h1>

        {/* ========================================================
            1. SIGNATURE G-WALLET / FINANCIAL ACCOUNT CARD (HOME STYLE)
            ======================================================== */}
        <section className="financial-wallet-card" aria-label="บัตรกระเป๋าเหรียญรางวัลและสิทธิประโยชน์">
          {/* Balance Section with Big Accessible Font and Eye Toggle */}
          <div className="wallet-balance-row">
            <div>
              <div className="wallet-balance-title">
                <span>เหรียญ Impact Tokens สะสมพร้อมใช้</span>
                <button
                  type="button"
                  className="btn-toggle-balance"
                  onClick={() => setShowBalance(!showBalance)}
                  title={showBalance ? 'ซ่อนยอดเหรียญ' : 'แสดงยอดเหรียญ'}
                  aria-label={showBalance ? 'ซ่อนยอดเหรียญ' : 'แสดงยอดเหรียญ'}
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="wallet-balance-amount thaiplus-balance-value">
                {showBalance ? (
                  <>
                    <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{tokens}</span>{' '}
                    <span style={{ color: '#FDE047', fontWeight: 700, fontSize: '0.85em' }}>Tokens</span>
                  </>
                ) : (
                  <span style={{ color: '#FFFFFF' }}>•••••• Tokens</span>
                )}
              </div>
            </div>

            {/* Test Faucet Button - Home Pill Style with min 48px target */}
            <button
              type="button"
              className="btn-wallet-topup btn-faucet-action"
              onClick={handleFaucetTokens}
              disabled={faucetLoading}
              title="รับ 50 Tokens ฟรีสำหรับการทดสอบระบบ"
              aria-label="กดรับ 50 Tokens ฟรีสำหรับการทดสอบระบบ"
            >
              {faucetLoading ? (
                <>
                  <RotateCw size={17} className="animate-spin" />
                  <span>กำลังเติมแต้ม...</span>
                </>
              ) : (
                <>
                  <Zap size={17} />
                  <span>{faucetSuccessMsg || '+ รับ 50 Tokens ฟรี'}</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Meta Grid: Tickets & Redeemed Items Counter */}
          <div className="wallet-meta-grid">
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">สลากชิงโชคดิจิทัลที่ถืออยู่</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Ticket size={16} color="#FDE68A" />
                <span className="wallet-meta-value">{myTickets.length} สิทธิ์</span>
              </div>
            </div>
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">ของรางวัลและคูปองที่แลกแล้ว</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingBag size={16} color="#FDE68A" />
                  <span className="wallet-meta-value" style={{ color: '#FDE68A' }}>
                    {myVouchers.length} รายการ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('MY_ITEMS')}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FEF3C7',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    minHeight: 30,
                    whiteSpace: 'nowrap'
                  }}
                  title="ไปที่ของรางวัลที่ฉันแลกแล้ว"
                >
                  <span>ดูของฉัน</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            2. HERO ACTION / PROMO CARD FOR CITIZENS (HOME STYLE)
            ======================================================== */}
        <div
          className="hero-scan-card"
          onClick={() => {
            setActiveTab('LUCKY_DRAW');
            setLuckySubTab('CAMPAIGN');
          }}
          role="button"
          tabIndex={0}
          aria-label="ชิงโชคทองคำแท่งและ iPhone 16 แตะเพื่อไปหน้าส่งสิทธิ์"
          style={{ cursor: 'pointer', marginBottom: 20 }}
        >
          <div className="hero-scan-left">
            <div className="hero-scan-icon-wrap" style={{ background: '#FEF3C7', color: '#B45309' }}>
              <Crown size={28} strokeWidth={2.4} />
            </div>
            <div>
              <div className="hero-scan-title">
                ชิงโชคทองคำแท่ง 1 บาท & iPhone 16 Pro
              </div>
              <div className="hero-scan-desc">
                จับรางวัล 31 มี.ค. 2026 ส่งสิทธิ์เพียง 25 Tokens หรือหมุนวงล้อเสี่ยงโชค 15 Tokens
              </div>
            </div>
          </div>
          <div className="hero-scan-btn" style={{ background: '#FEF3C7', color: '#B45309' }}>
            <span>ร่วมลุ้นโชค</span>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* ========================================================
            3. BANKING QUICK ACTION GRID (HOME STYLE 4-THUMB NAVIGATION)
            ======================================================== */}
        <div className="financial-quick-grid" role="tablist" aria-label="เมนูหลักการแลกรางวัล">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'REWARDS'}
            className={`quick-action-item thaiplus-nav-btn ${activeTab === 'REWARDS' ? 'active' : ''}`}
            onClick={() => setActiveTab('REWARDS')}
            aria-label="แท็บแลกของรางวัล"
          >
            <div className="quick-action-icon-box" style={{ background: activeTab === 'REWARDS' ? '#DBEAFE' : '#FEF3C7', color: '#B45309' }}>
              <Gift size={22} />
            </div>
            <span className="quick-action-label">แลกของรางวัล</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'MY_ITEMS'}
            className={`quick-action-item thaiplus-nav-btn ${activeTab === 'MY_ITEMS' ? 'active' : ''}`}
            onClick={() => setActiveTab('MY_ITEMS')}
            aria-label="แท็บของที่ฉันแลกแล้ว"
          >
            <div className="quick-action-icon-box" style={{ background: activeTab === 'MY_ITEMS' ? '#DBEAFE' : '#ECFDF5', color: '#047857', position: 'relative' }}>
              <ShoppingBag size={22} />
              {(myTickets.length + myVouchers.length) > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    background: 'var(--bank-royal)',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 999,
                    lineHeight: 1.2
                  }}
                >
                  {myTickets.length + myVouchers.length}
                </span>
              )}
            </div>
            <span className="quick-action-label">ของที่ฉันแลกแล้ว</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'LUCKY_DRAW'}
            className={`quick-action-item thaiplus-nav-btn ${activeTab === 'LUCKY_DRAW' ? 'active' : ''}`}
            onClick={() => setActiveTab('LUCKY_DRAW')}
            aria-label="แท็บลุ้นโชคและวงล้อ"
          >
            <div className="quick-action-icon-box" style={{ background: activeTab === 'LUCKY_DRAW' ? '#DBEAFE' : '#FEE2E2', color: '#B91C1C' }}>
              <Ticket size={22} />
            </div>
            <span className="quick-action-label">ลุ้นโชค & วงล้อ</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'HISTORY'}
            className={`quick-action-item thaiplus-nav-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
            aria-label="แท็บประวัติแต้ม"
          >
            <div className="quick-action-icon-box" style={{ background: activeTab === 'HISTORY' ? '#DBEAFE' : '#EFF6FF', color: '#1E40AF' }}>
              <Clock size={22} />
            </div>
            <span className="quick-action-label">ประวัติแต้ม</span>
          </button>
        </div>

        {/* ====================================================
            TAB 1: REWARDS CATALOGUE (แลกของรางวัล)
            ==================================================== */}
        {activeTab === 'REWARDS' && (
          <div>
            {/* Filter Pills with Counts */}
            <div className="reward-filter-bar" role="tablist" aria-label="ตัวกรองประเภทของรางวัล">
              <button
                type="button"
                onClick={() => setRewardFilter('ALL')}
                className={`reward-filter-btn ${rewardFilter === 'ALL' ? 'active' : ''}`}
              >
                <span>ทั้งหมด</span>
                <span>({rewards.filter((r) => r.rewardType !== 'LUCKY_DRAW').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRewardFilter('COUPON')}
                className={`reward-filter-btn ${rewardFilter === 'COUPON' ? 'active' : ''}`}
              >
                <Tag size={15} />
                <span>คูปองร้านค้า</span>
                <span>({rewards.filter((r) => r.rewardType === 'COUPON').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRewardFilter('PHYSICAL')}
                className={`reward-filter-btn ${rewardFilter === 'PHYSICAL' ? 'active' : ''}`}
              >
                <Truck size={15} />
                <span>สินค้าส่งถึงบ้าน</span>
                <span>({rewards.filter((r) => r.rewardType === 'PHYSICAL').length})</span>
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={fetchRewards}
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#991B1B',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {/* Rewards Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14.5 }}>กำลังโหลดรายการของรางวัล...</p>
              </div>
            ) : filteredRewards.length === 0 ? (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px dashed var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 36,
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <Gift size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>ไม่พบรายการในหมวดหมู่นี้</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>ลองเลือกดูหมวดหมู่อื่นเพื่อค้นหาของรางวัลที่คุณต้องการ</p>
              </div>
            ) : (
              <div className="rewards-grid">
                {filteredRewards.map((reward) => {
                  const canAfford = tokens >= reward.tokenCost;
                  const isCoupon = reward.rewardType === 'COUPON';

                  return (
                    <div
                      key={reward.rewardId}
                      className={`reward-card ${isCoupon ? 'type-coupon' : 'type-physical'}`}
                    >
                      <div className="reward-card-header">
                        <span className={`reward-tag-badge ${isCoupon ? 'tag-coupon' : 'tag-physical'}`}>
                          {isCoupon ? <Tag size={13} /> : <Truck size={13} />}
                          <span>{reward.tag || (isCoupon ? 'คูปองดิจิทัล' : 'สินค้าพรีเมียม')}</span>
                        </span>

                        <div className="reward-cost-pill">
                          <Coins size={15} />
                          <span style={{ whiteSpace: 'nowrap' }}>{reward.tokenCost} Tokens</span>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="reward-card-image-wrap">
                        {reward.imageUrl ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="reward-card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="reward-card-img-fallback"
                          style={{ display: reward.imageUrl ? 'none' : 'flex' }}
                        >
                          {isCoupon ? (
                            <Tag size={42} color="#1D4ED8" />
                          ) : (
                            <ShoppingBag size={42} color="#059669" />
                          )}
                        </div>
                      </div>

                      <div className="reward-card-body">
                        <h3 className="reward-card-title">{reward.name}</h3>
                        <p className="reward-card-desc">{reward.description}</p>

                        <div className="reward-card-meta">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <ShieldCheck size={14} color={isCoupon ? '#1D4ED8' : '#059669'} />
                            <span>{reward.partner}</span>
                          </div>
                          {!isCoupon && (
                            <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Check size={14} /> ส่งฟรี
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="reward-card-footer">
                        {/* Full Width 48px Thumb Action Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedReward(reward)}
                          className={`btn-redeem-action ${
                            canAfford
                              ? isCoupon
                                ? 'active-coupon'
                                : 'active-physical'
                              : 'disabled-lacking'
                          }`}
                          disabled={!canAfford}
                          aria-label={`แลกรางวัล ${reward.name} ใช้ ${reward.tokenCost} Tokens`}
                        >
                          <Gift size={16} />
                          <span>
                            {canAfford
                              ? `แลกรางวัลนี้ (ใช้ ${reward.tokenCost} Tokens)`
                              : 'Tokens ไม่พอ'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            TAB 2: MY ITEMS (ของที่ฉันแลกแล้ว)
            Immediate access to vouchers, barcodes and lucky tickets
            ==================================================== */}
        {activeTab === 'MY_ITEMS' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Active Digital Vouchers Section */}
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gift size={20} color="#1D4ED8" />
                  <span>คูปองและของรางวัลที่แลกแล้ว ({myVouchers.length} รายการ)</span>
                </h2>

                {myVouchers.length === 0 ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px dashed var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Gift size={40} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>คุณยังไม่มีคูปองที่แลกไว้</p>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                      ใช้เหรียญแต้ม Impact Tokens เพื่อแลกรับคูปองส่วนลดร้านค้าหรือสินค้าชุมชนได้ทันที
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('REWARDS')}
                      style={{
                        background: 'var(--bank-royal)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 24px',
                        minHeight: 48,
                        fontSize: 14.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Gift size={16} />
                      <span>ไปเลือกแลกรางวัล</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
                    {myVouchers.map((v, idx) => (
                      <div key={idx} className="voucher-card-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                }}
                              >
                                {v.rewardType === 'PHYSICAL' ? 'สินค้าส่งถึงบ้าน' : 'คูปองดิจิทัล'}
                              </span>
                              {v.status === 'USED' ? (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: '#F1F5F9',
                                    color: '#64748B',
                                  }}
                                >
                                  ใช้งานแล้ว
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: '#ECFDF5',
                                    color: '#059669',
                                  }}
                                >
                                  พร้อมใช้งาน
                                </span>
                              )}
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                              {v.rewardName}
                            </h3>
                          </div>
                        </div>

                        {/* Code Display with One-Tap Copy */}
                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>รหัสคูปอง:</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#1E40AF', letterSpacing: 1 }}>
                              {v.voucherCode}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.voucherCode)}
                            style={{
                              background: copiedCode ? '#ECFDF5' : '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '8px 12px',
                              minHeight: 40,
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: copiedCode ? '#059669' : '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                          </button>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {v.instructions || 'แสดงรหัสนี้แก่พนักงานที่หน้าร้านเพื่อรับสิทธิพิเศษ'}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                            หมดอายุ: {new Date(v.expiresAt).toLocaleDateString('th-TH')}
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewVoucherModal(v)}
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              borderRadius: 'var(--radius-sm)',
                              padding: '8px 12px',
                              minHeight: 40,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <QrCode size={15} />
                            <span>แสดงบาร์โค้ด</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Lucky Tickets Section */}
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ticket size={20} color="#DC2626" />
                  <span>สลากชิงโชคดิจิทัลของฉัน ({myTickets.length} สิทธิ์)</span>
                </h2>

                {myTickets.length === 0 ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px dashed var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <p style={{ fontSize: 14 }}>คุณยังไม่มีสิทธิ์ชิงโชคในรอบนี้</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('LUCKY_DRAW');
                        setLuckySubTab('CAMPAIGN');
                      }}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 18px',
                        minHeight: 44,
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: 8,
                      }}
                    >
                      ไปส่งสิทธิ์ชิงโชคเลย
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    {myTickets.map((t, idx) => (
                      <div key={idx} className="ticket-container">
                        <div>
                          <div style={{ fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>
                            {t.campaignTitle || 'ไทยช่วยไทยพลัส สัญจรลุ้นโชคใหญ่'}
                          </div>
                          <div className="ticket-number">{t.ticketNumber}</div>
                          <div style={{ fontSize: 11, color: '#78350F', marginTop: 2 }}>
                            จับรางวัล: {t.drawDate || '31 มีนาคม 2026'}
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F59E0B',
                            color: '#FFFFFF',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 3: LUCKY DRAW & SPIN WHEEL (ลุ้นโชค & วงล้อ)
            Senior-friendly: 2 clean toggles
            ==================================================== */}
        {activeTab === 'LUCKY_DRAW' && (
          <div>
            {/* Sub-tab Switcher: Campaign vs Spin Wheel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                className={`reward-filter-btn ${luckySubTab === 'CAMPAIGN' ? 'active' : ''}`}
                onClick={() => setLuckySubTab('CAMPAIGN')}
                style={{ flex: 'initial', minHeight: 48 }}
              >
                <Crown size={17} />
                <span>ชิงโชคทองคำประจำงวด</span>
              </button>

              <button
                type="button"
                className={`reward-filter-btn ${luckySubTab === 'WHEEL' ? 'active' : ''}`}
                onClick={() => setLuckySubTab('WHEEL')}
                style={{ flex: 'initial', minHeight: 48 }}
              >
                <RotateCw size={17} />
                <span>วงล้อเสี่ยงโชค (15 แต้ม)</span>
              </button>
            </div>

            {/* SUB-VIEW 1: GRAND LUCKY DRAW CAMPAIGN */}
            {luckySubTab === 'CAMPAIGN' && (
              <div>
                {campaign && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #FDE68A',
                      borderRadius: 'var(--radius-xl)',
                      padding: '22px 18px',
                      boxShadow: 'var(--shadow-sm)',
                      marginBottom: 24,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                      <div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#FEF3C7',
                            color: '#92400E',
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          <Crown size={14} color="#D97706" />
                          <span>{campaign.title}</span>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                          ลุ้นรับทองคำแท่ง 1 บาท และ iPhone 16 Pro
                        </h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          จับรางวัล: <strong style={{ color: '#DC2626' }}>{campaign.drawDate}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Prizes Showcase */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 10,
                        marginBottom: 20,
                      }}
                    >
                      {campaign.prizes.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: idx === 0 ? '#FEF3C7' : '#EFF6FF',
                              color: idx === 0 ? '#D97706' : '#2563EB',
                              fontWeight: 800,
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            #{p.rank}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              มูลค่า {p.value} ({p.quantity} รางวัล)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Package Selector */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        เลือกแพ็กเกจส่งสิทธิ์ชิงโชค
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        ระบบจะออกหมายเลขสลากดิจิทัลและจัดเก็บเข้ากระเป๋าสิทธิ์ของคุณอัตโนมัติ
                      </div>

                      <div className="lucky-package-grid">
                        {campaign.packages.map((pkg) => {
                          const isSelected = selectedPackage === pkg.tickets;
                          return (
                            <button
                              key={pkg.tickets}
                              type="button"
                              className="lucky-pkg-btn"
                              onClick={() => setSelectedPackage(pkg.tickets)}
                              style={{
                                border: isSelected ? '2px solid #DC2626' : '1.5px solid #CBD5E1',
                                background: isSelected ? '#FEF2F2' : '#FFFFFF',
                                color: isSelected ? '#B91C1C' : '#334155',
                              }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{pkg.label}</div>
                              {pkg.badge && (
                                <span style={{ fontSize: 10.5, color: isSelected ? '#DC2626' : '#D97706', fontWeight: 700 }}>
                                  {pkg.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmLuckyDraw(selectedPackage)}
                        disabled={enteringDraw}
                        style={{
                          width: '100%',
                          minHeight: 50,
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 20px',
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          touchAction: 'manipulation',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Ticket size={18} />
                        <span>
                          {enteringDraw
                            ? 'กำลังส่งสิทธิ์...'
                            : `ยืนยันลงชื่อลุ้นโชค (${
                                selectedPackage === 1 ? 25 : selectedPackage === 3 ? 60 : 90
                              } Tokens)`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional Individual Lucky Draw Rewards */}
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#D97706" />
                  <span>หรือเลือกลงชื่อชิงโชคเฉพาะรายการ:</span>
                </h3>

                <div className="rewards-grid">
                  {rewards
                    .filter((r) => r.rewardType === 'LUCKY_DRAW')
                    .map((item) => (
                      <div key={item.rewardId} className="reward-card" style={{ borderTop: '4px solid #D97706' }}>
                        <div className="reward-card-header">
                          <span className="reward-tag-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                            {item.tag}
                          </span>
                          <div className="reward-cost-pill">
                            <Coins size={14} />
                            <span style={{ whiteSpace: 'nowrap' }}>{item.tokenCost} Tokens / สิทธิ์</span>
                          </div>
                        </div>

                        {/* Prize Image */}
                        <div className="reward-card-image-wrap">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="reward-card-img"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="reward-card-img-fallback"
                            style={{ display: item.imageUrl ? 'none' : 'flex' }}
                          >
                            <Crown size={42} color="#D97706" />
                          </div>
                        </div>

                        <div className="reward-card-body">
                          <h4 className="reward-card-title">{item.name}</h4>
                          <p className="reward-card-desc">{item.description}</p>
                        </div>

                        <div className="reward-card-footer">
                          <button
                            type="button"
                            onClick={() => handleConfirmLuckyDraw(1)}
                            className="btn-redeem-action"
                            style={{ background: '#DC2626', color: '#FFFFFF' }}
                          >
                            <Ticket size={16} />
                            <span>ส่ง 1 สิทธิ์ลุ้นรางวัลนี้ ({item.tokenCost} Tokens)</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: INSTANT SPIN WHEEL */}
            {luckySubTab === 'WHEEL' && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px 18px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  maxWidth: 580,
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#FEF3C7',
                    color: '#B45309',
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  <Flame size={15} color="#D97706" />
                  <span>มินิเกมลุ้นโชคทันใจ</span>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  วงล้อเสี่ยงโชคไทยช่วยไทย
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 22 }}>
                  ใช้เพียง <strong>15 Tokens</strong> ต่อการหมุน 1 ครั้ง ลุ้นรับโบนัสคืนสูงสุด 50 Tokens หรือคูปองฟรี!
                </p>

                {/* The Wheel Container - Sized with min(260px, 72vw) for zero mobile overflow */}
                <div className="spin-wheel-outer">
                  <div className="spin-pointer" />
                  <div
                    className="spin-wheel"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      background:
                        'conic-gradient(#D97706 0deg 60deg, #2563EB 60deg 120deg, #DC2626 120deg 180deg, #059669 180deg 240deg, #7C3AED 240deg 300deg, #F59E0B 300deg 360deg)',
                    }}
                  >
                    {/* Wheel Center Button */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        border: '3px solid #F59E0B',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 12,
                        color: '#92400E',
                        zIndex: 10,
                      }}
                    >
                      <Sparkles size={14} />
                      <span>หมุน</span>
                    </div>
                  </div>
                </div>

                {/* Spin Result Alert */}
                {spinResult && (
                  <div
                    style={{
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: 18,
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#065F46', fontWeight: 700, fontSize: 15 }}>
                      <PartyPopper size={18} color="#10B981" />
                      <span>ยินดีด้วย! คุณได้รับ: {spinResult.label}</span>
                    </div>
                  </div>
                )}

                {/* Spin Action Button */}
                <button
                  type="button"
                  onClick={handleSpinWheel}
                  disabled={spinning || tokens < 15}
                  style={{
                    width: '100%',
                    minHeight: 52,
                    background: tokens >= 15 ? '#D97706' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 24px',
                    fontSize: 15.5,
                    fontWeight: 700,
                    cursor: tokens >= 15 && !spinning ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    touchAction: 'manipulation',
                  }}
                >
                  <RotateCw size={18} className={spinning ? 'animate-spin' : ''} />
                  <span>{spinning ? 'กำลังหมุนวงล้อ...' : 'หมุนวงล้อเสี่ยงโชค (15 Tokens)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            TAB 4: TOKEN TRANSACTION HISTORY (ประวัติแต้ม)
            ==================================================== */}
        {activeTab === 'HISTORY' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-xl)',
              padding: 20,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ประวัติการใช้และรับ Impact Tokens
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  รายการเคลื่อนไหวแต้มสะสมทั้งหมดในบัญชีของคุณ
                </p>
              </div>

              <button
                type="button"
                onClick={fetchTokenHistory}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '8px 14px',
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCw size={14} />
                <span>รีเฟรชประวัติ</span>
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                กำลังโหลดประวัติโทเค็น...
              </div>
            ) : tokenHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                ยังไม่มีประวัติการทำรายการโทเค็น
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tokenHistory.map((item) => {
                  const isPositive = item.amount > 0;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 'var(--radius-md)',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isPositive ? '#ECFDF5' : '#FEE2E2',
                            color: isPositive ? '#059669' : '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Coins size={17} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.description}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {new Date(item.createdAt).toLocaleString('th-TH')}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: isPositive ? '#059669' : '#DC2626',
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {isPositive ? `+${item.amount}` : item.amount} Tokens
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


      </main>

      {/* ====================================================
          MODAL 1: CONFIRM REDEEM (BOTTOM SHEET ON MOBILE)
          ==================================================== */}
      {selectedReward && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedReward(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                ยืนยันการแลกของรางวัล
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
              กรุณาตรวจสอบรายละเอียดก่อนทำการหักเหรียญแต้ม Impact Tokens
            </p>

            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                {selectedReward.imageUrl && (
                  <img
                    src={selectedReward.imageUrl}
                    alt={selectedReward.name}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      border: '1px solid #E2E8F0',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {selectedReward.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {selectedReward.description}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: 10, fontSize: 14 }}>
                <span>จำนวน Tokens ที่ใช้:</span>
                <strong style={{ color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>{selectedReward.tokenCost} Tokens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                <span>ยอด Tokens คงเหลือหลังแลก:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{tokens - selectedReward.tokenCost} Tokens</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                style={{
                  width: '100%',
                  minHeight: 50,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Gift size={18} />
                <span>{redeeming ? 'กำลังแลกรางวัล...' : 'ยืนยันการแลกรางวัล'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: REDEEM SUCCESS & DIGITAL VOUCHER
          ==================================================== */}
      {redeemSuccessData && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                }}
              >
                <PartyPopper size={28} />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
                แลกของรางวัลสำเร็จ!
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                บันทึกลง "ของที่ฉันแลกแล้ว" เรียบร้อยแล้ว สามารถเปิดดูได้ตลอดเวลา
              </p>
            </div>

            {/* Voucher Barcode Presentation */}
            <div className="digital-voucher-box">
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#EFF6FF',
                  color: '#1E40AF',
                }}
              >
                {redeemSuccessData.rewardType === 'PHYSICAL' ? 'บัตรยืนยันการจัดส่งสินค้า' : 'คูปองดิจิทัล (Digital Voucher)'}
              </span>

              <h4 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, marginBottom: 4 }}>
                {redeemSuccessData.rewardName}
              </h4>

              {/* Barcode Simulation */}
              <div className="barcode-sim">
                |||| || |||||| | |||||
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: '#1E40AF',
                  marginBottom: 10,
                }}
              >
                {redeemSuccessData.voucherCode}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(redeemSuccessData.voucherCode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: copiedCode ? '#ECFDF5' : '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 16px',
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 700,
                  color: copiedCode ? '#059669' : '#334155',
                  cursor: 'pointer',
                  marginBottom: 10,
                }}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedCode ? 'คัดลอกรหัสแล้ว!' : 'กดคัดลอกรหัส'}</span>
              </button>

              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {redeemSuccessData.instructions}
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setRedeemSuccessData(null);
                  setActiveTab('MY_ITEMS');
                }}
                style={{
                  width: '100%',
                  minHeight: 48,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--bank-royal)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ShoppingBag size={16} />
                <span>ไปที่ "ของที่ฉันแลกแล้ว"</span>
              </button>

              <button
                type="button"
                onClick={() => setRedeemSuccessData(null)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 3: VIEW EXISTING VOUCHER BARCODE
          ==================================================== */}
      {viewVoucherModal && (
        <div
          className="modal-backdrop"
          onClick={() => setViewVoucherModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                รหัสสำหรับแสดงหน้าร้าน
              </h3>
              <button
                type="button"
                onClick={() => setViewVoucherModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={20} />
              </button>
            </div>

            <div className="digital-voucher-box">
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {viewVoucherModal.rewardName}
              </h4>

              <div className="barcode-sim">
                |||| || |||||| | |||||
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: 2,
                  color: '#1E40AF',
                  marginBottom: 10,
                }}
              >
                {viewVoucherModal.voucherCode}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(viewVoucherModal.voucherCode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: copiedCode ? '#ECFDF5' : '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 16px',
                  minHeight: 44,
                  fontSize: 13,
                  fontWeight: 700,
                  color: copiedCode ? '#059669' : '#334155',
                  cursor: 'pointer',
                  marginBottom: 10,
                }}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedCode ? 'คัดลอกรหัสแล้ว!' : 'คัดลอกรหัส'}</span>
              </button>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {viewVoucherModal.instructions || 'แสดงรหัสนี้แก่พนักงานที่หน้าร้านเพื่อรับสิทธิพิเศษ'}
              </div>
            </div>

            {viewVoucherModal.status === 'USED' ? (
              <div
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                ✓ คูปองนี้ถูกใช้งานเรียบร้อยแล้ว {viewVoucherModal.usedAt && `(${new Date(viewVoucherModal.usedAt).toLocaleTimeString('th-TH')})`}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleUseVoucher(viewVoucherModal.voucherCode)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid #059669',
                  background: '#ECFDF5',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  marginBottom: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} />
                <span>จำลองการใช้งานคูปองนี้ที่หน้าร้าน</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewVoucherModal(null)}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--bank-royal)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
                marginTop: 14,
              }}
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 4: LUCKY DRAW SUCCESS (สลากชิงโชค)
          ==================================================== */}
      {drawSuccessData && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                }}
              >
                <Crown size={28} />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
                ลงชื่อชิงโชคสำเร็จ
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                ได้รับสิทธิ์ลุ้นรางวัลทั้งหมด {drawSuccessData.ticketsCount} สิทธิ์
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {drawSuccessData.tickets.map((t, idx) => (
                <div key={idx} className="ticket-container">
                  <div>
                    <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                      ตั๋วดิจิทัลใบที่ {idx + 1}
                    </div>
                    <div className="ticket-number">{t.ticketNumber}</div>
                  </div>
                  <Ticket size={22} color="#D97706" />
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              <strong>กำหนดการจับรางวัล:</strong> {drawSuccessData.drawDate}
              <br />
              ระบบจะแจ้งเตือนผลผ่านแอปและบันทึกไว้ใน "ของที่ฉันแลกแล้ว"
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawSuccessData(null);
                setActiveTab('MY_ITEMS');
              }}
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
              }}
            >
              ดูสลากใน "ของที่ฉันแลกแล้ว"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
